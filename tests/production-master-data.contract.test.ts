import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductionMasterDataService } from '../src/modules/production-master-data/production-master-data.service.ts';
import {
  buildProductionResourceDraft,
  buildProductionResourceSaveRequest,
  newProductionResourceDraft,
} from '../src/modules/production-master-data/production-master-data.types.ts';

test('Production Master-Data maps every read tab and one unitary Production Resource POST to canonical Community endpoints', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve(path.endsWith('/save') ? 'Production Resource Saved' : []);
    },
  };
  const service = new ProductionMasterDataService(httpClient as never);

  await service.getRoutings();
  await service.getRoutingOperations();
  await service.getBillsOfMaterials();
  await service.getBillOfMaterialsComponents();
  await service.getProductionResources();
  await service.getRoutingBomInconsistencies();
  await service.saveProductionResource({
    productionResourceId: 'resource', locationId: 'location', description: 'Resource', active: true, efficiency: 0.8,
  });

  assert.deepEqual(calls.slice(0, 6), [
    { path: '/api/secured/production/routing', options: undefined },
    { path: '/api/secured/production/routingoperation', options: undefined },
    { path: '/api/secured/production/billofmaterials', options: undefined },
    { path: '/api/secured/production/billofmaterialscomponents', options: undefined },
    { path: '/api/secured/production/productionresource', options: undefined },
    { path: '/api/secured/production/routing/inconsistencies', options: undefined },
  ]);
  assert.equal(calls[6].path, '/api/secured/production/productionresource/save');
  assert.equal(calls[6].options?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[6].options?.body)), {
    productionResourceId: 'resource', locationId: 'location', description: 'Resource', active: true, efficiency: 0.8,
  });
});

test('Production Resource editor preserves the five-field Community payload, explicit Location identity and immutable existing ID', () => {
  const draft = buildProductionResourceDraft({
    productionResourceId: 'resource', locationId: 'location', description: 'Resource description', active: false, efficiency: 0.5,
  });
  draft.description = ' ';
  draft.efficiency = '';

  assert.deepEqual(buildProductionResourceSaveRequest(draft), {
    productionResourceId: 'resource', locationId: 'location', description: null, active: false, efficiency: null,
  });
  assert.deepEqual(newProductionResourceDraft(), {
    isNew: true, productionResourceId: '', locationId: '', description: '', active: true, efficiency: '',
  });
  assert.throws(() => buildProductionResourceSaveRequest({
    isNew: true, productionResourceId: 'resource', locationId: '', description: '', active: null, efficiency: '',
  }), /location id is required/i);
  assert.throws(() => buildProductionResourceSaveRequest({
    isNew: true, productionResourceId: 'resource', locationId: 'location', description: '', active: null, efficiency: 'not-a-number',
  }), /efficiency must be a finite number/i);
});

test('Production Resource page confines mutation to a confirmed row and reloads only the explicit Production Resources tab', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/production-master-data/ProductionMasterDataPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /productionResourceDraft/);
  assert.match(source, /pendingProductionResourceSave/);
  assert.match(source, /:disabled="\s*savingProductionResource \|\| !productionResourceDraft\.isNew\s*"/);
  assert.match(source, /loadCommunityLocations/);
  assert.match(source, /Location<select[\s\S]*?v-model="productionResourceDraft\.locationId"/);
  assert.match(source, /await productionMasterDataService\.saveProductionResource\(\s*snapshot\s*\)/);
  assert.match(source, /await loadTab\(["']productionResources["']\)/);
  assert.match(source, /There is no delete or[\s\S]*dependent-record reconciliation/);
});

test('Production Resource transport excludes lifecycle delete and private production capabilities', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/production-master-data/production-master-data.service.ts', import.meta.url),
    'utf8',
  )).then((source) => source.toLowerCase());

  for (const forbiddenFragment of [
    'delete',
    'productionversion',
    'routing/save',
    'billofmaterials/save',
    'availability',
    'shift',
    'maintenance',
    'cost',
    'data/file',
  ]) {
    assert.equal(source.includes(forbiddenFragment), false, `Production Resource transport must not use ${forbiddenFragment}`);
  }
  assert.equal((source.match(/productionresource\/save/g) ?? []).length, 1);
});
