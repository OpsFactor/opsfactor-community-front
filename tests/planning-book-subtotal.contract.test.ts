import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlanningBookDto, PlanningBookGroupDto } from '../src/features/planning-book/planning-book.types.ts';
import {
  aggregatePlanningBookSubtotalField,
  normalizePlanningBook,
  selectPlanningBookSubtotalContributors,
} from '../src/features/planning-book/planning-book.utils.ts';

const PERIOD = '2026-01-31T00:00:00';

function planningBook(groups: PlanningBookGroupDto[], aggregationModelByKeyFigure: Record<string, string> = {}) {
  return {
    viewName: 'Test view',
    viewType: 'Demand Planning Book',
    keyFigures: ['Direct Demand', 'Net Sales'],
    aggregationModelByKeyFigure,
    columnDefs: [{ field: PERIOD.slice(0, 10), name: 'Jan/2026', dataColumn: true }],
    groups,
    periodList: [PERIOD],
    bucketSize: 'MENSAL',
    uom: 'PC',
  } satisfies PlanningBookDto;
}

function group(id: string, directDemand: number, netSales: number): PlanningBookGroupDto {
  return {
    locationDescriptionCols: { client: id },
    keyFigures: [
      { keyFigure: 'Direct Demand', values: { [PERIOD]: directDemand } },
      { keyFigure: 'Net Sales', values: { [PERIOD]: netSales } },
    ],
  };
}

test('subtotal resolves a selected secondary key figure in collapsed branches', () => {
  const dto = planningBook([
    group('Client A', 10, 100),
    group('Client B', 20, 200),
  ]);
  const normalized = normalizePlanningBook(dto);
  const collapsedPrimaryRows = normalized.rows.filter((row) => row.isPrimaryKeyFigureRow);

  const contributors = selectPlanningBookSubtotalContributors(
    normalized.rows,
    collapsedPrimaryRows,
    'Net Sales',
    true,
  );
  const subtotal = aggregatePlanningBookSubtotalField(
    dto,
    'Net Sales',
    contributors,
    PERIOD.slice(0, 10),
  );

  assert.equal(contributors.length, 2);
  assert.equal(subtotal.value, 300);
});

test('subtotal replaces an expanded parent by its lowest visible branches', () => {
  const dto = planningBook([{
    locationDescriptionCols: { portfolio: 'Portfolio A' },
    keyFigures: [
      { keyFigure: 'Direct Demand', values: { [PERIOD]: 30 } },
      { keyFigure: 'Net Sales', values: { [PERIOD]: 300 } },
    ],
    subGroups: [
      group('Client A', 10, 100),
      group('Client B', 20, 200),
    ],
  }]);
  const normalized = normalizePlanningBook(dto);
  const displayedRows = normalized.rows.filter((row) => (
    row.level === 0 || (row.level === 1 && row.isPrimaryKeyFigureRow)
  ));

  const contributors = selectPlanningBookSubtotalContributors(
    normalized.rows,
    displayedRows,
    'Net Sales',
    true,
  );
  const subtotal = aggregatePlanningBookSubtotalField(
    dto,
    'Net Sales',
    contributors,
    PERIOD.slice(0, 10),
  );

  assert.deepEqual(contributors.map((row) => row.level), [1, 1]);
  assert.equal(subtotal.value, 300);
});

test('ratio-of-sums keeps a zero-volume branch neutral when another branch is valid', () => {
  const dto = planningBook([
    {
      locationDescriptionCols: { client: 'Client A' },
      keyFigures: [
        { keyFigure: 'Direct Demand', values: { [PERIOD]: 10 } },
        {
          keyFigure: 'Net Sales',
          values: { [PERIOD]: 10 },
          aggregatedNumerator: { [PERIOD]: 100 },
          aggregatedDenominator: { [PERIOD]: 10 },
        },
      ],
    },
    {
      locationDescriptionCols: { client: 'Client B' },
      keyFigures: [
        { keyFigure: 'Direct Demand', values: { [PERIOD]: 0 } },
        {
          keyFigure: 'Net Sales',
          values: {},
          unavailableReasons: { [PERIOD]: 'No volume' },
          aggregatedNumerator: { [PERIOD]: 0 },
          aggregatedDenominator: { [PERIOD]: 0 },
        },
      ],
    },
  ], { 'Net Sales': 'RAZAO_ENTRE_SOMAS' });
  const normalized = normalizePlanningBook(dto);
  const contributors = selectPlanningBookSubtotalContributors(
    normalized.rows,
    normalized.rows.filter((row) => row.isPrimaryKeyFigureRow),
    'Net Sales',
    true,
  );

  const subtotal = aggregatePlanningBookSubtotalField(
    dto,
    'Net Sales',
    contributors,
    PERIOD.slice(0, 10),
  );

  assert.deepEqual(subtotal, { value: 10 });
});

test('ratio-of-sums returns unavailable when consolidated volume is zero', () => {
  const dto = planningBook([
    {
      locationDescriptionCols: { client: 'Client A' },
      keyFigures: [
        { keyFigure: 'Direct Demand', values: { [PERIOD]: 0 } },
        {
          keyFigure: 'Net Sales',
          values: {},
          unavailableReasons: { [PERIOD]: 'No volume' },
          aggregatedNumerator: { [PERIOD]: 0 },
          aggregatedDenominator: { [PERIOD]: 0 },
        },
      ],
    },
  ], { 'Net Sales': 'RAZAO_ENTRE_SOMAS' });
  const normalized = normalizePlanningBook(dto);
  const contributors = selectPlanningBookSubtotalContributors(
    normalized.rows,
    normalized.rows.filter((row) => row.isPrimaryKeyFigureRow),
    'Net Sales',
    true,
  );

  const subtotal = aggregatePlanningBookSubtotalField(
    dto,
    'Net Sales',
    contributors,
    PERIOD.slice(0, 10),
  );

  assert.equal(subtotal.value, null);
  assert.match(subtotal.unavailableReason ?? '', /denominator total is zero/);
});
