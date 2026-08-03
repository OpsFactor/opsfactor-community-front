import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { createFrontendSessionStore } from '../src/stores/session.store.ts';

test('Shared session lifecycle delegates authentication and appearance hooks to the host', async () => {
  const lifecycle: string[] = [];
  setActivePinia(createPinia());
  const useSessionStore = createFrontendSessionStore({
    fetchSessionBootstrap: async () => ({
      authenticated: true,
      user: { id: 'community-user', displayName: 'Community user', email: 'community@example.invalid' },
    }),
    logoutSession: async () => {
      lifecycle.push('logout-request');
    },
    afterAuthenticated: async () => {
      lifecycle.push('authenticated-hook');
    },
    afterLogout: () => {
      lifecycle.push('logout-hook');
    },
  });
  const sessionStore = useSessionStore();

  await sessionStore.bootstrap();
  assert.equal(sessionStore.isAuthenticated, true);
  assert.equal(sessionStore.isBootstrapping, false);
  assert.equal(sessionStore.user?.id, 'community-user');
  assert.deepEqual(lifecycle, ['authenticated-hook']);

  await sessionStore.logout();
  assert.equal(sessionStore.isAuthenticated, false);
  assert.equal(sessionStore.isBootstrapping, false);
  assert.equal(sessionStore.user, null);
  assert.deepEqual(lifecycle, ['authenticated-hook', 'logout-request', 'logout-hook']);
});

test('Shared session lifecycle does not invoke an authenticated hook for an anonymous host response', async () => {
  let authenticatedHookCalls = 0;
  setActivePinia(createPinia());
  const useSessionStore = createFrontendSessionStore({
    fetchSessionBootstrap: async () => ({ authenticated: false }),
    logoutSession: () => undefined,
    afterAuthenticated: () => {
      authenticatedHookCalls += 1;
    },
  });

  const sessionStore = useSessionStore();
  await sessionStore.bootstrap();

  assert.equal(sessionStore.isAuthenticated, false);
  assert.equal(sessionStore.user, null);
  assert.equal(sessionStore.isBootstrapping, false);
  assert.equal(authenticatedHookCalls, 0);
});
