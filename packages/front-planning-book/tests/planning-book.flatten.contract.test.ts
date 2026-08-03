import assert from 'node:assert/strict';
import test from 'node:test';
import { flattenPlanningBookGroups } from '../src/planning-book.flatten.ts';

test('flattening preserves each key figure parent, full path and inherited descriptor maps', () => {

  const root = {
    locationDescriptionCols: { locationId: 'L1', locationName: 'North' },
    keyFigures: [{ keyFigure: 'Aggregate Stock', values: { '2026-01-01': 10 } }],
    subGroups: [{
      materialDescriptionCols: { materialId: 'M1', materialName: 'Widget' },
      keyFigures: [{ keyFigure: 'Stock', values: { '2026-01-01': 4 } }],
    }],
  };

  const rows = flattenPlanningBookGroups([root]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].parentGroup, undefined);
  assert.deepEqual(rows[0].groupPath, [root]);
  assert.deepEqual(rows[0].locationDescriptionCols, { locationId: 'L1', locationName: 'North' });
  assert.deepEqual(rows[0].materialDescriptionCols, {});
  assert.equal(rows[1].parentGroup, root);
  assert.deepEqual(rows[1].groupPath, [root, root.subGroups[0]]);
  assert.deepEqual(rows[1].locationDescriptionCols, { locationId: 'L1', locationName: 'North' });
  assert.deepEqual(rows[1].materialDescriptionCols, { materialId: 'M1', materialName: 'Widget' });
  assert.equal(rows[1].keyFigure.keyFigure, 'Stock');
});

test('child descriptor values override inherited values without mutating input maps', () => {

  const root = {
    locationDescriptionCols: { description: 'Original' },
    subGroups: [{
      locationDescriptionCols: { description: 'Override' },
      keyFigures: [{ keyFigure: 'Demand', values: {} }],
    }],
  };

  const [row] = flattenPlanningBookGroups([root]);

  assert.deepEqual(row.locationDescriptionCols, { description: 'Override' });
  assert.deepEqual(root.locationDescriptionCols, { description: 'Original' });
  assert.notEqual(row.locationDescriptionCols, root.locationDescriptionCols);
});
