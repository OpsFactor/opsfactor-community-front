import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPivotSeriesRows } from '../packages/front-perspective/src/pivot-series-aggregation.ts';

test('Pivot series aggregation calculates custom temporal values after consolidating each group', () => {
  const rows = buildPivotSeriesRows(
    [
      { location: 'L1', demand: [10, 20], supply: [7, 25] },
      { location: 'L1', demand: [5, 10], supply: [8, 9] },
    ],
    ['location', 'metric'],
    {
      columnField: 'period',
      columnValues: ['Jan 27', 'Feb 27'],
      series: [
        { id: 'demand', label: 'Demand', kind: 'base', sourceField: 'demand' },
        { id: 'supply', label: 'Supply', kind: 'base', sourceField: 'supply' },
        {
          id: 'gap',
          label: 'Gap',
          kind: 'custom',
          dependsOn: ['supply', 'demand'],
          calculate: ({ series }) => series.supply.map((value, index) => value - series.demand[index]),
        },
      ],
    },
  );

  assert.deepEqual(rows, [
    { location: 'L1', metric: 'Demand', period: 'Jan 27', value: 15 },
    { location: 'L1', metric: 'Demand', period: 'Feb 27', value: 30 },
    { location: 'L1', metric: 'Supply', period: 'Jan 27', value: 15 },
    { location: 'L1', metric: 'Supply', period: 'Feb 27', value: 34 },
    { location: 'L1', metric: 'Gap', period: 'Jan 27', value: 0 },
    { location: 'L1', metric: 'Gap', period: 'Feb 27', value: 4 },
  ]);
});
