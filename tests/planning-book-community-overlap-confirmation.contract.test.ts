import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { computed, defineComponent, ref } from 'vue';

/** Runs the actual page handlers with transport and shared conflict decisions injected. */
function createPage() {
  const source = readFileSync(new URL('../src/modules/demand-planning/DemandPlanningBookCommunityPage.vue', import.meta.url), 'utf8');
  const script = compileScript(parse(source).descriptor, { id: 'community-overlap-contract' }).content;
  const javascript = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const submitted: any[][] = [];
  let conflicts: any[] = [];
  let proposal: any = null;
  const calls: any[][] = [];
  const key = (cell: any) => `${cell.keyFigure}:${cell.period}:${cell.materialDescriptionCols.materialId}`;
  const dependencies: Record<string, any> = {
    vue: { computed, ref, defineComponent, onMounted() {} },
    '@opsfactor/front-planning-book': {
      buildPlanningBookSelectedCellKey: key,
      createDemandPlanningBookConflictFinder: (book: any, edits: any[]) => (edit: any) => {
        calls.push([book, edits, edit]);
        return conflicts;
      },
      proposeDemandPlanningBookEdit: () => proposal,
    },
    './planning-book.utils': { resolvePlanningBookPeriod: () => '2026-10-31T23:59:59' },
    './planning-book.service': {
      async savePlanningBookCells(cells: any[]) { submitted.push(cells); return book; },
    },
  };
  const exports: any = {};
  new Function('require', 'exports', javascript)((id: string) => dependencies[id] ?? {}, exports);
  const page = exports.default.setup({}, { expose() {} });
  const book = {
    viewName: 'Community view', viewType: 'Demand Planning Book', autoSubmitChanges: false,
    keyFigures: ['Direct Demand', 'Demand Adjustment'], bucketSize: 'MENSAL', uom: 'EA',
    periodList: ['2026-10-31T23:59:59'], groups: [],
    columnDefs: [
      { field: 'locationId', dimension: 'location' },
      { field: 'materialId', dimension: 'material' },
      { field: '2026-10-31', dataColumn: true },
    ],
  };
  page.planningBook.value = book;
  page.selectedPlanId.value = '1';
  page.openedPlanningBookSelection.value = { planId: '1', viewName: book.viewName };
  const total = {
    planId: '1', viewName: book.viewName, viewType: book.viewType,
    locationId: 'SITE', locationDescriptionCols: { locationId: 'SITE' },
    materialDescriptionCols: { materialId: 'SKU' }, keyFigure: 'Direct Demand',
    period: '2026-10-31T23:59:59', uom: 'EA', oldValue: 100, newValue: 110,
  };
  const otherPeriod = { ...total, period: '2026-11-30T23:59:59' };
  page.replacePendingCells([total, otherPeriod]);
  return {
    page, total, otherPeriod, submitted, calls,
    conflictWithTotal() { conflicts = [total]; },
    setProposal(value: any) { proposal = value; },
    row: { rowKey: 'detail', locationId: 'SITE', materialId: 'SKU', keyFigure: 'Demand Adjustment', '2026-10-31': 0 },
  };
}

test('Community asks before editing, preserves cancel, blocks submit, and removes only accepted conflicts before resuming', async () => {
  const fixture = createPage();
  const { page, total, otherPeriod, row } = fixture;
  fixture.conflictWithTotal();
  let resumed = 0;
  const attempt = { row, field: '2026-10-31', async resumeEditing() {
    resumed += 1;
    assert.equal(page.conflictingEditProposal.value, null);
    assert.deepEqual(page.pendingEditList.value, [otherPeriod]);
  } };

  page.handleGridEditAttempt(attempt);
  assert.equal(resumed, 0);
  assert.match(page.conflictDescription.value, /Direct Demand/);
  assert.deepEqual(page.pendingEditList.value, [total, otherPeriod]);
  assert.equal(fixture.calls[0][2].locationId, 'SITE');
  await page.savePendingChanges();
  assert.equal(fixture.submitted.length, 0);

  // The cancel button clears only the proposal, leaving all original draft values intact.
  page.conflictingEditProposal.value = null;
  assert.deepEqual(page.pendingEditList.value, [total, otherPeriod]);
  page.handleGridEditAttempt(attempt);
  await page.confirmConflictingEdit();
  assert.equal(resumed, 1);
  await page.savePendingChanges();
  assert.equal(fixture.submitted.length, 1);
  assert.equal(fixture.submitted[0][0].period, otherPeriod.period);
  assert.equal('locationId' in fixture.submitted[0][0], false);
  assert.equal('referencePlanId' in fixture.submitted[0][0], false);
});

test('Community commit-time conflict keeps the accepted batch until confirmation and blocks edits during save', async () => {
  const fixture = createPage();
  const { page, total, otherPeriod, row } = fixture;
  const replacement = { ...total, keyFigure: 'Demand Adjustment', oldValue: 0, newValue: 8 };
  fixture.setProposal({ conflicts: [total], pendingEdits: [otherPeriod, replacement] });

  page.queueCellUpdate({ row, field: '2026-10-31', oldValue: 0, newValue: 8 });
  assert.deepEqual(page.pendingEditList.value, [total, otherPeriod]);
  await page.confirmConflictingEdit();
  assert.deepEqual(page.pendingEditList.value, [otherPeriod, replacement]);
  page.isSaving.value = true;
  page.queueCellUpdate({ row, field: '2026-10-31', oldValue: 8, newValue: 9 });
  assert.equal(page.conflictingEditProposal.value, null);
  assert.deepEqual(page.pendingEditList.value, [otherPeriod, replacement]);
});

test('Community submits the opened plan even if selectors changed during loading', async () => {
  const fixture = createPage();
  const { page, row } = fixture;
  page.selectedPlanId.value = '2';
  page.selectedViewName.value = 'Another view';
  const edit = page.buildCellUpdate({ row, field: '2026-10-31', oldValue: 0, newValue: 5 });
  assert.equal(edit.planId, '1');
  assert.equal(edit.viewName, 'Community view');
  fixture.setProposal({ conflicts: [], pendingEdits: [edit] });
  page.queueCellUpdate({ row, field: '2026-10-31', oldValue: 0, newValue: 5 });
  await page.savePendingChanges();
  assert.equal(fixture.submitted[0][0].planId, '1');
  assert.equal(fixture.submitted[0][0].viewName, 'Community view');
});
