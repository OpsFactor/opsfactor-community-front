import assert from 'node:assert/strict';
import test from 'node:test';
import { ClusterScopeInspectorService } from '../src/modules/cluster-scope/cluster-scope.service.ts';

test('Clustering workspace uses only bounded Community definition snapshots', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve([]);
    },
  };
  const service = new ClusterScopeInspectorService(httpClient as never);

  await service.getMaterialClusters();
  await service.getLocationClusters();
  await service.getMaterialCluster(42);
  await service.getLocationCluster(81);
  await service.getLocationClusterMembers(81);

  assert.deepEqual(calls, [
    { path: '/api/secured/materialclustering', options: undefined },
    { path: '/api/secured/locationclustering', options: undefined },
    { path: '/api/secured/materialclustering/42', options: undefined },
    { path: '/api/secured/locationclustering/81', options: undefined },
    { path: '/api/secured/location/cluster/81/locations', options: undefined },
  ]);
});

test('Clustering workspace loads the public material-characteristic catalog', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve([]);
    },
  };
  const service = new ClusterScopeInspectorService(httpClient as never);

  await service.getMaterialCharacteristics();

  assert.deepEqual(calls, [
    { path: '/api/secured/material/characteristics', options: undefined },
  ]);
});

test('Clustering workspace writes full snapshots without a process discriminator', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve('OK');
    },
  };
  const service = new ClusterScopeInspectorService(httpClient as never);

  await service.saveMaterialCluster({
    id: 42,
    description: 'Material scope',
    priority: 2,
    regraAlocacaoClusterDTOList: [{ id: 101, criterio: 'Status', caracteristicaDTO: { description: 'REGULAR' } }],
  });
  await service.saveLocationCluster({
    id: 81,
    description: 'Location scope',
    priority: 3,
    regraAlocacaoClusterDTOList: [{ id: 102, criterio: 'Country / State', pais: 'Country', estado: 'State' }],
  });
  await service.deleteMaterialCluster({ id: 42 });
  await service.deleteLocationCluster({ id: 81 });

  assert.equal(calls[0].path, '/api/secured/materialclustering/save');
  assert.equal(calls[0].options?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].options?.body)), {
    id: 42,
    description: 'Material scope',
    priority: 2,
    regraAlocacaoClusterDTOList: [{ id: 101, criterio: 'Status', caracteristicaDTO: { description: 'REGULAR' } }],
  });
  assert.equal(calls[1].path, '/api/secured/locationclustering/save');
  assert.equal(calls[1].options?.method, 'POST');
  assert.equal(calls[2].path, '/api/secured/materialclustering/delete');
  assert.equal(calls[2].options?.method, 'DELETE');
  assert.deepEqual(JSON.parse(String(calls[2].options?.body)), { id: 42 });
  assert.equal(calls[3].path, '/api/secured/locationclustering/delete');
  assert.equal(calls[3].options?.method, 'DELETE');
  assert.deepEqual(JSON.parse(String(calls[3].options?.body)), { id: 81 });
});

test('Clustering workspace keeps allocation and DFU endpoints outside its transport while reading selected members', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-scope/cluster-scope.service.ts', import.meta.url),
    'utf8',
  ));

  for (const forbiddenFragment of [
    '/allocation',
    '/DFU',
    '/clustering/material/criteria',
    '/clustering/location/criteria',
  ]) {
    assert.equal(source.includes(forbiddenFragment), false, `Cluster editor must not use ${forbiddenFragment}`);
  }
  assert.match(source, /\/api\/secured\/material\/cluster\/\$\{encodeURIComponent\(String\(clusterId\)\)\}\/materials/);
});

test('Clustering page exposes one scheme with material and location dimensions', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-scope/ClusterScopeInspectorPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /DashboardPageLayout/);
  assert.match(source, /eyebrow="Configuration" title="Clustering"/);
  assert.match(source, /one planning clustering scheme/);
  assert.match(source, /clustering-workbench/);
  assert.match(source, /cluster-library/);
  assert.match(source, /Material clusters/);
  assert.match(source, /Location clusters/);
  assert.match(source, /OfxSelectField/);
  assert.match(source, /OfxEntityMultiSelect/);
  assert.match(source, /library-selectors/);
  assert.match(source, /#\$\{cluster\.id\}/);
  assert.match(source, /New \{\{ activeDimension \}\} cluster/);
  assert.match(source, /OfxTextField v-model="materialDraft\.description" label="Description"/);
  assert.match(source, /OfxTextField v-model="materialDraft\.priority" label="Priority"/);
  assert.match(source, /: 'Save cluster'/);
  assert.match(source, />Delete cluster<\/button>/);
  assert.doesNotMatch(source, /process:\s*'DP'/);
  assert.doesNotMatch(source, /Demand Planning/);
  assert.doesNotMatch(source, /Pricing cluster/);
  assert.match(source, /'NOT RELEASED', 'REGULAR', 'DISCONTINUED'/);
  assert.match(source, /Add characteristic/);
  assert.match(source, /getMaterialCharacteristics/);
  assert.match(source, /initialMaterialClusterId/);
  assert.match(source, /rule-summary/);
  assert.match(source, /materialRuleSubject/);
  assert.match(source, /materialRuleValues/);
  assert.equal(source.includes("'NEW'"), false);
  assert.match(source, /Delete this cluster\?/);
  assert.match(source, /loadSelectedMaterialClusterMembers/);
  assert.match(source, /Materials in this cluster/);
  assert.match(source, /OfxDataTable/);
  assert.doesNotMatch(source, /Refresh library/);
  assert.doesNotMatch(source, /shared scheme\./);
  assert.doesNotMatch(source, /clustering\/material\/allocation/);
  assert.doesNotMatch(source, /clustering\/location\/allocation/);
  assert.doesNotMatch(source, /product\/characteristics/);
  assert.doesNotMatch(source, /location\/characteristics/);
  assert.doesNotMatch(source, /<select/);
  assert.doesNotMatch(source, /<input/);
});
