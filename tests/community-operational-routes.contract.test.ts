import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Community router exposes narrow deployment and inventory-policy routes without opening Enterprise workspaces', () => {

  const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8');

  assert.match(routerSource, /path: '\/supply-planning\/deployment'/);
  assert.match(routerSource, /DeploymentOperationalPage\.vue/);
  assert.match(routerSource, /path: '\/supply-planning\/inventory-policies'/);
  assert.match(routerSource, /InventoryPoliciesInspectorPage\.vue/);
  assert.doesNotMatch(routerSource, /@\/modules\/distribution\/pages\/DeploymentPage\.vue/);
  assert.doesNotMatch(routerSource, /@\/modules\/visibility/);

});

test('Community router exposes the documented narrow operational routes outside the Enterprise rail taxonomy', () => {
  const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8');

  for (const path of [
    '/demand-planning/cluster-scope', '/demand-planning/demand-analysis', '/demand-planning/historical-sellout',
    '/configuration/location-cluster-planning-parameters', '/configuration/location-cluster-criteria',
    '/configuration/location-master-data', '/configuration/material-master-data', '/configuration/material-statuses',
    '/configuration/operational-planning-parameters', '/configuration/uom-conversion-detail',
    '/planning/production-master-data', '/planning/uom-conversion-gaps', '/supply-planning/dependency-explorer',
    '/supply-planning/low-level-code', '/supply-planning/material-flows', '/supply-planning/network-diagnostics',
    '/supply-planning/production-overview', '/supply-planning/transportation-lanes',
  ]) {
    assert.match(routerSource, new RegExp(`path: '${path}'`));
  }
  assert.match(routerSource, /const COMMUNITY_DOCUMENTED_ROUTE_RECORDS/);
  assert.match(routerSource, /path: '\/demand-planning\/demand-analysis',[\s\S]*?redirect: '\/demand-planning\/cluster-level-configuration'/);
  assert.doesNotMatch(routerSource, /@\/modules\/demand-analysis\/DemandAnalysisPage\.vue/);
});
