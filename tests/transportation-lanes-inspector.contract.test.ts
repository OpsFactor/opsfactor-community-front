import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSupplyNetworkVersionSaveRequest,
  buildTransportationLaneMaterialEndpoint,
  buildTransportationLaneMaterialSaveRequest,
  buildTransportationLanesEndpoint,
  buildTransportationLaneSaveRequest,
  supplyNetworkVersionEndpoint,
  transportationLaneDeleteEndpoint,
  transportationLaneMaterialDeleteEndpoint,
  transportationLaneMaterialUpdateEndpoint,
  transportationLaneUpdateEndpoint,
} from '../src/modules/transportation-lanes/transportation-lanes.types.ts';

test('Supply Network Configuration uses the existing explicit version, base-lane and material-override routes', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/transportation-lanes/transportation-lanes.service.ts', import.meta.url),
    'utf8',
  ));

  assert.equal(supplyNetworkVersionEndpoint, '/api/secured/supplynetwork/version');
  assert.equal(
    buildTransportationLanesEndpoint(' Version / A '),
    '/api/secured/supplynetwork/transportationline/get/Version%20%2F%20A',
  );
  assert.equal(
    buildTransportationLaneMaterialEndpoint(' Version / A '),
    '/api/secured/supplynetwork/transportationlinematerial/get/Version%20%2F%20A',
  );
  assert.equal(transportationLaneUpdateEndpoint, '/api/secured/supplynetwork/transportationline/update');
  assert.equal(transportationLaneDeleteEndpoint, '/api/secured/supplynetwork/transportationline/delete');
  assert.equal(transportationLaneMaterialUpdateEndpoint, '/api/secured/supplynetwork/transportationlinematerial/update');
  assert.equal(transportationLaneMaterialDeleteEndpoint, '/api/secured/supplynetwork/transportationlinematerial/delete');
  assert.match(source, /getSupplyNetworkVersions/);
  assert.match(source, /getBaseLanes/);
  assert.match(source, /getMaterialOverrides/);
  assert.match(source, /transportationLaneDeleteEndpoint, 'DELETE', \[primaryKey\]/);
  assert.match(source, /transportationLaneMaterialDeleteEndpoint, 'DELETE', \[primaryKey\]/);
});

test('Supply Network Configuration serializes only the supported base-lane and material-override fields', () => {
  const baseLaneRequest = buildTransportationLaneSaveRequest({
    primaryKey: { supplyNetworkVersionId: 'network-version', originLocationId: 'origin', destinationLocationId: 'destination' },
    priority: '7', leadTimeDays: '3.5', enableDiscontinuedMaterials: true, enablePresalesMaterials: false,
    enableAllMaterials: null, multipleMinimumTransferLotSizeUomId: 'uom', minimumTransferLotSize: '', multipleTransfer: '5', active: true,
  });
  const materialOverrideRequest = buildTransportationLaneMaterialSaveRequest({
    primaryKey: { supplyNetworkVersionId: 'network-version', originLocationId: 'origin', destinationLocationId: 'destination', materialId: 'material' },
    priority: '2', leadTimeDays: '1', multipleMinimumTransferLotSizeUomId: '', minimumTransferLotSize: '10', multipleTransfer: '', active: false,
  });

  assert.deepEqual(baseLaneRequest, {
    primaryKeyDto: { supplyNetworkVersionId: 'network-version', originLocationId: 'origin', destinationLocationId: 'destination' },
    priority: 7, leadTimeDays: 3.5, enableDiscontinuedMaterials: true, enablePresalesMaterials: false,
    enableAllMaterials: undefined, multipleMinimumTransferLotSizeUomId: 'uom', minimumTransferLotSize: undefined, multipleTransfer: 5, active: true,
  });
  assert.deepEqual(materialOverrideRequest, {
    primaryKeyDto: { supplyNetworkVersionId: 'network-version', originLocationId: 'origin', destinationLocationId: 'destination', materialId: 'material' },
    priority: 2, leadTimeDays: 1, multipleMinimumTransferLotSizeUomId: undefined, minimumTransferLotSize: 10, multipleTransfer: undefined, active: false,
  });
  assert.equal('distanceKm' in baseLaneRequest, false);
  assert.equal('distanceKm' in materialOverrideRequest, false);
});

test('Supply Network Configuration validates explicit identifiers and supported numeric inputs before mutation', () => {
  assert.throws(() => buildTransportationLanesEndpoint('   '), /supply network version id is required/i);
  assert.throws(() => buildTransportationLaneMaterialEndpoint('   '), /supply network version id is required/i);
  assert.throws(() => buildSupplyNetworkVersionSaveRequest({
    isNew: true, id: 'version', description: '', defaultRawMaterialOriginLocationId: '', defaultRawMaterialOriginLeadTimeDays: '-1',
  }), /zero or positive/i);
  assert.throws(() => buildTransportationLaneSaveRequest({
    primaryKey: { supplyNetworkVersionId: 'version', originLocationId: 'origin', destinationLocationId: 'destination' },
    priority: 'not-a-number', leadTimeDays: '', enableDiscontinuedMaterials: null, enablePresalesMaterials: null,
    enableAllMaterials: null, multipleMinimumTransferLotSizeUomId: '', minimumTransferLotSize: '', multipleTransfer: '', active: null,
  }), /priority must be a finite number/i);
});

test('Supply Network Configuration page loads each snapshot explicitly and reloads only the affected list after a unitary mutation', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/transportation-lanes/TransportationLanesInspectorPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /onMounted\(\(\) => \{ void loadSupplyNetworkVersions\(\); \}\)/);
  assert.match(source, /@click="void loadBaseLanes\(true\)"/);
  assert.match(source, /@click="void loadMaterialOverrides\(true\)"/);
  assert.match(source, /await transportationLanesInspectorService\.saveBaseLane\(snapshot\)/);
  assert.match(source, /await transportationLanesInspectorService\.saveMaterialOverride\(snapshot\)/);
  assert.match(source, /await transportationLanesInspectorService\.deleteBaseLane/);
  assert.match(source, /await transportationLanesInspectorService\.deleteMaterialOverride/);
  assert.match(source, /await loadBaseLanes\(true\)/);
  assert.match(source, /await loadMaterialOverrides\(true\)/);
  assert.match(source, /Version deletion is intentionally not exposed by the Community controller/);
});

test('Supply Network Configuration does not fetch master-data catalogs or expose Enterprise network features', async () => {
  const fs = await import('node:fs/promises');
  const [serviceSource, pageSource] = await Promise.all([
    fs.readFile(new URL('../src/modules/transportation-lanes/transportation-lanes.service.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/modules/transportation-lanes/TransportationLanesInspectorPage.vue', import.meta.url), 'utf8'),
  ]);

  const transportSource = `${serviceSource}\n${pageSource}`.toLowerCase();
  for (const forbiddenFragment of ['/api/secured/material', '/api/secured/location', '/data/', '/optimizer', '/planning/supply/execute']) {
    assert.equal(transportSource.includes(forbiddenFragment), false, `Supply Network Configuration transport must not use ${forbiddenFragment}`);
  }
  assert.match(pageSource, /No distance, freight, GIS, map, fleet, flows, optimizer, Data, XLSX, batch update, routing, or execution/i);
  assert.match(pageSource, /page never preloads materials or locations/i);
});
