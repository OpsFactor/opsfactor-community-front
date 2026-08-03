import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildDemandPlanningUomConversionGapsEndpoint,
  buildDeploymentUomConversionGapsEndpoint,
  buildMaterialUomConversionDetailEndpoint,
  buildSupplyPlanningUomConversionGapsEndpoint,
  getReferencePeriodFormat,
  isValidReferencePeriod,
  UOM_CONVERSION_GAP_ENDPOINTS,
} from '../src/modules/uom-conversion-gaps/uom-conversion-gaps.types.ts';

test('Community UOM conversion gap diagnostics use only the canonical selectors and three diagnostic routes', () => {
  assert.deepEqual(UOM_CONVERSION_GAP_ENDPOINTS, {
    demandPlanningProfiles: '/api/secured/demandplanexecutionprofile',
    supplyPlanningProfiles: '/api/secured/supplyplanexecutionprofile',
    supplyNetworkVersions: '/api/secured/supplynetwork/version',
    demandPlans: '/api/secured/planning/demand/demandplan',
    supplyPlans: '/api/secured/planning/supply',
  });
  assert.equal(
    buildDemandPlanningUomConversionGapsEndpoint('dp / profile', '202601'),
    '/api/secured/alerts/uomconversiongaps/dp/dp%20%2F%20profile/202601',
  );
  assert.equal(
    buildSupplyPlanningUomConversionGapsEndpoint({
      referencePeriod: '2026-01-01',
      bucketSize: 'Daily',
      supplyNetworkVersionId: 'network / 1',
      supplyPlanningExecutionProfileId: 'snp / profile',
      demandPlanId: 42,
    }),
    '/api/secured/alerts/uomconversiongaps/snp/2026-01-01/Daily/network%20%2F%201/snp%20%2F%20profile/42',
  );
  assert.equal(
    buildDeploymentUomConversionGapsEndpoint(17),
    '/api/secured/alerts/uomconversiongaps/deployment/17',
  );
});

test('Community UOM conversion gaps validate reference syntax from the selected bucket without inferring SNP inputs', () => {
  assert.equal(getReferencePeriodFormat('Monthly'), 'YYYYMM');
  assert.equal(isValidReferencePeriod('202601', 'Monthly'), true);
  assert.equal(isValidReferencePeriod('202613', 'Monthly'), false);
  assert.equal(isValidReferencePeriod('2026-02-29', 'Daily'), false);
  assert.throws(() => buildSupplyPlanningUomConversionGapsEndpoint({
    referencePeriod: '202601',
    bucketSize: 'Monthly',
    supplyNetworkVersionId: '',
    supplyPlanningExecutionProfileId: 'snp',
    demandPlanId: 1,
  }), /Supply Network/);
});

test('Community UOM conversion gap detail is material-specific and never uses the global overload', () => {
  assert.equal(buildMaterialUomConversionDetailEndpoint({
    materialId: 'MATERIAL / 1',
    originUnitOfMeasure: 'KG',
    targetUnitOfMeasure: 'TON',
  }), '/api/secured/unitofmeasure/conversiondetail/MATERIAL%20%2F%201/KG/TON');
  assert.throws(() => buildMaterialUomConversionDetailEndpoint({ materialId: 'MATERIAL', originUnitOfMeasure: 'KG' }), /target UOM/);

  const service = readFileSync(new URL('../src/modules/uom-conversion-gaps/uom-conversion-gaps.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/uom-conversion-gaps/UomConversionGapsPage.vue', import.meta.url), 'utf8');

  assert.match(service, /getMaterialUomConversionDetail/);
  assert.doesNotMatch(service, /method: 'POST'|method: 'PUT'|method: 'DELETE'/);
  assert.match(page, /@click="diagnose"/);
  assert.match(page, /@click="openConversionDetail\(gap\)"/);
  assert.match(page, /SNP does not infer/);
  assert.doesNotMatch(service, /conversiondetail\/\$\{encodeURIComponent\(originUomId\)\}/);
  assert.doesNotMatch(page, /upload|download|CSV/i);
});
