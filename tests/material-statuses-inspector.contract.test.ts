import assert from 'node:assert/strict';
import test from 'node:test';
import { MATERIAL_STATUS_CATALOG_ENDPOINT } from '../src/modules/material-statuses/material-statuses.types.ts';

test('Material Status Catalog Inspector uses only the raw enum endpoint', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/material-statuses/material-statuses.service.ts', import.meta.url),
    'utf8',
  ));

  assert.equal(MATERIAL_STATUS_CATALOG_ENDPOINT, '/api/secured/material/status');
  assert.match(source, /httpClient\.request<CommunityMaterialStatus\[\]>\(MATERIAL_STATUS_CATALOG_ENDPOINT\)/);
});

test('Material Status Catalog Inspector transport excludes lifecycle resolution and unsupported operations', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/material-statuses/material-statuses.service.ts', import.meta.url),
    'utf8',
  ));

  for (const forbiddenFragment of [
    'method:',
    'post',
    'delete',
    'reload',
    'data/file',
    'lifecycle',
    'effective',
  ]) {
    assert.equal(source.toLowerCase().includes(forbiddenFragment), false, `Inspector must not use ${forbiddenFragment}`);
  }
});
