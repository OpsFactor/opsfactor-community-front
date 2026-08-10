import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildInventoryOverviewRequest, type InventoryOverviewSelection } from '../src/modules/inventory-overview/inventory-overview.types.ts';

for (const postHorizonPolicy of ['LIMIT_TO_PLANNING_HORIZON', 'AVERAGE_ALL_PERIODS'] as const) {
  test(`Inventory Overview preserves the five-field physical contract for ${postHorizonPolicy}`, () => {
    const request = buildInventoryOverviewRequest({
      supplyPlanId: 42,
      unitOfMeasureId: 'EA',
      materialIds: ['M-1'],
      locationIds: ['L-1'],
      postHorizonPolicy,
    } satisfies InventoryOverviewSelection);

    assert.deepEqual(Object.keys(request).sort(), ['locationIds', 'materialIds', 'postHorizonPolicy', 'supplyPlanId', 'unitOfMeasureId']);
    assert.equal(request.postHorizonPolicy, postHorizonPolicy);
    assert.equal('primaryAxis' in request, false);
    assert.equal('financialAxis' in request, false);
  });
}

test('Inventory Overview retains the legacy dashboard comparison while gating unavailable Enterprise analysis', async () => {
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
  assert.match(pageSource, /Open detailed snapshot/);
  assert.match(pageSource, /Value at cost/);
  assert.match(pageSource, /OfxEditionAvailabilityMark/);
  assert.match(pageSource, /Detailed inventory exploration/);
  assert.match(pageSource, /Location characteristics/);
  assert.match(pageSource, /Material characteristics/);
  assert.match(pageSource, /Show in table/);
  assert.match(pageSource, /Detailed local pivot and alternate metrics are not available in the current edition/);
  assert.doesNotMatch(pageSource, /enterprise-badge">Enterprise/);
  assert.match(pageSource, /<EChartAdapter :option="constrainedChartOption"/);
  assert.doesNotMatch(pageSource, /financialAxis/);
});
