import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildProductionPlanningBookRichRows,
  filterProductionPlanningBookLocations,
  isValidPlannedQuantity,
} from '../src/modules/production-planning/production-planning-book.types.ts';

test('Production Planning Book permits only finite non-negative planned quantities', () => {
  assert.equal(isValidPlannedQuantity(0), true);
  assert.equal(isValidPlannedQuantity(24.5), true);
  assert.equal(isValidPlannedQuantity(-0.01), false);
  assert.equal(isValidPlannedQuantity(Number.NaN), false);
  assert.equal(isValidPlannedQuantity(Number.POSITIVE_INFINITY), false);
});

test('Production Planning Book keeps only explicitly enabled production locations', () => {
  assert.deepEqual(
    filterProductionPlanningBookLocations([
      { id: 'plant', description: 'Plant', showInProductionPlanningBook: true },
      { id: 'dc', description: 'Distribution', showInProductionPlanningBook: false },
      { id: 'unset', description: 'Unset', showInProductionPlanningBook: null },
    ]).map((location) => location.id),
    ['plant'],
  );
});

test('Production Planning Book adapts its own resource-capacity tree to the rich grid without widening the update', () => {
  const rows = buildProductionPlanningBookRichRows({
    supplyPlanId: 42,
    locationId: 'PLANT',
    periodEndDates: ['2026-08-31'],
    resources: [{
      productionResourceId: 'LINE', description: 'Line', capacityHoursByPeriod: [0],
      materials: [{ materialId: 'MAT', description: 'Material', unitOfMeasureId: 'EA', plannedQuantityByPeriod: [12] }],
    }],
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.rowType, 'resourceCapacity');
  assert.equal(rows[0]?.values['2026-08-31'], 0);
  assert.equal(rows[0]?.unitOfMeasure, 'Hours');
  assert.equal(rows[0]?.hierarchyExpandable, true);
  assert.equal(rows[1]?.rowType, 'materialProduction');
  assert.equal(rows[1]?.hierarchyParentRowKey, rows[0]?.rowKey);
  assert.equal(rows[1]?.values['2026-08-31'], 12);
});

test('Production Planning Book reuses only the neutral visual grid and preserves its typed endpoints', () => {
  const page = readFileSync(new URL('../src/modules/production-planning/ProductionPlanningBookCommunityPage.vue', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/modules/production-planning/production-planning-book.service.ts', import.meta.url), 'utf8');

  assert.match(page, /PlanningBookVirtualGrid/);
  assert.match(page, /buildProductionPlanningBookRichRows/);
  assert.match(page, /row\.rowType === 'materialProduction'/);
  assert.doesNotMatch(page, /referencePlan|xlsx|upload|change log|Gantt|scheduling/i);
  assert.match(service, /planning\/production\/planningbook\?/);
  assert.match(service, /planning\/production\/planningbook\/update/);
});
