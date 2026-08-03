import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { UomConversionDetailInspectorService } from '../src/modules/uom-conversion-detail/uom-conversion-detail.service.ts';
import { buildMaterialUomConversionDetailEndpoint } from '../src/modules/uom-conversion-gaps/uom-conversion-gaps.types.ts';

test('Manual UOM Conversion Detail Inspector reads only one material-specific canonical path', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve({ materialId: 'MATERIAL / 1', conversionCoefficient: 0.001 });
    },
  };
  const service = new UomConversionDetailInspectorService(httpClient as never);

  await service.getDetail({ materialId: ' MATERIAL / 1 ', originUomId: ' KG ', targetUomId: ' TON ' });

  assert.deepEqual(calls, [{
    path: '/api/secured/unitofmeasure/conversiondetail/MATERIAL%20%2F%201/KG/TON',
    options: undefined,
  }]);
  assert.throws(() => buildMaterialUomConversionDetailEndpoint({
    materialId: 'MATERIAL', originUnitOfMeasure: ' ', targetUnitOfMeasure: 'KG',
  }), /origin UOM/i);
});

test('Manual UOM Conversion Detail Inspector stays independent from UOM Gaps and Data', () => {
  const page = readFileSync(new URL('../src/modules/uom-conversion-detail/UomConversionDetailInspectorPage.vue', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/modules/uom-conversion-detail/uom-conversion-detail.service.ts', import.meta.url), 'utf8');

  assert.match(page, /independent manual verification/);
  assert.match(page, /Missing-path diagnosis remains in UOM Conversion Gaps/);
  assert.match(page, /Material ID/);
  assert.match(page, /Origin UOM ID/);
  assert.match(page, /Target UOM ID/);
  assert.match(service, /buildMaterialUomConversionDetailEndpoint/);
  for (const forbiddenFragment of [
    'unitofmeasure/conversiondetail/${encodeURIComponent(originUomId)}',
    '/api/secured/data/', "method: 'POST'", "method: 'PUT'", "method: 'DELETE'",
  ]) {
    assert.equal(service.includes(forbiddenFragment), false, `Manual inspector must not use ${forbiddenFragment}`);
  }
});
