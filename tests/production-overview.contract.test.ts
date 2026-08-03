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
  assert.match(page, /@click="loadResourceDetail\(row\)"/);
  assert.doesNotMatch(page, /Work Plan.*edit|update.*ResourceDetail/i);
});

test('Production Overview Community retains the legacy dashboard hierarchy while marking unavailable Enterprise slots', () => {
  const page = readFileSync(new URL('../src/modules/production-overview/ProductionOverviewPage.vue', import.meta.url), 'utf8');

  assert.match(page, /DashboardPageLayout/);
  assert.match(page, /Supply Plan Selection/);
  assert.match(page, /Production data unavailable/);
  assert.match(page, /Select plan and unit to open the dashboard/);
  assert.match(page, /Production volume \/ Occupation - Constrained/);
  assert.match(page, /Production volume \/ Occupation - Unconstrained/);
  assert.match(page, /No constrained resource rows/);
  assert.match(page, /No unconstrained resource rows/);
  assert.match(page, /Production resource detail unavailable/);
  assert.match(page, /No allocation details/);
  assert.match(page, /OfxPivotTable/);
  assert.match(page, /Occupation by Production Resource - Constrained/);
  assert.match(page, /Production sequencing/);
  assert.match(page, /Available in Enterprise/);
  assert.doesNotMatch(page, /volumesandcapacities|fetchProductionPlanOccupationSequence/);
});
