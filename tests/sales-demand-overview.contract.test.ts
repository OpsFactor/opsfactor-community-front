import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../src/modules/demand-planning/pages/SalesDemandOverviewPage.vue', import.meta.url),
  'utf8',
);
const serviceSource = readFileSync(
  new URL('../src/modules/demand-planning/services/sales-demand-overview.service.ts', import.meta.url),
  'utf8',
);

test('Community Sales/Demand Overview preserves the legacy workspace while using only its canonical read contract', () => {

  assert.match(pageSource, /DashboardPageLayout/);
  assert.match(pageSource, /OfxPageHeader/);
  assert.match(pageSource, /OfxSectionCard/);
  assert.match(serviceSource, /\/api\/secured\/planning\/demand\/overview/);
  assert.match(serviceSource, /demandPlanId: Number\(payload\.demandPlanId\)/);
  assert.match(serviceSource, /unitOfMeasureId: payload\.unitOfMeasureId/);
  assert.match(serviceSource, /historicalPeriods: payload\.historicalPeriods/);
  assert.match(serviceSource, /materialIds: \[\]/);
  assert.match(serviceSource, /locationIds: \[\]/);
});

test('Community Sales/Demand Overview preserves Enterprise visual slots without requesting Enterprise measures', () => {

  const requestFunctionSource = serviceSource.slice(serviceSource.indexOf('export async function fetchDemandPlanAndSalesHistory'));

  assert.match(pageSource, /type MetricId = 'quantity'/);
  assert.match(pageSource, /The June Community boundary admits only the Sell-out transactional family/);
  assert.match(pageSource, /label="Historical sales type"/);
  assert.match(pageSource, /label="Detail level"/);
  assert.match(pageSource, /title="Characteristic Selectors"/);
  assert.match(pageSource, /locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /key: 'gross'/);
  assert.match(pageSource, /key: 'net'/);
  assert.match(pageSource, /requiredEdition: 'Pro \/ Enterprise'/);
  assert.match(pageSource, /value: '—'/);
  assert.doesNotMatch(pageSource, /value: 'Enterprise'/);
  assert.doesNotMatch(requestFunctionSource, /financial|cogs|margin|sellin|orders/i);
  assert.doesNotMatch(requestFunctionSource, /\/api\/secured\/bi\//);
});
