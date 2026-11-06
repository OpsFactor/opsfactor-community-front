import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteValues, availableValues } from '../src/modules/production-overview/overview-availability.ts';

test('missing values omit totals and gaps while real zero remains valid', () => {

  const rows = [{ constrained: 0, unconstrained: 4 }, { constrained: 2, unconstrained: 3 }];
  assert.equal(hasCompleteValues(rows, 'constrained'), true);
  assert.deepEqual(availableValues(rows[0], 'Demand', 'constrained', 'unconstrained', true, true), [['Constrained', 'Demand', 0], ['Unconstrained', 'Demand', 4], ['Gap vs Unconstrained', 'Demand', 4]]);
  const missing = [{ constrained: null, unconstrained: 4 }, { constrained: 1, unconstrained: 3 }];
  assert.equal(hasCompleteValues(missing, 'constrained'), false);
  assert.deepEqual(availableValues(missing[0], 'Demand', 'constrained', 'unconstrained', false, true), [['Unconstrained', 'Demand', 4]]);
});
