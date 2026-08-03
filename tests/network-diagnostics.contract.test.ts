import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCircularNetworkAlertsEndpoint,
  SUPPLY_NETWORK_VERSION_ENDPOINT,
} from '../src/modules/network-diagnostics/network-diagnostics.types.ts';

test('Community network diagnostics uses the canonical selector and circularity endpoints only', () => {
  assert.equal(SUPPLY_NETWORK_VERSION_ENDPOINT, '/api/secured/supplynetwork/version');
  assert.equal(
    buildCircularNetworkAlertsEndpoint('network / 1'),
    '/api/secured/alerts/circularnetwork/network%20%2F%201',
  );
  assert.throws(() => buildCircularNetworkAlertsEndpoint(' '), /Supply Network Version ID/);
});

test('Community network diagnostics remains an explicit raw read without unrelated alert slices', () => {
  const service = readFileSync(new URL('../src/modules/network-diagnostics/network-diagnostics.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/network-diagnostics/NetworkDiagnosticsPage.vue', import.meta.url), 'utf8');

  assert.match(service, /httpClient\.request<SupplyNetworkVersion\[]>\(SUPPLY_NETWORK_VERSION_ENDPOINT\)/);
  assert.match(service, /httpClient\.request<CircularNetworkAlert\[]>\(/);
  assert.doesNotMatch(service, /method: 'POST'|method: 'PUT'|method: 'DELETE'/);
  assert.match(page, /onMounted\(loadSupplyNetworkVersions\)/);
  assert.match(page, /@click="loadCircularNetworkDiagnostics"/);
  assert.match(page, /No circular dependency was found/i);
  assert.doesNotMatch(page, /uom|replenishment|optimizer|gis|map|cost/i);
});
