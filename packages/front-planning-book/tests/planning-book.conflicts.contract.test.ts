import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPendingPlanningBookEdits, createDemandPlanningBookConflictFinder, proposeDemandPlanningBookEdit } from '../src/planning-book.conflicts.ts';
import { buildPlanningBookSelectedCellDto } from '../src/planning-book.edits.ts';
import { normalizePlanningBook } from '../src/planning-book.normalization.ts';
import type { PlanningBookDto, PlanningBookGroupDto } from '../src/planning-book.dto.ts';

const JAN = '2026-01-31';
const FEB = '2026-02-28';
const FAMILY = ['Direct Demand', 'Baseline', 'Demand Adjustment', 'Direct Demand / Working Day', 'Gross Sales', 'Net Sales', 'Workflow component'];
const KEY_FIGURES = [...FAMILY, 'Independent KPI'];

function group(channel: string, materialId?: string): PlanningBookGroupDto {
  return {
    locationDescriptionCols: { channel },
    materialDescriptionCols: materialId ? { materialId, materialDescription: `Product ${materialId}` } : undefined,
    keyFigures: KEY_FIGURES.map((keyFigure) => ({ keyFigure, editMode: 'cellEdit', values: { [JAN + 'T00:00:00']: 100, [FEB + 'T00:00:00']: 200 } })),
    subGroups: materialId ? undefined : [group(channel, 'A'), group(channel, 'B')],
  };
}

function book(): PlanningBookDto {
  return {
    viewName: 'Conflict test', viewType: 'Demand Planning Book', keyFigures: KEY_FIGURES,
    autoSubmitChanges: false,
    additionalParameters: { directDemandAdjustmentKeyFigures: FAMILY.join('|') },
    columnDefs: [
      { field: 'channel', name: 'Channel', dimension: 'location' },
      { field: 'materialId', name: 'Material', dimension: 'material' },
      { field: 'materialDescription', name: 'Description', dimension: 'material' },
      { field: JAN, name: 'Jan/2026', dataColumn: true },
      { field: FEB, name: 'Feb/2026', dataColumn: true },
    ],
    groups: [group('Retail'), group('Online')],
    periodList: [JAN + 'T00:00:00', FEB + 'T00:00:00'], bucketSize: 'MENSAL', uom: 'PC',
  };
}

function edit(dto: PlanningBookDto, keyFigure = 'Direct Demand', materialId: string | null = 'A', channel = 'Retail', field = JAN, newValue = 120, oldValue = 100) {
  const row = normalizePlanningBook(dto).rows.find((candidate) => candidate.keyFigure === keyFigure
    && candidate.materialId === (materialId ?? undefined) && candidate.channel === channel)!;
  assert.ok(row);
  return buildPlanningBookSelectedCellDto(dto, row, field, newValue, oldValue, { planId: 1, viewName: dto.viewName });
}

test('total and component conflict in either editing order; cancellation leaves the accepted batch intact', () => {
  const dto = book();
  for (const [first, second] of [['Direct Demand', 'Demand Adjustment'], ['Demand Adjustment', 'Direct Demand']]) {
    const accepted = [edit(dto, first)];
    const before = structuredClone(accepted);
    const proposal = proposeDemandPlanningBookEdit(dto, accepted, edit(dto, second));
    assert.deepEqual(proposal.conflicts, accepted);
    assert.deepEqual(accepted, before);
    assert.deepEqual(proposal.pendingEdits.map((cell) => cell.keyFigure), [second]);
  }
});

test('working-day, financial and custom workflow key figures compete with the same demand', () => {
  const dto = book();
  for (const keyFigure of FAMILY.slice(1)) {
    const proposal = proposeDemandPlanningBookEdit(dto, [edit(dto)], edit(dto, keyFigure));
    assert.equal(proposal.conflicts.length, 1, keyFigure);
  }
});

test('overlap includes aggregate/detail in both directions and same-key-figure hierarchy edits', () => {
  const dto = book();
  for (const keyFigure of ['Demand Adjustment', 'Direct Demand']) {
    const total = edit(dto, 'Direct Demand', null);
    const detail = edit(dto, keyFigure);
    assert.equal(proposeDemandPlanningBookEdit(dto, [total], detail).conflicts.length, 1);
    assert.equal(proposeDemandPlanningBookEdit(dto, [detail], total).conflicts.length, 1);
  }
});

test('replacement removes every overlapping edit but preserves other months, materials, channels and unrelated KPIs', () => {
  const dto = book();
  const details = [edit(dto, 'Demand Adjustment', 'A'), edit(dto, 'Demand Adjustment', 'B')];
  const unrelated = [edit(dto, 'Demand Adjustment', 'A', 'Retail', FEB), edit(dto, 'Demand Adjustment', 'A', 'Online'), edit(dto, 'Independent KPI')];
  const proposal = proposeDemandPlanningBookEdit(dto, [...details, ...unrelated], edit(dto, 'Direct Demand', null));
  assert.deepEqual(proposal.conflicts, details);
  assert.deepEqual(proposal.pendingEdits.slice(0, -1), unrelated);
  assert.equal(proposeDemandPlanningBookEdit(dto, [details[0]], details[1]).conflicts.length, 0);
});

test('reediting one cell retains its persisted old value and reverting removes the pending edit', () => {
  const dto = book();
  const accepted = [edit(dto)];
  const proposal = proposeDemandPlanningBookEdit(dto, accepted, edit(dto, 'Direct Demand', 'A', 'Retail', JAN, 140, 120));
  assert.equal(proposal.conflicts.length, 0);
  assert.equal(proposal.pendingEdits[0].oldValue, 100);
  assert.equal(proposal.pendingEdits[0].newValue, 140);
  const reverted = proposeDemandPlanningBookEdit(dto, proposal.pendingEdits, edit(dto, 'Direct Demand', 'A', 'Retail', JAN, 100, 140));
  assert.deepEqual(reverted.pendingEdits, []);
});

test('accepted replacement restores the removed cell and keeps only the new value highlighted', () => {
  const dto = book();
  const accepted = [edit(dto, 'Demand Adjustment')];
  const cancelledRows = normalizePlanningBook(dto).rows;
  applyPendingPlanningBookEdits(dto, cancelledRows, accepted);
  assert.equal(cancelledRows.find((row) => row.keyFigure === 'Demand Adjustment' && row.materialId === 'A' && row.channel === 'Retail')?.[JAN], 120);
  const proposal = proposeDemandPlanningBookEdit(dto, accepted, edit(dto));
  const replacedRows = normalizePlanningBook(dto).rows;
  applyPendingPlanningBookEdits(dto, replacedRows, proposal.pendingEdits);
  const previous = replacedRows.find((row) => row.keyFigure === 'Demand Adjustment' && row.materialId === 'A' && row.channel === 'Retail')!;
  const next = replacedRows.find((row) => row.keyFigure === 'Direct Demand' && row.materialId === 'A' && row.channel === 'Retail')!;
  assert.equal(previous[JAN], 100);
  assert.equal(previous.updatedCells, undefined);
  assert.equal(next[JAN], 120);
  assert.ok(next.updatedCells?.[JAN]);
});

test('period comparison recognizes the server timestamp and the grid field as the same month', () => {
  const dto = book();
  const pending = { ...edit(dto), period: JAN + 'T00:00:00' };
  assert.equal(proposeDemandPlanningBookEdit(dto, [pending], edit(dto, 'Demand Adjustment')).conflicts.length, 1);
});

test('opening an unchanged covered cell detects conflicts before typing; reopening the pending cell itself does not', () => {
  const dto = book();
  const accepted = [edit(dto, 'Demand Adjustment')];
  const findConflicts = createDemandPlanningBookConflictFinder(dto, accepted);
  const untouched = edit(dto, 'Direct Demand', 'A', 'Retail', JAN, 100, 100);
  assert.equal(findConflicts(untouched).length, 1);
  assert.equal(findConflicts(edit(dto, 'Direct Demand / Working Day', 'A', 'Retail', JAN, 100, 100)).length, 1);
  assert.deepEqual(findConflicts(accepted[0]), []);
  assert.equal(accepted[0].newValue, 120);
});
