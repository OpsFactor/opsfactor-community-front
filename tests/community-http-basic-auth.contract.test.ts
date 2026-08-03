import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

test('Community login uses in-memory HTTP Basic rather than the Enterprise form-login flow', () => {

  const loginSource = readSource('../src/modules/auth/pages/LoginPage.vue');
  const sessionSource = readSource('../src/services/auth/auth.service.ts');
  const authenticationSource = readSource('../src/services/community-authentication.service.ts');

  assert.match(loginSource, /import \{ loginWithPassword \} from '@\/services\/auth\/auth\.service';/);
  assert.doesNotMatch(loginSource, /fetchLoginFormState|csrfToken|ssoAction|_csrf/);
  assert.match(sessionSource, /authenticationService\.authenticate\(\{ username, password \}\)/);
  assert.match(authenticationSource, /\/api\/secured\/user\/rolelist/);
  assert.doesNotMatch(authenticationSource, /userconfigs|user-interface/i);
  assert.doesNotMatch(sessionSource, /\/login|JSESSIONID|csrf/i);

});

test('Community fetch facade supplies the active Basic authorization header to secured API requests', () => {

  const httpSource = readSource('../src/services/api/http.ts');
  const authenticationSource = readSource('../src/services/community-authentication.service.ts');

  assert.match(httpSource, /getCommunityAuthorizationHeader/);
  assert.match(httpSource, /headers\.set\('Authorization', authorizationHeader\)/);
  assert.match(authenticationSource, /getAuthorizationHeader\(\)/);

});
