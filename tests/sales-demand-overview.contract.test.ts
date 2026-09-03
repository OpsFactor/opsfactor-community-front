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
  assert.match(serviceSource, /demandPlanId: payload\.demandPlanId \? Number\(payload\.demandPlanId\) : null/);
  assert.match(serviceSource, /historicalSalesDocumentType: payload\.historicalSalesDocumentType/);
  assert.match(serviceSource, /unitOfMeasureId: payload\.unitOfMeasureId/);
  assert.match(serviceSource, /historicalPeriods: payload\.historicalPeriods/);
  assert.match(serviceSource, /materialIds: payload\.materialIds/);
  assert.match(serviceSource, /locationIds: payload\.locationIds/);
  assert.match(serviceSource, /valuesByMaterialCharacteristicId: payload\.valuesByMaterialCharacteristicId/);
  assert.match(serviceSource, /valuesByLocationCharacteristicId: payload\.valuesByLocationCharacteristicId/);
});

test('Community Sales/Demand Overview exposes public scope filters without requesting financial measures', () => {

  const requestFunctionSource = serviceSource.slice(serviceSource.indexOf('export async function fetchDemandPlanAndSalesHistory'));

  assert.match(pageSource, /type MetricId = 'quantity'/);
  assert.match(pageSource, /The June Community boundary admits only the Sell-out transactional family/);
  assert.match(pageSource, /label="Sales document type"/);
  assert.match(pageSource, /Only show historical sales/);
  assert.match(pageSource, /selectedHistoricalSalesType/);
  assert.match(pageSource, /label="Detail level"/);
  assert.match(pageSource, /MaterialLocationScopeFilters/);
  assert.match(pageSource, /loadCommunityMaterialLocationFilterCatalog/);
  assert.doesNotMatch(pageSource, /Not available in the current edition/);
  assert.match(pageSource, /locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /key: 'gross'/);
  assert.match(pageSource, /key: 'net'/);
  assert.match(pageSource, /requiredEdition: 'Pro \/ Enterprise'/);
  assert.match(pageSource, /value: '—'/);
  assert.doesNotMatch(pageSource, /value: 'Enterprise'/);
  assert.doesNotMatch(requestFunctionSource, /financial|cogs|margin|sellin|orders/i);
  assert.doesNotMatch(requestFunctionSource, /\/api\/secured\/bi\//);
});

test('Community Sales/Demand Overview reuses the canonical local-filter layout for characteristics and clearing', () => {

  assert.match(pageSource, /valuesByMaterialCharacteristicId/);
  assert.match(pageSource, /valuesByLocationCharacteristicId/);
  assert.match(pageSource, /<template #materials>/);
  assert.match(pageSource, /<template #locations>/);
  assert.match(pageSource, /<template #material-characteristics>/);
  assert.match(pageSource, /<template #location-characteristics>/);
  assert.match(pageSource, /OfxMaterialCharacteristicsFilter/);
  assert.match(pageSource, /OfxLocationCharacteristicsFilter/);
  assert.match(pageSource, /<OfxButton variant="ghost" size="compact" :disabled="!hasActiveLocalFilters" @click="clearLocalFilters">/);
  assert.match(pageSource, /Clear filters/);
  assert.doesNotMatch(pageSource, /Clear local filters/);
});
