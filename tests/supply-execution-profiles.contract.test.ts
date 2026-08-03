import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCommunitySupplyExecutionProfileDraft,
  buildCommunitySupplyExecutionProfileSaveRequest,
  sortSupplyExecutionProfiles,
  SUPPLY_EXECUTION_PROFILE_ENDPOINT,
} from '../src/modules/supply-execution-profiles/supply-execution-profiles.types.ts';

test('Supply Execution Profile editor builds one Community snapshot with fixed heuristic invariants', () => {
  const draft = buildCommunitySupplyExecutionProfileDraft({
    id: 'SUPPLY-01',
    description: 'Operational heuristic profile',
    planHorizonInDays: 90,
    generatePlannedInboundOrders: true,
    generatePlannedProductionOrders: true,
    automaticallyRunConstrainedPlan: false,
    executionModel: 'OPTIMIZER',
    productiveCapacityType: 'TURNOS',
    directDemandFairShare: false,
    heuristicUnconstrainedPlanCapacityLeveling: null,
    inventoryPolicyIdSet: ['IP-02', 'IP-01'],
  });
  const snapshot = buildCommunitySupplyExecutionProfileSaveRequest(draft);

  assert.equal(snapshot.executionModel, 'HEURISTICO');
  assert.equal(snapshot.considerForecastForMto, true);
  assert.equal(snapshot.automaticallyRunConstrainedPlan, true);
  assert.equal(snapshot.productiveCapacityType, 'HORAS_POR_DIA');
  assert.equal(snapshot.directDemandFairShare, true);
  assert.equal(snapshot.heuristicUnconstrainedPlanCapacityLeveling, false);
  assert.deepEqual(snapshot.inventoryPolicyIdSet, ['IP-02', 'IP-01']);

  for (const enterpriseField of [
    'materialFilterId',
    'allocateTransfersInFleets',
    'enableLineSequencing',
    'generateProductionScheduling',
    'considerStorageCost',
    'considerSellinOrdersFuture',
    'productionResourceConfigurationSet',
    'hardOccupationRate',
  ]) {
    assert.equal(enterpriseField in snapshot, false, `${enterpriseField} must remain outside Community save.`);
  }
});

test('Supply Execution Profile editor preserves the explicit Community capacity-leveling opt-in', () => {
  const draft = buildCommunitySupplyExecutionProfileDraft({
    id: 'SUPPLY-01',
    description: 'Operational heuristic profile',
    heuristicUnconstrainedPlanCapacityLeveling: true,
  });

  const snapshot = buildCommunitySupplyExecutionProfileSaveRequest(draft);

  assert.equal(draft.heuristicUnconstrainedPlanCapacityLeveling, true);
  assert.equal(snapshot.heuristicUnconstrainedPlanCapacityLeveling, true);
});

test('Supply Execution Profile editor rejects duplicated Inventory Policy IDs before POST', () => {
  const draft = buildCommunitySupplyExecutionProfileDraft({ id: 'SUPPLY-01', description: 'Profile' });
  draft.inventoryPolicyIds = 'IP-01\nIP-01';

  assert.throws(
    () => buildCommunitySupplyExecutionProfileSaveRequest(draft),
    /cannot be duplicated/i,
  );
});

test('Supply Execution Profile editor uses the existing Community GET and one confirmed POST endpoint', () => {
  const service = readFileSync(
    new URL('../src/modules/supply-execution-profiles/supply-execution-profiles.service.ts', import.meta.url),
    'utf8',
  );
  const page = readFileSync(
    new URL('../src/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue', import.meta.url),
    'utf8',
  );

  assert.equal(SUPPLY_EXECUTION_PROFILE_ENDPOINT, '/api/secured/supplyplanexecutionprofile');
  assert.match(service, /httpClient\.request<CommunitySupplyExecutionProfile\[\]>/);
  assert.match(service, /httpClient\.request<string>\(SUPPLY_EXECUTION_PROFILE_ENDPOINT/);
  assert.match(service, /method: 'POST'/);
  assert.match(page, /Save operational profile snapshot\?/);
  assert.match(page, /await loadProfiles\(true\)/);
  assert.match(page, /pendingSaveSnapshot/);
  assert.match(page, /TaskPageLayout/);
  assert.match(page, /title="Supply Chain Execution Profiles"/);
  assert.match(page, /title="Profile selection"/);
  assert.match(page, /New profile/);
  assert.match(page, /Copy profile/);
  assert.match(page, /title="Identity and planning scope"/);
  assert.match(page, /title="Execution engine"/);
  assert.match(page, /CP-SAT continuous-variable precision/);
  assert.match(page, /title="Inventory policy and stock model"/);
  assert.match(page, /General/);
  assert.match(page, /Unconstrained Plan/);
  assert.match(page, /Replenishment/);
  assert.match(page, /Demand and Allocation/);
  assert.match(page, /Costs and Objective/);
  assert.match(page, /Process Chain/);
  assert.match(page, /Location Overrides/);
  assert.match(page, /title="Supply generation"/);
  assert.match(page, /title="Firm orders"/);
  assert.match(page, /title="Transfer and purchase rounding"/);
  assert.match(page, /title="Outputs and persistence"/);
  assert.match(page, /title="Demand inputs and reconciliation"/);
  assert.match(page, /title="Stocking permissions"/);
  assert.match(page, /title="Demand behavior"/);
  assert.match(page, /title="Objective Function Sales Component"/);
  assert.match(page, /title="Temporal objective weighting"/);
  assert.match(page, /title="Customer and safety-stock prioritization"/);
  assert.match(page, /title="Location-level configuration"/);
  assert.match(page, /title="Capacity and logistics constraints"/);
  assert.match(page, /title="Inbound"/);
  assert.match(page, /title="Outbound"/);
  assert.match(page, /title="Lead Time"/);
  assert.match(page, /title="Margin"/);
  assert.match(page, /title="Constraint Diagnostics"/);
  assert.match(page, /title="Production-resource exceptions"/);
  assert.match(page, /title="Inventory starting point"/);
  assert.match(page, /title="Process chain steps"/);
  assert.match(page, /title="Working capital and policy costs"/);
  assert.match(page, /title="Variable and fixed costs"/);
  assert.match(page, /title="Logistics curves and taxes"/);
  assert.match(page, /title="Unmet demand penalties"/);
  assert.match(page, /title="Fair share and stock smoothing"/);
  assert.match(page, /title="Soft targets"/);

  for (const forbiddenTransport of [
    '/optimizer',
    '/processchain',
    '/data/',
    '/planning/supply/execute',
    '/material/',
    '/location/',
  ]) {
    assert.equal(service.includes(forbiddenTransport), false, `Transport must not use ${forbiddenTransport}`);
  }
});

test('Supply Execution Profiles catalog remains deterministically ordered without mutating its server snapshot', () => {
  const profiles = [
    { id: 'PROFILE-B', description: 'Zulu' },
    { id: 'PROFILE-A', description: 'Zulu' },
    { id: 'PROFILE-A', description: 'Alpha' },
  ];

  const sortedProfiles = sortSupplyExecutionProfiles(profiles);

  assert.deepEqual(sortedProfiles.map((profile) => `${profile.id}/${profile.description}`), [
    'PROFILE-A/Alpha',
    'PROFILE-A/Zulu',
    'PROFILE-B/Zulu',
  ]);
  assert.equal(profiles[0].id, 'PROFILE-B', 'The raw server snapshot must not be mutated.');
});
