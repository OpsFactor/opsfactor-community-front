import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildProductionOverviewRequest,
  buildProductionOverviewResourceDetailRequest,
} from '../src/modules/production-overview/production-overview.types.ts';

test('Production Overview sends only the canonical physical selection', () => {
  const request = buildProductionOverviewRequest({
    supplyPlanId: 42,
    uomId: 'EA',
    locationIds: ['LOC-1', 'LOC-2'],
    materialIds: ['MAT-1'],
  });

  assert.deepEqual(request, {
    supplyPlanId: 42,
    uomId: 'EA',
    locationDTOs: [{ id: 'LOC-1' }, { id: 'LOC-2' }],
    valuesByMaterialCharacteristicId: { materialId: ['MAT-1'] },
  });
  assert.equal('workPlan' in request, false);
  assert.equal('characteristicPivot' in request, false);
});

test('Production Overview resource detail sends only the published material filter', () => {
  const request = buildProductionOverviewResourceDetailRequest(['MAT-1', 'MAT-2']);

  assert.deepEqual(request, {
    valuesByMaterialCharacteristicId: { materialId: ['MAT-1', 'MAT-2'] },
  });
  assert.equal('supplyPlanId' in request, false);
  assert.equal('uomId' in request, false);
  assert.equal('locationDTOs' in request, false);
});

test('Production Overview resource detail uses only the canonical on-demand POST endpoint', () => {
  const service = readFileSync(new URL('../src/modules/production-overview/production-overview.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/production-overview/ProductionOverviewPage.vue', import.meta.url), 'utf8');

  assert.match(service, /productionoverview\/\$\{supplyPlanId\}\/\$\{encodeURIComponent\(productionResourceId\)\}\/\$\{periodIndex\}\/details/);
  assert.match(service, /method: 'POST'/);
  assert.doesNotMatch(service, /volumesandcapacities|method: 'GET'/);
  assert.match(page, /@cell-click="loadResourceDetailFromCell"/);
  assert.doesNotMatch(page, /Work Plan.*edit|updateProductionOverviewResourceDetail/i);
});

test('Production Overview Community retains the canonical Planning Front dashboard hierarchy', () => {
  const page = readFileSync(new URL('../src/modules/production-overview/ProductionOverviewPage.vue', import.meta.url), 'utf8');

  assert.match(page, /DashboardPageLayout/);
  assert.match(page, /Supply Plan Selection/);
  assert.match(page, /Production data unavailable/);
  assert.match(page, /Select plan and unit to open the dashboard/);
  assert.match(page, /Stock, demand, inbound and production - Constrained/);
  assert.match(page, /Stock, demand, inbound and production - Unconstrained/);
  assert.match(page, /Production Capacity - Production Resources Selection/);
  assert.match(page, /label="Production resources"/);
  assert.match(page, /Production volume \/ Occupation - Constrained/);
  assert.match(page, /Production volume \/ Occupation - Unconstrained/);
  assert.match(page, /No constrained resource rows/);
  assert.match(page, /No unconstrained resource rows/);
  assert.match(page, /Production resource detail unavailable/);
  assert.match(page, /No allocation details/);
  assert.match(page, /resourceDetailSummaryCards/);
  assert.match(page, /Production line/);
  assert.match(page, /Available hours/);
  assert.match(page, /detail-summary-cards/);
  assert.match(page, /<OfxTableToolbar v-if="resourceDetailRows\.length"/);
  assert.doesNotMatch(page, /Read-only physical lines|class="secondary-button"/);
  assert.match(page, /OfxPivotTable/);
  assert.match(page, /:rows="\['planVersion', 'series'\]"/);
  assert.match(page, /:temporal-bucket-size="selectedSupplyPlanMeta\?\.bucketSize"/);
  assert.match(page, /period: row\.periodEnd/);
  assert.match(page, /Gap vs Unconstrained/);
  assert.match(page, /OfxDataTable/);
  assert.match(page, /OfxTableToolbar/);
  assert.match(page, /getCapacityUtilizationCellStyle/);
  assert.match(page, /Occupation by Production Resource - Constrained/);
  assert.doesNotMatch(page, /OfxEditionAvailabilityMark/);
  assert.doesNotMatch(page, /Dynamic characteristics|enterprise-slot|Not available in the current edition/);
  assert.doesNotMatch(page, /Available in Enterprise/);
  assert.doesNotMatch(page, /Refresh selectors|Production sequencing|<table/);
  assert.doesNotMatch(page, /volumesandcapacities|fetchProductionPlanOccupationSequence/);

  const sectionOrder = [
    'Stock, demand, inbound and production - Constrained',
    'Pivot Table',
    'Production Capacity - Production Resources Selection',
    'Production volume / Occupation - Constrained',
    'Occupation by Production Resource - Constrained',
  ].map((sectionTitle) => page.indexOf(sectionTitle));
  assert.deepEqual(sectionOrder, [...sectionOrder].sort((left, right) => left - right));
});

test('Production Overview follows the legacy optional-filter contract', () => {
  const page = readFileSync(new URL('../src/modules/production-overview/ProductionOverviewPage.vue', import.meta.url), 'utf8');

  // Planning Front and the legacy service both load the whole scope when these selections are empty.
  assert.match(page, /supplyPlanId\.value !== null\s*&& uomId\.value\.length > 0/);
  assert.match(page, /placeholder="All locations selected"/);
  assert.match(page, /placeholder="All materials selected"/);
  assert.match(page, /isIncludedInSelectedScope\(selectedLocationIds\.value, stockAndProduction\.locationId\)/);
  assert.match(page, /isIncludedInSelectedScope\(selectedMaterialIds\.value, stockAndProduction\.materialId\)/);
  assert.match(page, /Leave a filter empty to keep all values/);
  assert.doesNotMatch(page, /supplyPlanId\.value \?\?=|uomId\.value \|\|=/);
  assert.match(page, /Avg Constrained Met Demand/);
  assert.match(page, /Avg Constrained Production/);
  assert.match(page, /Avg Unconstrained Met Demand/);
  assert.match(page, /Avg Unconstrained Production/);
  assert.match(page, /summarizeBucket\(period, selectedSupplyPlanMeta\.value\?\.bucketSize\)/);
});

test('Production Overview keeps the resource-detail workspace stable while a new cell loads', () => {
  const page = readFileSync(new URL('../src/modules/production-overview/ProductionOverviewPage.vue', import.meta.url), 'utf8');

  assert.match(page, /const resourceDetailSelection = ref<ResourceDetailSelection \| null>\(null\)/);
  assert.match(page, /periodLabel: periodLabels\.value\[row\.periodIndex\][\s\S]*?summarizeBucket\(row\.periodEnd, selectedSupplyPlanMeta\.value\?\.bucketSize\)/);
  assert.match(page, /value: selection\.periodLabel/);
  assert.match(page, /<OfxSectionCard v-if="resourceDetailSelection" title="Production Resource Detail">/);
  assert.match(page, /const requestId = \+\+resourceDetailRequestId/);
  assert.doesNotMatch(page, /resourceDetail\.value = null;\s*\n\s*try \{/);
  assert.match(page, /Loading selected production resource detail/);
});

test('Shared select delays overflow help for a chosen value and keeps it out of card clipping', () => {
  const selectField = readFileSync(new URL('../packages/front-shell/src/OfxSelectField.vue', import.meta.url), 'utf8');

  assert.match(selectField, /overflowTooltipDelayMs: 550/);
  assert.match(selectField, /if \(!hasValue\.value\) return/);
  assert.match(selectField, /window\.setTimeout\([\s\S]*?props\.overflowTooltipDelayMs/);
  assert.match(selectField, /<Teleport to="body">[\s\S]*?ref="tooltipRef"/);
  assert.match(selectField, /syncSelectedLabelTooltipPosition/);
});
