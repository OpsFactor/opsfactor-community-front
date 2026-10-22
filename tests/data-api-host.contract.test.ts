import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ownedTemporary = await mkdtemp(join(tmpdir(), 'opsfactor-data-api-host-'));
after(async () => {
  const target = resolve(ownedTemporary);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('opsfactor-data-api-host-')) throw new Error('Unexpected test directory');
  await rm(target, { recursive: true, force: true });
});
const hosts = [
  { name: 'Community', root: resolve(import.meta.dirname, '..'), endpoint: null },
  { name: 'Enterprise', root: resolve(import.meta.dirname, '../../opsfactor-enterprise-front'), endpoint: '/api/secured/data/profitlossbydfu' },
  { name: 'Legacy', root: resolve(process.env.OPSFACTOR_LEGACY_FRONT ?? 'C:/Users/erick/VsCodeProjects/planning-front'), endpoint: '/api/secured/dataupload/profitlossbydfu' },
];
async function loadService(host, relativePath) {
  const bundle = await build({
    entryPoints: [join(host.root, relativePath)], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022',
    // Only the session sources are fixtures. Exercise the production host HTTP facade and helper.
    plugins: [{ name: 'session-fixtures', setup(builder) {
      builder.onLoad({ filter: /services[\\/]api[\\/]csrf\.ts$/ }, () => ({ contents: "export function getCsrfConfig() { return { headerName: 'X-Test-CSRF', token: 'test-csrf' }; }", loader: 'ts' }));
      builder.onLoad({ filter: /community-authentication\.service\.ts$/ }, () => ({ contents: "export function getCommunityAuthorizationHeader() { return 'Basic dGVzdDpmYWtl'; }", loader: 'ts' }));
    }}],
  });
  const bundleFile = join(ownedTemporary, `${host.name}-${relativePath.includes('visibility') ? 'report' : 'api'}.mjs`);
  await writeFile(bundleFile, bundle.outputFiles[0].contents);
  return import(pathToFileURL(bundleFile).href);
}

for (const host of hosts) {
  test(`${host.name}: real HTTP facade retains cookies/CSRF/auth and does not add an omitted format`, async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    globalThis.window = { location: { origin: 'http://localhost:5173' } };
    try {
      const api = await loadService(host, 'src/services/api/data-api.ts');
      let calls = 0;
      globalThis.fetch = async (url, options) => {
        calls++;
        assert.equal(String(url), '/api/secured/data/material?location=A&limit=0');
        assert.equal(options.credentials, 'include');
        assert.equal(options.headers.get('X-Test-CSRF'), 'test-csrf');
        assert.equal(options.headers.get('Accept'), 'application/json');
        assert.equal(options.headers.has('Authorization'), host.name === 'Community');
        return new Response('[{"id":"00123"}]', { headers: { 'Content-Type': 'application/json' } });
      };
      assert.deepEqual(await api.apiData('/api/secured/data/material?location=A', { query: { limit: 0 } }), [{ id: '00123' }]);
      assert.equal(calls, 1);
    } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
  });

  test(`${host.name}: apiFile upload preserves authentication and sends the selected bytes unchanged`, async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    globalThis.window = { location: { origin: 'http://localhost:5173' } };
    try {
      const api = await loadService(host, 'src/services/api/data-api.ts');
      const file = new File(['raw bytes'], 'records.parquet');
      globalThis.fetch = async (url, options) => {
        assert.equal(String(url), '/api/secured/data/material');
        assert.equal(options.method, 'POST');
        assert.equal(options.body, file);
        assert.equal(options.credentials, 'include');
        assert.equal(options.headers.get('X-Test-CSRF'), 'test-csrf');
        assert.equal(options.headers.get('Content-Type'), 'application/vnd.apache.parquet');
        assert.equal(options.headers.has('Authorization'), host.name === 'Community');
        return new Response('{"saved":true}', { headers: { 'Content-Type': 'application/json' } });
      };
      assert.deepEqual(await api.apiFile('/api/secured/data/material', { mode: 'upload', file }), { saved: true });
    } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
  });

  if (!host.endpoint) continue;
  test(`${host.name}: P&L uses the helper with unchanged POST filters and one Arrow response`, async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    globalThis.window = { location: { origin: 'http://localhost:5173' } };
    const controller = new AbortController();
    const params = { supplyPlanId: 17, generateAllCombinations: true, signal: controller.signal, filter: { materialIds: [], locationIds: [], valuesByMaterialCharacteristicId: {}, valuesByLocationCharacteristicId: {} } };
    try {
      const report = await loadService(host, 'src/modules/visibility/services/plan-comparison.service.ts');
      let calls = 0;
      globalThis.fetch = async (url, options) => {
        calls++;
        assert.equal(String(url), `${host.endpoint}?format=arrow`);
        assert.equal(options.method, 'POST');
        assert.equal(options.signal, controller.signal);
        assert.equal(options.credentials, 'include');
        assert.equal(options.headers.get('Content-Type'), 'application/json');
        assert.equal(options.headers.get('Accept'), 'application/vnd.apache.arrow.stream');
        assert.deepEqual(JSON.parse(options.body), { supplyPlanId: 17, generateAllCombinations: true, initialReferenceDate: null, finalReferenceDate: null, filter: params.filter });
        return new Response(await readFile(new URL('../packages/front-core/tests/fixtures/data-formats/flat.arrow', import.meta.url)), { headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' } });
      };
      const rows = await report.fetchPlanComparisonReport(params);
      assert.equal(rows[0].id, '00123');
      assert.equal(calls, 1);
      controller.abort();
      await assert.rejects(report.fetchPlanComparisonReport(params), { name: 'AbortError' });
      assert.equal(calls, 1);
    } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
  });
}
