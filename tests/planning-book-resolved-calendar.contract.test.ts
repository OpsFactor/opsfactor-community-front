import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlanningBookPeriodField } from '../packages/front-planning-book/src/planning-book.normalization.ts';

test('Planning Book resolves per-column boundaries without applying a uniform header bucket', () => {

  const periods = ['2023-01-15T23:59:59', '2023-02-05T23:59:59', '2023-04-30T23:59:59'];
  const dto = {
    viewName: 'Resolved periods', viewType: 'SNP', bucketSize: 'MISTO', uom: 'UNIT',
    keyFigures: ['Demand'], periodList: periods,
    columnDefs: periods.map((period, index) => ({
      field: period.slice(0, 10), name: period.slice(0, 10), dataColumn: true,
      periodIndex: index, bucketSize: ['Daily', 'Weekly', 'Monthly'][index],
      startDateTime: ['2023-01-15T00:00:00', '2023-02-01T00:00:00', '2023-04-01T00:00:00'][index],
      endDateTime: period,
    })),
    groups: [],
  };
  assert.equal(getPlanningBookPeriodField(dto, periods[0]), '2023-01-15');
  assert.equal(getPlanningBookPeriodField(dto, periods[1]), '2023-02-05');
  assert.equal(getPlanningBookPeriodField(dto, periods[2]), '2023-04-30');

});
