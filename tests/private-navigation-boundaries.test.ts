import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const privatePages = [{ moduleKey: 'supply-network', sectionLabel: 'Planning', key: 'private-page', label: 'Private tool', path: '/private-tool', description: 'Private host extension', keywords: [], status: 'live', componentKey: 'private-page' }];

const compiled = await build({ entryPoints: [fileURLToPath(new URL('../packages/front-shell/src/legacy-navigation.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' });
const { createLegacyNavigation } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const pageComponents = new Proxy({}, { get: () => () => null });
const config = { pageComponents, moduleOverviewComponent: () => null };

test('ATP is absent from Community navigation, routes and search, and its source metadata stays private', async () => {
  const community = createLegacyNavigation({ ...config, edition: 'community' });
  assert.ok(!community.APP_ROUTE_RECORDS.some((route) => /available-to-promise/.test(route.path)));
  assert.ok(!community.APP_SEARCH_INDEX.some((entry) => /available-to-promise/.test(entry.path)));
  assert.doesNotMatch(JSON.stringify(community.APP_NAVIGATION_MODULES), /available.to.promise/i);
  for (const path of ['legacy-navigation.ts', 'edition-navigation-policy.ts']) {
    assert.doesNotMatch(await readFile(new URL('../packages/front-shell/src/' + path, import.meta.url), 'utf8'), /available.to.promise/i);
  }
  assert.throws(() => createLegacyNavigation({ ...config, edition: 'community', additionalPages: privatePages }), /Enterprise host/);
});

test('the extension contract registers private navigation only in its host', () => {
  const enterprise = createLegacyNavigation({ ...config, edition: 'enterprise', additionalPages: privatePages });
  const route = enterprise.APP_ROUTE_RECORDS.find((candidate) => candidate.name === 'private-page');
  assert.equal(route.path, '/private-tool');
  assert.equal(enterprise.APP_SEARCH_INDEX.filter((entry) => entry.key === 'private-page').length, 1);
});

test('Community reports remain direct and its Data workspace cannot opt into jobs or cached results', async () => {
  const data = await readFile(new URL('../src/modules/data/CommunityDataUploadPage.vue', import.meta.url), 'utf8');
  const report = await readFile(new URL('../src/modules/demand-planning/pages/SalesDemandOverviewPage.vue', import.meta.url), 'utf8');
  const transport = await readFile(new URL('../src/modules/demand-planning/services/sales-demand-overview.service.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(data + report + transport, /processed-reports|schedulePlanningDataDownload|download-background|import-background|Azure|threadSync.*async/i);
  assert.match(transport, /\/api\/secured\/planning\/demand\/overview/);
  assert.match(data, /accept="\.csv,\.xlsx"/);
});
