import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCommunityClusterOperationalParameterDraft,
  buildCommunityClusterOperationalParameterSaveRequest,
  buildCommunityMaterialLocationOperationalParameterDraft,
  buildCommunityMaterialLocationOperationalParameterSaveRequest,
  buildCommunityMaterialOperationalParameterDraft,
  buildCommunityMaterialOperationalParameterSaveRequest,
  buildMaterialLocationOperationalParametersEndpoint,
  clusterOperationalParametersEndpoint,
  materialOperationalParametersEndpoint,
  operationalParameterLocationsEndpoint,
} from '../src/modules/operational-planning-parameters/operational-planning-parameters.types.ts';

test('Operational Planning Parameters uses only the existing three Community parameter contracts and explicit Location read', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/operational-planning-parameters/operational-planning-parameters.service.ts', import.meta.url),
    'utf8',
  ));

  assert.equal(clusterOperationalParametersEndpoint, '/api/secured/configs/parametros/clusterLocation');
  assert.equal(materialOperationalParametersEndpoint, '/api/secured/configs/parametros/material');
  assert.equal(operationalParameterLocationsEndpoint, '/api/secured/configs/parametros/locationList');
  assert.equal(
    buildMaterialLocationOperationalParametersEndpoint(' Location / A '),
    '/api/secured/configs/parametros/materialLocation/Location%20%2F%20A',
  );
  assert.match(source, /httpClient\.request<boolean>/);
  assert.match(source, /saved !== true/);
  assert.match(source, /method: 'POST'/);
});

test('Operational Planning Parameters forces Pricing false and retains only persisted Material fields', () => {
  const clusterRequest = buildCommunityClusterOperationalParameterSaveRequest(
    buildCommunityClusterOperationalParameterDraft({
      id: 10, clusterLocations: 'Cluster A', clusterLocationsID: 11, planejaDP: true, planejaPricing: true,
    }),
  );
  const materialRequest = buildCommunityMaterialOperationalParameterSaveRequest(
    buildCommunityMaterialOperationalParameterDraft({
      id: 'MAT-01', descricao: 'Material A', ativo: false, foraLinha: true, novo: true,
    }),
  );

  assert.deepEqual(clusterRequest, {
    id: 10, clusterLocations: 'Cluster A', clusterLocationsID: 11, planejaDP: true, planejaPricing: false,
  });
  assert.deepEqual(materialRequest, { id: 'MAT-01', descricao: 'Material A', ativo: false });
  assert.equal('foraLinha' in materialRequest, false);
  assert.equal('novo' in materialRequest, false);
});

test('Operational Planning Parameters requires an explicit Location and serializes only supported Material-Location overrides', () => {
  assert.throws(
    () => buildMaterialLocationOperationalParametersEndpoint('   '),
    /location id is required/i,
  );

  const request = buildCommunityMaterialLocationOperationalParameterSaveRequest(
    buildCommunityMaterialLocationOperationalParameterDraft({
      locationID: 'LOC-01', location: 'Location A', materialID: 'MAT-01', material: 'Material A',
      productionMinimumQuantity: 0, productionMultipleQuantity: 5, foraLinha: true, novo: true, inativo: false,
      lifecycleStage: 'ACTIVE', introductionDate: '2026-07-22T10:30:00', discontinuationDate: null,
      frozenHorizonDpInDays: 0, defaultUomId: 'EA', productionMinimumMultipleUomId: 'EA',
    }),
  );

  assert.deepEqual(request, {
    locationID: 'LOC-01', materialID: 'MAT-01', productionMinimumQuantity: 0, productionMultipleQuantity: 5,
    inativo: false, lifecycleStage: 'ACTIVE', introductionDate: '2026-07-22T10:30', discontinuationDate: undefined,
    frozenHorizonDpInDays: 0, defaultUomId: 'EA', productionMinimumMultipleUomId: 'EA',
  });
  assert.equal('foraLinha' in request, false);
  assert.equal('novo' in request, false);
});

test('Operational Planning Parameters validates values that the Community backend needs for calculation', () => {
  const validDraft = {
    locationID: 'LOC-01', location: 'Location A', materialID: 'MAT-01', material: 'Material A',
    productionMinimumQuantity: '', productionMultipleQuantity: '', inativo: null, lifecycleStage: '',
    introductionDate: '', discontinuationDate: '', frozenHorizonDpInDays: '', defaultUomId: '', productionMinimumMultipleUomId: '',
  };

  assert.throws(
    () => buildCommunityMaterialLocationOperationalParameterSaveRequest({ ...validDraft, productionMinimumQuantity: '-1' }),
    /minimum quantity must be non-negative/i,
  );
  assert.throws(
    () => buildCommunityMaterialLocationOperationalParameterSaveRequest({ ...validDraft, productionMultipleQuantity: '0' }),
    /multiple quantity must be positive/i,
  );
  assert.throws(
    () => buildCommunityMaterialLocationOperationalParameterSaveRequest({ ...validDraft, frozenHorizonDpInDays: '1.5' }),
    /non-negative integer/i,
  );
});

test('Operational Planning Parameters page has independent explicit loads, confirmation, single-flight and authoritative reload', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/operational-planning-parameters/OperationalPlanningParametersPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /loadClusterParameters/);
  assert.match(source, /loadMaterialParameters/);
  assert.match(source, /loadLocations/);
  assert.match(source, /loadMaterialLocationParameters/);
  assert.match(source, /await operationalPlanningParametersService\.saveClusterParameter/);
  assert.match(source, /await operationalPlanningParametersService\.saveMaterialParameter/);
  assert.match(source, /await operationalPlanningParametersService\.saveMaterialLocationParameter/);
  assert.match(source, /await loadMaterialLocationParameters\(true\)/);
  assert.match(source, /const locationId = selectedLocationId\.value\.trim\(\)/);
  assert.match(source, /@change="handleLocationSelectionChanged"/);
  assert.match(source, /No Data upload\/download, bulk operation, Location CRUD, characteristics,[\s\S]*optimizer or planning execution is available here/);
});
