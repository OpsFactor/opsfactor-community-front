import assert from 'node:assert/strict';
import test from 'node:test';
import { CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT } from '../src/modules/cluster-location-planning-parameters/cluster-location-planning-parameters.types.ts';

test('Cluster Location Planning Parameters Inspector uses only the Community administrative snapshot endpoint', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-location-planning-parameters/cluster-location-planning-parameters.service.ts', import.meta.url),
    'utf8',
  ));

  assert.equal(CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT, '/api/secured/configs/parametros/clusterLocation');
  assert.match(source, /CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT/);
  assert.match(source, /httpClient\.request<CommunityClusterLocationPlanningParameter\[\]>/);
});

test('Cluster Location Planning Parameters Inspector transport excludes mutation, members, allocation, DFU and execution', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/cluster-location-planning-parameters/cluster-location-planning-parameters.service.ts', import.meta.url),
    'utf8',
  )).then((value) => value.toLowerCase());

  for (const forbiddenFragment of [
    'method:',
    'post',
    'delete',
    'save',
    'member',
    'allocation',
    'dfu',
    'simulate',
    'execute',
    'data/file',
    'reload',
  ]) {
    assert.equal(source.includes(forbiddenFragment), false, `Inspector transport must not use ${forbiddenFragment}`);
  }
});
