import assert from 'node:assert/strict';
import test from 'node:test';
import { MaterialMasterDataCatalogService } from '../src/modules/material-master-data/material-master-data.service.ts';

test('Material Master-Data Catalog maps only the three canonical Community read endpoints', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve([]);
    },
  };
  const service = new MaterialMasterDataCatalogService(httpClient as never);

  await service.getMaterials();
  await service.getMaterialClusters();
  await service.getMaterialClusterMembers(24);

  assert.deepEqual(calls, [
    { path: '/api/secured/material', options: undefined },
    { path: '/api/secured/material/cluster', options: undefined },
    { path: '/api/secured/material/cluster/24/materials', options: undefined },
  ]);
});

test('Material Master-Data Catalog page keeps all loads explicit and confines lifecycle to Data', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/material-master-data/MaterialMasterDataCatalogPage.vue', import.meta.url),
    'utf8',
  )).then((content) => content.toLowerCase());

  assert.match(source, /selecting a tab never sends a request/);
  assert.match(source, /selectedmaterialclustermembers\.value = null/);
  assert.match(source, /load selected cluster members/);
  assert.match(source, /to="\/data"/);
  assert.equal(source.includes('onmounted'), false);
});

test('Material Master-Data transport excludes writes, allocation and private read surfaces', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/material-master-data/material-master-data.service.ts', import.meta.url),
    'utf8',
  )).then((content) => content.toLowerCase());

  for (const forbiddenFragment of ['post', 'put', 'delete', 'allocation', 'characteristic', 'pricing', 'succession', '/dfu']) {
    assert.equal(source.includes(forbiddenFragment), false, `Material transport must not use ${forbiddenFragment}`);
  }
});
