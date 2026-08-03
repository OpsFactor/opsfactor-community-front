import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLowLevelCodeMaterialEndpoint,
  lowLevelCodeMaterialEndpoint,
} from '../src/modules/low-level-code/low-level-code.types.ts';

test('builds the material-specific Low Level Code endpoint without a global-map request', () => {

  assert.equal(
    buildLowLevelCodeMaterialEndpoint(' Version / A ', ' Material / A '),
    `${lowLevelCodeMaterialEndpoint}?supplyNetworkVersionId=Version+%2F+A&materialId=Material+%2F+A`,
  );

});

test('rejects blank material-specific Low Level Code keys before a request', () => {

  assert.throws(() => buildLowLevelCodeMaterialEndpoint('', 'material-1'), /Supply Network Version ID is required/);
  assert.throws(() => buildLowLevelCodeMaterialEndpoint('version-1', '  '), /Material ID is required/);

});

test('Low Level Code transport loads only the selected material snapshot', async () => {

  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/low-level-code/low-level-code.service.ts', import.meta.url),
    'utf8',
  ));

  assert.match(source, /getMaterialSnapshot/);
  assert.match(source, /buildLowLevelCodeMaterialEndpoint\(supplyNetworkVersionId, materialId\)/);
  assert.match(source, /httpClient\.request<CommunityLowLevelCodeSnapshot>/);
  assert.equal(source.includes("'/api/secured/planning/supply/lowlevelcode'"), false);

});
