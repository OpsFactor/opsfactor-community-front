import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dataExportFileName, assertDataExportContentType, dataExportDescriptor, dataExportQuery, dataImportContentType, resolveDataExportPath } from '../packages/front-core/src/api/data-export-format.ts';

test('standard CSV delegates all formatting to server defaults', () => {
  assert.deepEqual(dataExportQuery('csvStandard'), { format: 'csv' });
  assert.deepEqual(dataExportQuery('csv'), { format: 'csv' });
  assert.deepEqual(dataExportQuery('json'), { format: 'json' });
  assert.deepEqual(dataExportQuery('arrow'), { format: 'arrow' });
});

test('local CSV only sends separators; explicit hidden overrides remain available', () => {
  assert.deepEqual(dataExportQuery('csvSystemLocale', {}, 'pt-BR'), { format: 'csv', fieldSeparator: ';', decimalSeparator: 'comma' });
  assert.deepEqual(dataExportQuery('csvSystemLocale', {}, 'en-US'), { format: 'csv', fieldSeparator: ',', decimalSeparator: 'dot' });
  assert.deepEqual(dataExportQuery('csvStandard', { fieldSeparator: '|', decimalSeparator: 'comma' }), { format: 'csv', fieldSeparator: '|', decimalSeparator: 'comma' });
});

test('export route selection preserves scope while removing obsolete FILE namespace', () => {
  assert.equal(resolveDataExportPath('/api/secured/dataupload/material'), '/api/secured/data/material');
  assert.equal(resolveDataExportPath('/api/secured/dataupload/json/material'), '/api/secured/data/material');
  assert.equal(resolveDataExportPath('/api/secured/data/file/stock/2027-01-01/2027-02-01'), '/api/secured/data/stock/2027-01-01/2027-02-01');
  assert.equal(resolveDataExportPath('/api/secured/dataupload/profitlossbydfu/new/file/17'), '/api/secured/data/profitlossbydfu/17');
  assert.equal(resolveDataExportPath('/api/secured/planning/demand/batchupdate/download'), '/api/secured/planning/demand/batchupdate/download');
});

test('structured import content types are distinct from legacy multipart spreadsheets', () => {
  assert.equal(dataImportContentType('materials.ARROW'), 'application/vnd.apache.arrow.stream');
  assert.equal(dataImportContentType('materials.parquet'), 'application/vnd.apache.parquet');
  assert.equal(dataImportContentType('materials.json'), 'application/json');
  assert.equal(dataImportContentType('materials.xlsx'), null);
  assert.equal(dataImportContentType('materials.csv'), null);
  assert.equal(dataExportDescriptor('xlsx').extension, 'xlsx');
  assert.equal(dataExportDescriptor('parquet').extension, 'parquet');
});

test('filenames and content validation cannot disguise a legacy JSON response as Excel', () => {
  assert.equal(dataExportFileName('report.xlsx', 'csvStandard'), 'report.csv');
  assert.equal(dataExportFileName('C:\\temp\\unsafe:report.json', 'parquet'), 'unsafe_report.parquet');
  assert.doesNotThrow(() => assertDataExportContentType('text/csv;charset=utf-8', 'csvStandard'));
  assert.throws(() => assertDataExportContentType('application/json', 'xlsx'), /requested XLSX/);
});

test('all hosts download server files and do not serialize workbooks or CSV locally', () => {
  for (const path of [
    new URL('../src/modules/data/community-data-upload.service.ts', import.meta.url),
    new URL('../../opsfactor-enterprise-front/src/modules/data/services/data-operations.service.ts', import.meta.url),
    'C:/Users/erick/VsCodeProjects/planning-front/src/modules/data/services/data-operations.service.ts',
  ]) {
    // The public Community checkout can run independently of private/legacy hosts.
    if (!existsSync(path)) continue;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /XLSX\.writeFile|rowsToDelimitedText|matrixToDelimitedText|objectRowsToCsv|matrixRowsToCsv/);
    assert.match(source, /requestBlob|response\.blob\(\)/);
    assert.match(source, /dataExportQuery/);
  }
});
