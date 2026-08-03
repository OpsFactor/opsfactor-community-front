import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildMaterialFlowsEndpoint } from '../src/modules/material-flows/material-flows.types.ts';

test('Material Flows uses only the canonical Community matrix endpoint', () => {
  assert.equal(
    buildMaterialFlowsEndpoint(42),
    '/api/secured/bi/planning/supply/materialflows/42',
  );
  assert.throws(() => buildMaterialFlowsEndpoint(0), /positive Supply Plan ID/);
});

test('Material Flows reads a selected Supply Plan and never builds a browser-side aggregation', () => {
  const service = readFileSync(new URL('../src/modules/material-flows/material-flows.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/material-flows/MaterialFlowsPage.vue', import.meta.url), 'utf8');

  assert.match(service, /SUPPLY_PLAN_ENDPOINTS\.list/);
  assert.match(service, /httpClient\.request<MaterialFlows>\(buildMaterialFlowsEndpoint\(supplyPlanId\)\)/);
  assert.doesNotMatch(service, /method: 'POST'|method: 'PUT'|method: 'DELETE'/);
  assert.match(page, /legacy matrix can contain flows in different units of measure/i);
  assert.match(page, /no totals,\s*conversions, material filters, or additional aggregation/i);
  assert.doesNotMatch(page, /reduce\(|\.sum\(|totalQuantity|targetUnitOfMeasure/i);
});
