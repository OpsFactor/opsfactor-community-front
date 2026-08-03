import assert from 'node:assert/strict';
import test from 'node:test';
import { ClusterScopeInspectorService } from '../src/modules/cluster-scope/cluster-scope.service.ts';

test('Demand Planning Cluster editor uses only bounded Community definition snapshots', async () => {
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
    { path: '/api/secured/materialclustering/42/DP', options: undefined },
    { path: '/api/secured/locationclustering/81', options: undefined },
    { path: '/api/secured/location/cluster/81/locations', options: undefined },
  ]);
});

test('Demand Planning Cluster editor writes full snapshots and sends only the confirmed cluster delete', async () => {
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
    process: 'DP',
    regraAlocacaoClusterDTOList: [{ id: 101, criterio: 'Status', caracteristicaDTO: { description: 'REGULAR' } }],
  });
  await service.saveLocationCluster({
    id: 81,
    description: 'Location scope',
    priority: 3,
    regraAlocacaoClusterDTOList: [{ id: 102, criterio: 'Country / State', pais: 'Country', estado: 'State' }],
  });
  await service.deleteMaterialCluster({ id: 42, process: 'DP' });
  await service.deleteLocationCluster({ id: 81 });

  assert.equal(calls[0].path, '/api/secured/materialclustering/save');
  assert.equal(calls[0].options?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].options?.body)), {
    id: 42,
    description: 'Material scope',
    priority: 2,
    process: 'DP',
    regraAlocacaoClusterDTOList: [{ id: 101, criterio: 'Status', caracteristicaDTO: { description: 'REGULAR' } }],
  });
  assert.equal(calls[1].path, '/api/secured/locationclustering/save');
  assert.equal(calls[1].options?.method, 'POST');
  assert.equal(calls[2].path, '/api/secured/materialclustering/delete');
  assert.equal(calls[2].options?.method, 'DELETE');
  assert.deepEqual(JSON.parse(String(calls[2].options?.body)), { id: 42, process: 'DP' });
  assert.equal(calls[3].path, '/api/secured/locationclustering/delete');
  assert.equal(calls[3].options?.method, 'DELETE');
  assert.deepEqual(JSON.parse(String(calls[3].options?.body)), { id: 81 });
});

test('Demand Planning Cluster editor keeps allocation and DFU endpoints outside its transport', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-scope/cluster-scope.service.ts', import.meta.url),
    'utf8',
  ));

  for (const forbiddenFragment of [
    '/allocation',
    '/DFU',
    '/material/cluster/',
    '/clustering/material/criteria',
    '/clustering/location/criteria',
  ]) {
    assert.equal(source.includes(forbiddenFragment), false, `Cluster editor must not use ${forbiddenFragment}`);
  }
});

test('Cluster editor page locks Community values and makes structural rule changes remove plus add', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-scope/ClusterScopeInspectorPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /process: 'DP'/);
  assert.match(source, /'NOT RELEASED', 'REGULAR', 'DISCONTINUED'/);
  assert.equal(source.includes("'NEW'"), false);
  assert.match(source, /Pricing, new-material rules, characteristics/i);
  assert.match(source, /remove it and add a new rule/i);
  assert.match(source, /Save complete snapshot/);
  assert.match(source, /Delete .* cluster\?/);
  assert.match(source, /@click="void loadSelectedLocationClusterMembers\(\)"/);
  assert.match(source, /never used to infer a delete cascade/i);
});
