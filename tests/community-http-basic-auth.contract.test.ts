import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

test('Community login preserves tab-scoped HTTP Basic without probing a nonexistent session endpoint', () => {

  const loginSource = readSource('../src/modules/auth/pages/LoginPage.vue');
  const sessionSource = readSource('../src/services/auth/auth.service.ts');
  const authenticationSource = readSource('../src/services/community-authentication.service.ts');
  const bootstrapSessionSource = readSource('../src/app/boot/bootstrap-session.ts');

  assert.match(loginSource, /loginWithPassword/);
  assert.match(loginSource, /beginOpsFactorLogin/);
  assert.match(loginSource, /Continue with OpsFactor/);
  assert.match(loginSource, /ApiRequestError/);
  assert.match(loginSource, /error\.status === 401/);
  assert.match(loginSource, /Invalid username or password\./);
  assert.doesNotMatch(loginSource, /fetchLoginFormState|csrfToken|ssoAction|_csrf/);
  assert.match(sessionSource, /authenticationService\.authenticate\(\{ username, password \}\)/);
  assert.match(sessionSource, /authenticationService\.getUsername\(\)/);
  assert.match(authenticationSource, /\/api\/secured\/user\/rolelist/);
  assert.doesNotMatch(authenticationSource, /userconfigs|user-interface/i);
  assert.doesNotMatch(sessionSource, /\/api\/open\/session/);
  assert.match(sessionSource, /\/oauth2\/authorization\/opsfactor/);
  assert.doesNotMatch(sessionSource, /JSESSIONID|csrf/i);
  assert.match(bootstrapSessionSource, /await restoreCommunityBasicSessionFromPeer\(\);[\s\S]*await sessionStore\.bootstrap\(\);/);

});

test('Community Basic credentials survive reloads for the browser-managed active-tab lifetime', () => {

  const authenticationSource = readSource('../src/services/community-authentication.service.ts');

  assert.match(authenticationSource, /window\.sessionStorage\.setItem/);
  assert.match(authenticationSource, /window\.sessionStorage\.getItem/);
  assert.match(authenticationSource, /window\.sessionStorage\.removeItem/);
  assert.doesNotMatch(authenticationSource, /expiresAt|SESSION_TIMEOUT|Date\.now\(\)/);

});

test('Community keeps the active Basic transport credential during a hot-module replacement', () => {

  const authenticationSource = readSource('../src/services/community-authentication.service.ts');

  assert.match(authenticationSource, /import\.meta\.hot\?\.data/);
  assert.match(authenticationSource, /import\.meta\.hot\?\.dispose/);
  assert.match(authenticationSource, /nextHotData\.activeCredentials/);

});

test('Community fetch facade supplies the active Basic authorization header to secured API requests', () => {

  const httpSource = readSource('../src/services/api/http.ts');
  const authenticationSource = readSource('../src/services/community-authentication.service.ts');

  assert.match(httpSource, /getCommunityAuthorizationHeader/);
  assert.match(httpSource, /headers\.set\('Authorization', authorizationHeader\)/);
  assert.match(authenticationSource, /getAuthorizationHeader\(\)/);

});
