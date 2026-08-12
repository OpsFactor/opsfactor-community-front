import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildInventoryOverviewRequest, type InventoryOverviewSelection } from '../src/modules/inventory-overview/inventory-overview.types.ts';

for (const postHorizonPolicy of ['LIMIT_TO_PLANNING_HORIZON', 'AVERAGE_ALL_PERIODS'] as const) {
  test(`Inventory Overview preserves the physical snapshot contract for ${postHorizonPolicy}`, () => {
    const request = buildInventoryOverviewRequest({
      supplyPlanId: 42,
      unitOfMeasureId: 'EA',
      materialIds: ['M-1'],
      locationIds: ['L-1'],
      valuesByMaterialCharacteristicId: { brand: ['White Paper'] },
      valuesByLocationCharacteristicId: { region: ['South'] },
      postHorizonPolicy,
    } satisfies InventoryOverviewSelection);

    assert.deepEqual(Object.keys(request).sort(), [
      'locationIds',
      'materialIds',
      'postHorizonPolicy',
      'supplyPlanId',
      'unitOfMeasureId',
      'valuesByLocationCharacteristicId',
      'valuesByMaterialCharacteristicId',
    ]);
    assert.equal(request.postHorizonPolicy, postHorizonPolicy);
    assert.equal('primaryAxis' in request, false);
    assert.equal('financialAxis' in request, false);
  });
}

test('Inventory Overview opens one detailed snapshot then confines refinement to local analysis filters', async () => {
  const pageSource = await readFile(
    new URL('../src/modules/inventory-overview/InventoryOverviewPage.vue', import.meta.url),
    'utf8',
  );

  assert.match(pageSource, /DashboardPageLayout/);
  assert.match(pageSource, /Inventory and days of supply - Constrained/);
  assert.match(pageSource, /Inventory and days of supply - Unconstrained/);
  assert.match(pageSource, /eyebrow="Visibility"/);
  assert.match(pageSource, /Inventory Overview unavailable/);
  assert.match(pageSource, /Select the initial scope to open the report/);
  assert.match(pageSource, /Open inventory overview/);
  assert.match(pageSource, /Loaded selection/);
  assert.match(pageSource, /OfxContextSummary/);
  assert.match(pageSource, /Change initial selection/);
  assert.match(pageSource, /Location characteristics/);
  assert.match(pageSource, /Material characteristics/);
  assert.match(pageSource, /materialLocationDetails/);
  assert.match(pageSource, /Detailed snapshot is unavailable/);
  assert.match(pageSource, /OfxPivotTable/);
  assert.match(pageSource, /temporal-bucket-size="monthly"/);
  assert.match(pageSource, /Refine only the material-location combinations already returned/);
  assert.doesNotMatch(pageSource, /required-edition="Pro \/ Enterprise"/);
  assert.match(pageSource, /<EChartAdapter :option="constrainedChartOption"/);
  assert.doesNotMatch(pageSource, /financialAxis/);
});
