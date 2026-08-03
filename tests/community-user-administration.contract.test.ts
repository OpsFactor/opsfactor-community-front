import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityUserAdministrationService } from '../src/modules/user-administration/user-administration.service.ts';
import {
  COMMUNITY_ADMIN_ROLE,
  buildCommunityUserDraft,
  buildCommunityUserSaveRequest,
} from '../src/modules/user-administration/user-administration.types.ts';

test('Community User Administration uses only the simple secured catalog, rolelist and one POST', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve('User data saved');
    },
  };
  const service = new CommunityUserAdministrationService(httpClient as never);

  await service.getUsers();
  await service.getRoleList();
  await service.saveUser({
    id: 'community-admin',
    firstName: 'Community',
    lastName: 'Administrator',
    email: 'administrator@example.invalid',
    active: false,
    password: null,
    userRoles: [COMMUNITY_ADMIN_ROLE],
  });

  assert.deepEqual(calls, [
    { path: '/api/secured/user', options: undefined },
    { path: '/api/secured/user/rolelist', options: undefined },
    {
      path: '/api/secured/user',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'community-admin',
          firstName: 'Community',
          lastName: 'Administrator',
          email: 'administrator@example.invalid',
          active: false,
          password: null,
          userRoles: [COMMUNITY_ADMIN_ROLE],
        }),
      },
    },
  ]);
});

test('Community User Administration requires a creation password and uses explicit null only to preserve an existing password', () => {
  assert.throws(
    () => buildCommunityUserSaveRequest({
      isNew: true,
      id: 'new-admin',
      firstName: '',
      lastName: '',
      email: '',
      active: true,
      newPassword: '   ',
    }),
    /non-blank password/i,
  );

  const existingDraft = buildCommunityUserDraft({
    id: 'community-admin',
    firstName: 'Community',
    lastName: 'Administrator',
    email: 'administrator@example.invalid',
    active: true,
    userRoles: [COMMUNITY_ADMIN_ROLE],
  });
  assert.deepEqual(buildCommunityUserSaveRequest(existingDraft), {
    id: 'community-admin',
    firstName: 'Community',
    lastName: 'Administrator',
    email: 'administrator@example.invalid',
    active: true,
    password: null,
    userRoles: [COMMUNITY_ADMIN_ROLE],
  });

  existingDraft.newPassword = 'replacement-password';
  assert.equal(buildCommunityUserSaveRequest(existingDraft).password, 'replacement-password');
});

test('Community User Administration keeps role fixed and excludes delete, bootstrap and private security flows', async () => {
  const serviceSource = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/user-administration/user-administration.service.ts', import.meta.url),
    'utf8',
  ));
  const pageSource = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/user-administration/CommunityUserAdministrationPage.vue', import.meta.url),
    'utf8',
  ));
  const navigationSource = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/app/navigation.config.ts', import.meta.url),
    'utf8',
  ));
  const sharedCatalog = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../../opsfactor-community-front/packages/front-shell/src/legacy-navigation.ts', import.meta.url),
    'utf8',
  ));

  for (const forbiddenFragment of [
    '/delete',
    '/unlock',
    '/createdefaultuser',
    '/generatetoken',
    'method: \'DELETE\'',
  ]) {
    assert.equal(serviceSource.includes(forbiddenFragment), false, `User transport must not use ${forbiddenFragment}`);
  }
  assert.match(pageSource, /ROLE_ADMIN/);
  assert.match(pageSource, /Set Active to Inactive instead of deleting a user/i);
  assert.match(pageSource, /password: null/i);
  assert.match(pageSource, /no delete, bootstrap, SSO, tenant, lockout, password reset, token, or granular role management/i);
  assert.match(navigationSource, /'admin-users': \(\) => import\('\@\/modules\/user-administration\/CommunityUserAdministrationPage\.vue'\)/);
  assert.match(sharedCatalog, /key: 'admin-users',[\s\S]*?path: '\/admin\/users'/);
});
