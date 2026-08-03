import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityRoot = new URL('../', import.meta.url);
const enterpriseRoot = new URL('../../opsfactor-enterprise-front/', import.meta.url);

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, communityRoot), 'utf8');
}

function readEnterprise(relativePath: string) {
  return readFileSync(new URL(relativePath, enterpriseRoot), 'utf8');
}

test('Community shell owns the neutral data-table contracts, formatters and workbook export', () => {

  const packageIndex = read('packages/front-shell/src/index.ts');
  const formatterSource = read('packages/front-shell/src/data-table.formatters.ts');
  const workbookSource = read('packages/front-shell/src/xlsx-workbook.ts');

  assert.match(packageIndex, /from '\.\/data-table\.formatters\.js'/);
  assert.match(packageIndex, /from '\.\/data-table\.export\.js'/);
  assert.match(packageIndex, /from '\.\/xlsx-workbook\.js'/);
  assert.match(formatterSource, /export function formatDisplayValue/);
  assert.match(formatterSource, /export function compareTypedValues/);
  assert.match(workbookSource, /export function objectRowsToWorksheet/);
});

test('both hosts retain data-table paths only as Community-package compatibility adapters', () => {

  for (const source of [
    read('src/lib/data-table/defaults.ts'),
    read('src/lib/data-table/formatters.ts'),
    read('src/lib/data-table/export/index.ts'),
    read('src/lib/export/xlsx-workbook.ts'),
    readEnterprise('src/lib/data-table/defaults.ts'),
    readEnterprise('src/lib/data-table/formatters.ts'),
    readEnterprise('src/lib/data-table/export/index.ts'),
    readEnterprise('src/lib/export/xlsx-workbook.ts'),
  ]) {
    assert.match(source, /@opsfactor\/front-shell/);
  }

  assert.match(readEnterprise('package.json'), /"@opsfactor\/front-shell": "file:\.\.\/opsfactor-community-front\/packages\/front-shell"/);
});

test('both editions receive the AG Grid adapter from Community instead of maintaining a second renderer', () => {

  const communityGrid = read('src/wrappers/ag-grid/AgGridTableAdapter.vue');
  const enterpriseGrid = readEnterprise('src/wrappers/ag-grid/AgGridTableAdapter.vue');
  const sharedGrid = read('packages/front-shell/src/OfxAgGridTableAdapter.vue');

  assert.match(communityGrid, /OfxAgGridTableAdapter as default/);
  assert.match(enterpriseGrid, /OfxAgGridTableAdapter as default/);
  assert.match(sharedGrid, /ModuleRegistry\.registerModules/);
  assert.match(sharedGrid, /exportData/);
  assert.doesNotMatch(communityGrid, /ModuleRegistry\.registerModules/);
  assert.doesNotMatch(enterpriseGrid, /ModuleRegistry\.registerModules/);
});

test('Community supplies both generic table engines while Enterprise follows the document theme policy', () => {

  const sharedTable = read('packages/front-shell/src/OfxDataTable.vue');
  const sharedPrimeTable = read('packages/front-shell/src/OfxPrimeDataTableAdapter.vue');

  assert.match(sharedTable, /OfxAgGridTableAdapter/);
  assert.match(sharedTable, /OfxPrimeDataTableAdapter/);
  assert.match(sharedPrimeTable, /MutationObserver/);
  assert.match(sharedPrimeTable, /dataset\.theme/);

  for (const source of [
    read('src/components/ofx/data-display/OfxDataTable.vue'),
    readEnterprise('src/components/ofx/data-display/OfxDataTable.vue'),
    read('src/wrappers/primevue/data-table/PrimeDataTableAdapter.vue'),
    readEnterprise('src/wrappers/primevue/data-table/PrimeDataTableAdapter.vue'),
  ]) {
    assert.match(source, /@opsfactor\/front-shell/);
  }
});

test('Community supplies the Perspective pivot runtime while both hosts retain compatibility paths only', () => {

  const packageIndex = read('packages/front-perspective/src/index.ts');
  const sharedAdapter = read('packages/front-perspective/src/PerspectivePivotAdapter.vue');
  const sharedPivot = read('packages/front-perspective/src/OfxPivotTable.vue');
  const communityAdapter = read('src/wrappers/perspective/PerspectivePivotAdapter.vue');
  const enterpriseAdapter = readEnterprise('src/wrappers/perspective/PerspectivePivotAdapter.vue');
  const communityPivot = read('src/components/ofx/data-display/OfxPivotTable.vue');
  const enterprisePivot = readEnterprise('src/components/ofx/data-display/OfxPivotTable.vue');

  assert.match(packageIndex, /PerspectivePivotAdapter/);
  assert.match(packageIndex, /OfxPivotTable/);
  assert.match(sharedAdapter, /@perspective-dev\/client/);
  assert.match(sharedAdapter, /init_client/);
  assert.match(sharedAdapter, /init_server/);
  assert.match(sharedPivot, /PerspectivePivotAdapter/);

  for (const source of [communityAdapter, enterpriseAdapter, communityPivot, enterprisePivot]) {
    assert.match(source, /@opsfactor\/front-perspective/);
    assert.doesNotMatch(source, /@perspective-dev\/client/);
  }
});
