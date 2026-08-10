import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  COMMUNITY_EDITABLE_SUPPLY_EXECUTION_PROFILE_FIELDS,
  toCommunitySupplyExecutionProfilePayload,
} from '../src/modules/supply-execution-profiles/community-supply-execution-profile.contract.ts';

test('Supply Execution Profile adapter preserves Community fields and fixes heuristic invariants', () => {

  const payload = toCommunitySupplyExecutionProfilePayload({
    id: ' SUPPLY-01 ',
    description: ' Operational heuristic profile ',
    planHorizonInDays: 90,
    generatePlannedInboundOrders: true,
    generatePlannedProductionOrders: true,
    generateUnconstrainedPlan: false,
    heuristicUnconstrainedPlanCapacityLeveling: true,
    consolidateClientDemand: true,
    inventoryPolicyIdSet: ['IP-02', 'IP-01'],
    executionModel: 'Optimizer',
    productiveCapacityType: 'Shift Allocation / Day',
    directDemandFairShare: false,
    executeSupplyPlanForAllLocations: false,
    materialFilterId: 'FILTER-01',
    considerStorageCost: true,
    productionResourceConfigurationSet: [{ productionResourceId: 'LINE-01' }],
  });

  assert.equal(payload.id, 'SUPPLY-01');
  assert.equal(payload.description, 'Operational heuristic profile');
  assert.equal(payload.executionModel, 'Heuristic');
  assert.equal(payload.considerForecastForMto, true);
  assert.equal(payload.automaticallyRunConstrainedPlan, true);
  assert.equal(payload.productiveCapacityType, 'Total Hours / Day');
  assert.equal(payload.directDemandFairShare, true);
  assert.equal(payload.executeSupplyPlanForAllLocations, true);
  assert.deepEqual(payload.inventoryPolicyIdSet, ['IP-02', 'IP-01']);

  for (const enterpriseField of [
    'materialFilterId',
    'allocateTransfersInFleets',
    'enableLineSequencing',
    'generateProductionScheduling',
    'considerStorageCost',
    'considerSellinOrdersFuture',
    'productionResourceConfigurationSet',
    'hardOccupationRate',
    'generateUnconstrainedPlan',
    'heuristicUnconstrainedPlanCapacityLeveling',
    'ignoreProductionConstraintsForUnconstrainedPlan',
    'consolidateClientDemand',
    'demandConsolidationMode',
  ]) {
    assert.equal(
      enterpriseField in payload,
      false,
      `${enterpriseField} must remain outside the Community request.`,
    );
  }

});

test('Supply Execution Profile adapter rejects a blank persisted identity', () => {

  assert.throws(
    () => toCommunitySupplyExecutionProfilePayload({ id: '   ' }),
    /profile id is required/i,
  );

});

test('Supply Execution Profile adapter declares the complete editable Community field set', () => {

  assert.deepEqual(COMMUNITY_EDITABLE_SUPPLY_EXECUTION_PROFILE_FIELDS, [
    'planHorizonInDays',
    'generatePlannedInboundOrders',
    'generatePlannedProductionOrders',
    'generatePlannedInboundOrdersWhenProductionIsViable',
    'alwaysUseDrp',
    'roundRequisitionsByMoqAndLotSize',
    'roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods',
    'expeditionPeriodsToRoundRequisitionsByMoqAndLotSize',
    'roundProductionByMoqAndLotSize',
    'roundProductionByMoqAndLotSizeForAllPeriods',
    'periodsToRoundProductionByMoqAndLotSize',
    'considerInitialStock',
    'saveInventoryPlan',
    'considerProductionConstraints',
    'targetStockModel',
    'planTypeForWorkVersion',
  ]);

});

test('Supply Execution Profiles uses the canonical Planning Front composition with a Community API boundary', () => {

  const service = readFileSync(
    new URL('../src/modules/supply-execution-profiles/supply-execution-profiles.service.ts', import.meta.url),
    'utf8',
  );
  const page = readFileSync(
    new URL('../src/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue', import.meta.url),
    'utf8',
  );

  assert.match(service, /requestJson<SupplyExecutionProfile\[\]>\('\/api\/secured\/supplyplanexecutionprofile'\)/);
  assert.match(service, /httpRequest\('\/api\/secured\/supplyplanexecutionprofile'/);
  assert.match(service, /const communityPayload = toCommunitySupplyExecutionProfilePayload\(profile\)/);
  assert.match(service, /body: JSON\.stringify\(communityPayload\)/);
  assert.match(service, /'\/api\/secured\/configs\/inventorypolicy'/);

  for (const forbiddenTransport of [
    '/api/secured/supplyplanexecutionprofile/location',
    '/api/secured/supplyplanexecutionprofile/processchainsteps',
    '/api/secured/dataupload/json/',
    '/api/secured/logistics/costcurves',
    '/planning/supply/execute',
  ]) {
    assert.equal(service.includes(forbiddenTransport), false, `Transport must not use ${forbiddenTransport}`);
  }

  assert.ok(page.split('\n').length > 2_300, 'The canonical Planning Front form must not be replaced by a reduced inspector.');
  assert.match(page, /title="Supply Chain Execution Profiles"/);
  assert.match(page, /<OfxSectionCard title="Profile selection">/);
  assert.match(page, /Close new profile' : 'New profile/);
  assert.match(page, />\s*Copy profile\s*</);
  assert.match(page, /Saving\.\.\.' : 'Save profile/);
  assert.match(page, /<OfxSelectField[\s\S]*?label="Profile"/);
  assert.match(page, /title="Identity and planning scope"/);
  assert.match(page, /title="Execution engine"/);
  assert.match(page, /title="Inventory policy and stock model"/);
  assert.match(page, /title="Production Capacity Leveling"/);
  assert.match(page, /title="Demand inputs and reconciliation"/);
  assert.match(page, /id: 'unconstrained',[\s\S]*?requiredEdition: 'Pro \/ Enterprise'/);
  assert.match(page, /id: 'demand',[\s\S]*?requiredEdition: 'Pro \/ Enterprise'/);
  assert.match(page, /heuristicUnconstrainedPlanCapacityLeveling[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(page, /current\.consolidateClientDemand[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(page, /title="Capacity and logistics constraints"/);
  assert.match(page, /title="Production-resource exceptions"/);
  assert.match(page, /title="Inventory starting point"/);
  assert.match(page, /title="Location-level configuration"/);
  assert.match(page, /locked-label="Pro \/ Enterprise"/);
  assert.match(page, /requiredEdition: 'Pro \/ Enterprise'/);
  assert.doesNotMatch(page, /Refresh catalog/);
  assert.doesNotMatch(page, /Review save/);

});
