import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDeploymentOperationalQuery,
  buildDeploymentOperationalUpdate,
  DEPLOYMENT_OPERATIONAL_ENDPOINTS,
} from '../src/modules/deployment/deployment-operational.types.ts';

test('Community Deployment uses only the operational read and inbound update endpoints', () => {
  assert.equal(DEPLOYMENT_OPERATIONAL_ENDPOINTS.line, '/api/secured/planning/supply/deployment');
  assert.equal(DEPLOYMENT_OPERATIONAL_ENDPOINTS.update, '/api/secured/planning/supply/deployment/update');
});

test('Community Deployment read identifies exactly one physical route with four scalar parameters', () => {
  const query = buildDeploymentOperationalQuery({
    supplyPlanId: 19,
    originLocationId: 'ORIGIN',
    destinationLocationId: 'DESTINATION',
    materialId: 'MATERIAL',
  });

  assert.deepEqual([...query.entries()], [
    ['supplyPlanId', '19'],
    ['originLocationId', 'ORIGIN'],
    ['destinationLocationId', 'DESTINATION'],
    ['materialId', 'MATERIAL'],
  ]);
  assert.equal(query.has('uomId'), false);
  assert.equal(query.has('workPlan'), false);
  assert.equal(query.has('period'), false);
});

test('Community Deployment update emits only four route identifiers and planned inbound quantity', () => {
  const update = buildDeploymentOperationalUpdate({
    supplyPlanId: 19,
    originLocationId: 'ORIGIN',
    destinationLocationId: 'DESTINATION',
    materialId: 'MATERIAL',
  }, 12.5);

  assert.deepEqual(update, {
    supplyPlanId: 19,
    originLocationId: 'ORIGIN',
    destinationLocationId: 'DESTINATION',
    materialId: 'MATERIAL',
    plannedInboundQuantity: 12.5,
  });
  assert.equal('firmQuantity' in update, false);
  assert.equal('stockDaysAtDelivery' in update, false);
  assert.equal('unitOfMeasureId' in update, false);
});
