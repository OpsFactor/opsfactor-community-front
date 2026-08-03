import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityRoot = new URL('../', import.meta.url);
const enterpriseRoot = new URL('../../opsfactor-enterprise-front/', import.meta.url);

function readSource(root: URL, relativePath: string) {

  return readFileSync(new URL(relativePath, root), 'utf8');

}

test('Community owns shared JSON response handling while edition hosts retain only HTTP and error adapters', () => {

  const sharedService = readSource(communityRoot, 'packages/front-core/src/api/json-request.service.ts');
  const sharedError = readSource(communityRoot, 'packages/front-core/src/api/api-error.ts');
  const sharedCsrf = readSource(communityRoot, 'packages/front-core/src/api/csrf.ts');
  const communityAdapter = readSource(communityRoot, 'src/services/api/request.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/services/api/request.ts');
  const communityErrorAdapter = readSource(communityRoot, 'src/services/api/errors/api-error.ts');
  const enterpriseErrorAdapter = readSource(enterpriseRoot, 'src/services/api/errors/api-error.ts');
  const communityCsrfAdapter = readSource(communityRoot, 'src/services/api/csrf.ts');
  const enterpriseCsrfAdapter = readSource(enterpriseRoot, 'src/services/api/csrf.ts');

  assert.match(sharedService, /export function createJsonRequestService/);
  assert.match(sharedService, /readErrorResponseMessage/);
  assert.match(sharedService, /text\/html/);
  assert.match(sharedService, /response\.status === 204/);
  assert.doesNotMatch(sharedService, /@\/services|getCommunityAuthorizationHeader|getCsrfConfig/);
  assert.match(sharedError, /export class ApiError extends Error/);
  assert.match(sharedError, /super\(details\.message\)/);
  assert.match(sharedCsrf, /export function getCsrfConfig\(\): CsrfConfig \| null/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /createJsonRequestService.*@opsfactor\/front-core/);
    assert.match(adapter, /httpRequest,/);
    assert.match(adapter, /new ApiError\(details\)/);
    assert.doesNotMatch(adapter, /function readErrorResponseMessage/);
    assert.doesNotMatch(adapter, /response\.status === 204/);
  }

  for (const errorAdapter of [communityErrorAdapter, enterpriseErrorAdapter]) {
    assert.match(errorAdapter, /ApiError.*@opsfactor\/front-core/);
    assert.doesNotMatch(errorAdapter, /class ApiError/);
  }

  for (const csrfAdapter of [communityCsrfAdapter, enterpriseCsrfAdapter]) {
    assert.match(csrfAdapter, /getCsrfConfig.*@opsfactor\/front-core/);
    assert.doesNotMatch(csrfAdapter, /function getCsrfConfig/);
  }

});
