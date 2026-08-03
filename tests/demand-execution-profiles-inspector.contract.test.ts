import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCommunityDemandExecutionProfileDraft,
  buildCommunityDemandExecutionProfileSaveRequest,
  DEMAND_EXECUTION_PROFILE_ENDPOINT,
} from '../src/modules/demand-execution-profiles/demand-execution-profiles.types.ts';

test('Demand Execution Profile editor sends only the existing Community fields and forces sell-out', () => {
  const draft = buildCommunityDemandExecutionProfileDraft({
    id: 'DEMAND-01',
    description: 'Operational demand profile',
    historicalSalesDocumentType: 'SELLIN',
    bucketSize: 'MONTHLY',
    planningHorizonInPeriods: 12,
    constrainPlanEditPeriods: true,
    initialPlanEditPeriod: 0,
    finalPlanEditPeriod: 2,
    defaultDemandPlanningUomId: 'UNIT',
  });
  const snapshot = buildCommunityDemandExecutionProfileSaveRequest(draft);

  assert.equal(snapshot.historicalSalesDocumentType, 'SELLOUT');
  assert.equal(snapshot.bucketSize, 'MONTHLY');
  assert.equal(snapshot.planningHorizonInPeriods, 12);
  assert.equal(snapshot.defaultDemandPlanningUomId, 'UNIT');

  for (const enterpriseField of [
    'mapeMaterialAggregationLevelId',
    'defaultAutoTunedDemandPlanConfigurationId',
    'autofitModelType',
    'regressionTreeObjectiveFunction',
  ]) {
    assert.equal(enterpriseField in snapshot, false, `${enterpriseField} must remain outside Community save.`);
  }
});

test('Demand Execution Profile editor validates the positive planning horizon before POST', () => {
  const draft = buildCommunityDemandExecutionProfileDraft({
    id: 'DEMAND-01',
    description: 'Profile',
    historicalSalesDocumentType: 'SELLOUT',
    bucketSize: 'MONTHLY',
    planningHorizonInPeriods: 12,
    constrainPlanEditPeriods: false,
    initialPlanEditPeriod: null,
    finalPlanEditPeriod: null,
    defaultDemandPlanningUomId: null,
  });
  draft.planningHorizonInPeriods = '0';

  assert.throws(
    () => buildCommunityDemandExecutionProfileSaveRequest(draft),
    /positive integer/i,
  );
});

test('Demand Execution Profile editor uses one existing GET and one confirmed POST with an authoritative reload', () => {
  const service = readFileSync(
    new URL('../src/modules/demand-execution-profiles/demand-execution-profiles.service.ts', import.meta.url),
    'utf8',
  );
  const page = readFileSync(
    new URL('../src/modules/demand-execution-profiles/DemandExecutionProfilesInspectorPage.vue', import.meta.url),
    'utf8',
  );

  assert.equal(DEMAND_EXECUTION_PROFILE_ENDPOINT, '/api/secured/demandplanexecutionprofile');
  assert.match(service, /httpClient\.request<CommunityDemandExecutionProfile\[\]>/);
  assert.match(service, /httpClient\.request<string>\(DEMAND_EXECUTION_PROFILE_ENDPOINT/);
  assert.match(service, /method: 'POST'/);
  assert.match(page, /Save Demand profile snapshot\?/);
  assert.match(page, /await loadProfiles\(true\)/);
  assert.match(page, /pendingSaveSnapshot/);
  assert.match(page, /TaskPageLayout/);
  assert.match(page, /title="Profile catalog"/);
  assert.match(page, /title="General parameters"/);
  assert.match(page, /title="Forecast and collaboration"/);
  assert.match(page, /title="Auto-fit execution"/);
  assert.match(page, /title="Current profile"/);
  assert.match(page, /title="Related pages"/);
  assert.match(page, /md:grid-cols-2 xl:grid-cols-4/);
  assert.match(page, /xl:grid-cols-\[minmax\(0,1\.8fr\)_minmax\(300px,0\.95fr\)\]/);
  assert.match(page, /Material aggregation level for MAPE/);
  assert.match(page, /Location aggregation level for MAPE/);
  assert.match(page, /Default auto-fit configuration/);
  assert.match(page, /Auto-fit objective function/);
  assert.match(page, /Tree pruning error/);
  assert.match(page, /locked-label="Enterprise"/);
  assert.match(page, /New profile · Enterprise/);

  for (const forbiddenTransport of [
    '/mape',
    '/autofit',
    '/regression',
    '/sellin',
    '/data/',
    '/unitofmeasure/',
    '/planning/demand/generate',
  ]) {
    assert.equal(service.includes(forbiddenTransport), false, `Transport must not use ${forbiddenTransport}`);
  }
});
