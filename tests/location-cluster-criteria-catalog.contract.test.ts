import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCATION_CLUSTER_CRITERIA_CATALOG_ENDPOINT } from '../src/modules/location-cluster-criteria/location-cluster-criteria.types.ts';

test('Location Cluster Criteria Catalog uses only the raw allowed-value endpoint', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/location-cluster-criteria/location-cluster-criteria.service.ts', import.meta.url),
    'utf8',
  ));

  assert.equal(LOCATION_CLUSTER_CRITERIA_CATALOG_ENDPOINT, '/api/secured/clustering/location/criteria');
  assert.match(source, /httpClient\.request<CommunityLocationClusterCriterion\[\]>\(LOCATION_CLUSTER_CRITERIA_CATALOG_ENDPOINT\)/);
});

test('Location Cluster Criteria Catalog transport excludes clusters, members, allocation, material and write operations', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/location-cluster-criteria/location-cluster-criteria.service.ts', import.meta.url),
    'utf8',
  ));

  for (const forbiddenFragment of [
    'method:',
    'post',
    'delete',
    'cluster/',
    'member',
    'allocation',
    'material',
    'data/file',
  ]) {
    assert.equal(source.toLowerCase().includes(forbiddenFragment), false, `Catalog must not use ${forbiddenFragment}`);
  }
});
