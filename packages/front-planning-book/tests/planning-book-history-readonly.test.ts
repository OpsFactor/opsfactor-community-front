import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shared = existsSync(resolve(root, 'src/planning-book.edits.ts'));
const editPath = shared ? 'src/planning-book.edits.ts' : 'src/features/planning-book/planning-book.edits.ts';
const gridPath = shared ? 'src/components/LegacyPlanningBookGrid.vue' : 'src/components/ofx/planning/OfxPlanningBookGrid.vue';

// Transpile the actual sources so extensionless and .js TypeScript imports work
// under Node 22 without altering the application modules or starting a browser.
function loadSource(path) {
  const filename = resolve(root, path);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', output)(module, module.exports, (specifier) => {
    const target = resolve(dirname(filename), specifier.replace(/\.js$/, '.ts'));
    return loadSource(existsSync(target) ? target : `${target}.ts`);
  });
  return module.exports;
}

const { buildPlanningBookSelectedCellDto, isPlanningBookReadOnlyColumn } = loadSource(editPath);
const conflicts = loadSource(shared ? 'src/planning-book.conflicts.ts' : 'src/features/planning-book/planning-book.conflicts.ts');
const average = 'Average Historical Sales';
const history = '2025-12-31';
const forecast = '2026-01-31';
const book = {
  viewName: 'History regression', viewType: 'Demand Planning Book', bucketSize: 'MENSAL', uom: 'PC',
  columnDefs: [
    { field: average, name: average, dataColumn: true, enableCellEdit: true },
    { field: history, name: 'History', dataColumn: true, cellClass: 'pastPeriods' },
    { field: forecast, name: 'Forecast', dataColumn: true, enableCellEdit: true },
  ],
  periodList: [average, `${history}T23:59:59`, `${forecast}T23:59:59`],
  keyFigures: ['Direct Demand'], groups: [],
};
const selection = { planId: 1, viewName: book.viewName };
const row = { rowKey: 'material-demand', keyFigure: 'Direct Demand', editMode: 'cellEdit', [forecast]: 10 };

test('historical sales and their average are read-only even with a writable demand row', () => {
  for (const column of book.columnDefs.slice(0, 2)) {
    assert.equal(isPlanningBookReadOnlyColumn(column), true);
    assert.throws(() => buildPlanningBookSelectedCellDto(book, row, column.field, 11, 10, selection), /read-only/);
  }
  assert.equal(isPlanningBookReadOnlyColumn({ ...book.columnDefs[1], cellClass: 'pastPeriods other-style', enableCellEdit: true }), true);
});

test('forecast periods remain editable independently of the current date', () => {
  assert.equal(isPlanningBookReadOnlyColumn(book.columnDefs[2]), false);
  const edit = buildPlanningBookSelectedCellDto(book, row, forecast, 11, 10, selection);
  assert.equal(edit.period, forecast);
  assert.equal(edit.newValue, 11);
});

test('unknown, descriptor, explicitly disabled and non-date columns cannot build updates', () => {
  assert.throws(() => buildPlanningBookSelectedCellDto(book, row, 'unknown', 11, 10, selection), /read-only/);
  for (const column of [
    { field: 'description', name: 'Description' },
    { field: forecast, name: 'Disabled', dataColumn: true, enableCellEdit: false },
    { field: 'Calculated total', name: 'Calculated total', dataColumn: true },
  ]) {
    const dto = { ...book, columnDefs: [column] };
    assert.throws(() => buildPlanningBookSelectedCellDto(dto, row, column.field, 11, 10, selection), /read-only|calendar date/);
  }
});

// Execute the real grid handlers, rather than duplicating their implementation.
const source = readFileSync(resolve(root, gridPath), 'utf8').split('</script>')[0].replace(/^<script[^>]*>/, '');
const ast = ts.createSourceFile(gridPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function gridFunction(name, dependencies) {
  const declaration = ast.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, name);
  const output = ts.transpileModule(`${declaration.getText(ast)}\nreturn ${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(dependencies), output)(...Object.values(dependencies));
}
const props = { planningBook: book, mode: 'demand', isSaving: false };
const isEditableCell = gridFunction('isEditableCell', { props, isPlanningBookReadOnlyColumn });

test('opening and reconciling a book indexes row scopes without constructing a blank-period update', () => {
  assert.doesNotThrow(() => conflicts.applyPendingPlanningBookEdits(book, [row], []));
  const edit = buildPlanningBookSelectedCellDto(book, row, forecast, 121, 120, selection);
  const rows = [{ ...row }];
  conflicts.applyPendingPlanningBookEdits(book, rows, [edit]);
  assert.equal(rows[0][forecast], 121);
  assert.deepEqual(conflicts.createDemandPlanningBookConflictFinder(book, [], rows)(edit), []);
});

test('the editor policy used by double click, F2 and typing denies historical cells', () => {
  for (const column of book.columnDefs) {
    assert.equal(isEditableCell(row, column.field, column), column.field === forecast);
  }
  assert.match(source, /editable:[\s\S]*?isEditableCell\(params\.data, column\.field, column\)/);
  assert.match(source, /function requestConflictingCellEdit[\s\S]*?!isEditableCell\(row, field, column\)/);
});

test('a stale editor or direct grid update restores historical values without emitting an edit', () => {
  const emitted = [];
  const handleCellValueChanged = gridFunction('handleCellValueChanged', {
    props, isEditableCell, parseEditableNumber: Number, formatNumericValue: String,
    gridApi: { value: { refreshCells() {} } }, emit: (...args) => emitted.push(args),
  });
  for (const field of [average, history]) {
    const data = { ...row, [field]: 11 };
    handleCellValueChanged({ data, colDef: { field }, oldValue: 10, newValue: 11 });
    assert.equal(data[field], 10);
  }
  assert.equal(emitted.length, 0);
  handleCellValueChanged({ data: { ...row }, colDef: { field: forecast }, oldValue: 10, newValue: 11 });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0][0], 'edit');
});

test('double click, F2, Enter, typing and delete never request a historical editor', () => {
  const requested = [];
  const requestConflictingCellEdit = gridFunction('requestConflictingCellEdit', {
    props, isEditableCell, hasPendingDemandConflict: () => true,
    emit: (...args) => requested.push(args),
  });
  const handleCellDoubleClicked = gridFunction('handleCellDoubleClicked', { requestConflictingCellEdit });
  class KeyboardEvent { constructor(key) { this.key = key; } }
  const handleCellKeyDown = gridFunction('handleCellKeyDown', {
    requestConflictingCellEdit, KeyboardEvent, Element: class Element {},
  });
  for (const field of [history, average]) {
    const event = { node: {}, data: row, colDef: { field } };
    handleCellDoubleClicked(event);
    for (const key of ['F2', 'Enter', '1', 'Backspace', 'Delete']) {
      handleCellKeyDown({ ...event, event: new KeyboardEvent(key) });
    }
  }
  assert.equal(requested.length, 0);
  handleCellDoubleClicked({ node: {}, data: row, colDef: { field: forecast } });
  assert.equal(requested.length, 1);
});
