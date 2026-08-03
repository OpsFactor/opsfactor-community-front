import assert from 'node:assert/strict';
import test from 'node:test';
import { displayPlanningBookGridCellValue } from '../src/planning-book.presentation.ts';

test('grid presentation preserves zero while rendering absent cell values explicitly', () => {

  assert.equal(displayPlanningBookGridCellValue(0), '0');
  assert.equal(displayPlanningBookGridCellValue('Working Plan'), 'Working Plan');
  assert.equal(displayPlanningBookGridCellValue(null), '—');
  assert.equal(displayPlanningBookGridCellValue(undefined), '—');
  assert.equal(displayPlanningBookGridCellValue(''), '—');
});
