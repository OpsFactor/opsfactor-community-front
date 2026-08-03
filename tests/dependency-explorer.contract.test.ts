import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildDependencyExplorerEndpoint,
  DEPENDENCY_EXPLORER_ENDPOINTS,
  isValidMaximumTreeDepth,
} from '../src/modules/dependency-explorer/dependency-explorer.types.ts';

test('Community Dependency Explorer uses only the canonical selectors and one bounded dependency request', () => {
  assert.deepEqual(DEPENDENCY_EXPLORER_ENDPOINTS, {
    supplyNetworkVersions: '/api/secured/supplynetwork/version',
    internalLocations: '/api/secured/location/internal',
    materials: '/api/secured/material',
    dependencies: '/api/secured/supplynetwork/dependencies',
  });
  assert.equal(buildDependencyExplorerEndpoint({
    supplyNetworkId: 'network / 1',
    locationId: 'LOCATION',
    materialId: 'MATERIAL / 1',
    maximumTreeDepth: '5',
  }), '/api/secured/supplynetwork/dependencies?supplyNetworkId=network+%2F+1&locationId=LOCATION&materialId=MATERIAL+%2F+1&maximumTreeDepth=5');
});

test('Community Dependency Explorer requires one material-location root and a legacy-safe depth limit', () => {
  assert.equal(isValidMaximumTreeDepth('1'), true);
  assert.equal(isValidMaximumTreeDepth('15'), true);
  assert.equal(isValidMaximumTreeDepth('0'), false);
  assert.equal(isValidMaximumTreeDepth('16'), false);
  assert.equal(isValidMaximumTreeDepth('4.5'), false);
  assert.throws(() => buildDependencyExplorerEndpoint({
    supplyNetworkId: 'network', locationId: 'location', materialId: '', maximumTreeDepth: '5',
  }), /material/);
});

test('Community Dependency Explorer stays a single read-only snapshot with local disclosure only', () => {
  const service = readFileSync(new URL('../src/modules/dependency-explorer/dependency-explorer.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/dependency-explorer/DependencyExplorerPage.vue', import.meta.url), 'utf8');
  const node = readFileSync(new URL('../src/modules/dependency-explorer/SupplyDependencyTreeNode.vue', import.meta.url), 'utf8');

  assert.match(service, /httpClient\.request<MaterialLocationDependency\[\]>/);
  assert.doesNotMatch(service, /method: 'POST'|method: 'PUT'|method: 'DELETE'/);
  assert.match(page, /@click="loadDependencyTree"/);
  assert.match(page, /All three identifiers are required/);
  assert.match(node, /Selected maximum depth reached/);
  assert.match(node, /Parallel routings outside the focused output are omitted/);
  assert.doesNotMatch(page, /pagination|export|graph|prefetch/i);
});
