import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    .replaceAll('\r\n', '\n')
    .trimEnd();

}

test('Community exposes Supply Network Explorer through the canonical navigation route', () => {

  const navigation = read('../src/app/navigation.config.ts');
  const editionPolicy = read('../packages/front-shell/src/edition-navigation-policy.ts');
  const router = read('../src/router/index.ts');

  assert.match(navigation, /'supply-network-explorer': \(\) => import\('\@\/modules\/supply-network\/pages\/SupplyNetworkExplorerPage\.vue'\)/);
  assert.doesNotMatch(editionPolicy, /'supply-network-explorer'/);
  assert.match(router, /path: '\/supply-planning\/dependency-explorer'[\s\S]*redirect: '\/supply-network\/explorer'/);

});

test('Community preserves the Planning Front explorer port instead of the former rewritten tree', () => {

  const communityPage = read('../src/modules/supply-network/pages/SupplyNetworkExplorerPage.vue');
  const enterprisePage = read('../../opsfactor-enterprise-front/src/modules/supply-network/pages/SupplyNetworkExplorerPage.vue');
  const communityService = read('../src/modules/supply-network/services/low-level-code.service.ts');
  const referenceService = read('../../../VsCodeProjects/planning-front/src/modules/supply-network/services/low-level-code.service.ts');
  const communityGraph = read('../src/components/ofx/planning/OfxSupplyDependencyGraph.vue');
  const referenceGraph = read('../../../VsCodeProjects/planning-front/src/components/ofx/planning/OfxSupplyDependencyGraph.vue');
  const communityNode = read('../src/components/ofx/planning/OfxSupplyDependencyNode.vue');
  const referenceNode = read('../../../VsCodeProjects/planning-front/src/components/ofx/planning/OfxSupplyDependencyNode.vue');

  assert.equal(communityPage, enterprisePage);
  assert.equal(communityService, referenceService);
  assert.equal(communityGraph, referenceGraph);
  assert.equal(communityNode, referenceNode);
  assert.match(communityPage, /OfxSupplyDependencyGraph/);
  assert.match(communityPage, /title="Supply Network Explorer"/);
  assert.match(communityPage, /title="Dependency network"/);
  assert.doesNotMatch(communityPage, /Load dependency tree|Root selection/);

  assert.equal(existsSync(new URL('../src/modules/dependency-explorer/DependencyExplorerPage.vue', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/modules/dependency-explorer/SupplyDependencyTreeNode.vue', import.meta.url)), false);

});

test('Supply Network Explorer keeps the canonical bounded read-only endpoints', () => {

  const service = read('../src/modules/supply-network/services/low-level-code.service.ts');

  assert.match(service, /'\/api\/secured\/supplynetwork\/version'/);
  assert.match(service, /'\/api\/secured\/location'/);
  assert.match(service, /'\/api\/secured\/product'/);
  assert.match(service, /'\/api\/secured\/supplynetwork\/dependencies'/);
  assert.match(service, /maximumTreeDepth: filters\.maximumTreeDepth/);
  assert.doesNotMatch(service, /method:\s*'POST'|method:\s*'PUT'|method:\s*'DELETE'/);

});
