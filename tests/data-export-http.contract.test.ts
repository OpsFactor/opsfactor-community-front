import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/** Bundle the real host services so their production imports stay intact in this Node test. */
async function loadHostService(path: string) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

for (const [host, path] of [
  ['Enterprise', resolve(import.meta.dirname, '../../opsfactor-enterprise-front/src/modules/data/services/data-operations.service.ts')],
  ['Legacy', 'C:/Users/erick/VsCodeProjects/planning-front/src/modules/data/services/data-operations.service.ts'],
]) {
  test(`${host} uses format negotiation and passes the server download unchanged`, { skip: !existsSync(path) }, async () => {
    const service = await loadHostService(path);
    const originalFetch = globalThis.fetch;
    const calls: { url: string; options: RequestInit }[] = [];
    let binaryReads = 0;
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      const response = new Response(new Uint8Array([80, 75, 3, 4]), { headers: { 'Content-Type': 'application/octet-stream' } });
      response.text = async () => { throw new Error('Download must not parse or serialize the successful body.'); };
      const originalBlob = response.blob.bind(response);
      response.blob = async () => { binaryReads++; return originalBlob(); };
      return response;
    };
    const definition = { id: 'materials', label: 'Materials', uploadApi: '/api/secured/dataupload/material', downloadApi: '/api/secured/dataupload/material', jsonApi: '/api/secured/dataupload/json/material' };
    try {
      await service.downloadDataPackage({ definition, format: 'xlsx' });
      assert.equal(calls[0].url, '/api/secured/data/material?format=xlsx');
      await service.downloadDataPackage({ definition, format: 'csvStandard' });
      assert.equal(calls[1].url, '/api/secured/data/material?format=csv');
      await service.downloadDataPackage({ definition, format: 'arrow' });
      assert.equal(calls[2].url, '/api/secured/data/material?format=arrow');
      assert.equal(calls[2].options.headers.Accept, 'application/vnd.apache.arrow.stream');
      await service.downloadDataPackage({ definition: { ...definition, downloadRangeApi: '/api/secured/dataupload/stock/{dataInicial}/{dataFinal}' }, format: 'csvStandard', dateRange: { startDate: '2027-01-01', endDate: '2027-02-01' } });
      assert.equal(calls[3].url, '/api/secured/data/stock/2027-01-01/2027-02-01?format=csv');
      assert.equal(binaryReads, 4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test(`${host} structured imports use raw bodies while spreadsheet imports stay multipart`, { skip: !existsSync(path) }, async () => {
    const service = await loadHostService(path);
    const originalFetch = globalThis.fetch;
    const calls: { url: string; options: RequestInit }[] = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return new Response('saved', { headers: { 'Content-Type': 'text/plain' } });
    };
    const definition = { id: 'materials', label: 'Materials', uploadApi: '/api/secured/dataupload/material', downloadApi: '/api/secured/dataupload/material', jsonApi: '/api/secured/dataupload/json/material' };
    try {
      const structured = new File(['data'], 'materials.parquet');
      await service.uploadDataPackage(definition, structured);
      assert.equal(calls[0].url, '/api/secured/data/material');
      assert.equal(calls[0].options.headers['Content-Type'], 'application/vnd.apache.parquet');
      assert.equal(calls[0].options.body, structured);
      await service.uploadDataPackage(definition, new File(['data'], 'materials.xlsx'));
      assert.ok(calls[1].options.body instanceof FormData);
      assert.ok(calls[1].options.body.get('file') instanceof File);
      assert.ok(!calls[1].options.headers);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
