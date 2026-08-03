import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityRoot = new URL('../', import.meta.url);
const enterpriseRoot = new URL('../../opsfactor-enterprise-front/', import.meta.url);

function readCommunity(relativePath: string) {

  return readFileSync(new URL(relativePath, communityRoot), 'utf8');

}

function readEnterprise(relativePath: string) {

  return readFileSync(new URL(relativePath, enterpriseRoot), 'utf8');

}

test('Community owns the neutral SPA launcher while hosts inject only edition policy', () => {

  const sharedBootstrap = readCommunity('packages/front-core/src/runtime/frontend-bootstrap.ts');
  const communityMain = readCommunity('src/app/main.ts');
  const enterpriseMain = readEnterprise('src/app/main.ts');

  assert.match(sharedBootstrap, /export async function bootstrapFrontendApplication/);
  assert.match(sharedBootstrap, /const application = createApp\(dependencies\.rootComponent\)/);
  assert.match(sharedBootstrap, /await dependencies\.bootstrapRuntimeInfo\(\)/);
  assert.match(sharedBootstrap, /await dependencies\.ensurePerspectiveViewerRuntime\(\)/);
  assert.match(sharedBootstrap, /await dependencies\.bootstrapSession\(\)/);
  assert.match(sharedBootstrap, /loginRouteName/);

  for (const hostMain of [communityMain, enterpriseMain]) {
    assert.match(hostMain, /bootstrapFrontendApplication.*@opsfactor\/front-core/);
    assert.match(hostMain, /bootstrapTheme,/);
    assert.match(hostMain, /bootstrapRuntimeInfo: \(\) => bootstrapRuntimeInfo\(APPLICATION_EDITION\)/);
    assert.match(hostMain, /bootstrapSession,/);
    assert.match(hostMain, /getSession: useSessionStore,/);
    assert.doesNotMatch(hostMain, /const application = createApp\(/);
    assert.doesNotMatch(hostMain, /await router\.replace\(/);
  }

});
