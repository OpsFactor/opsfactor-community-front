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

  assert.equal(snapshot.historicalSalesDocumentType, 'Sell-out');
  assert.equal(snapshot.bucketSize, 'MONTHLY');
  assert.equal(snapshot.planningHorizonInPeriods, 12);
  assert.equal(snapshot.defaultDemandPlanningUomId, 'UNIT');
  assert.equal(draft.constrainPlanEditPeriods, false);
  assert.equal(snapshot.constrainPlanEditPeriods, false);
  assert.equal(snapshot.initialPlanEditPeriod, undefined);
  assert.equal(snapshot.finalPlanEditPeriod, undefined);

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

test('Demand Execution Profile editor normalizes fixed-horizon fields out of Community reads and writes', () => {
  const draft = buildCommunityDemandExecutionProfileDraft({
    id: 'DEMAND-OPEN',
    description: 'Open collaboration window',
    historicalSalesDocumentType: 'SELLOUT',
    bucketSize: 'Weekly',
    planningHorizonInPeriods: 6,
    constrainPlanEditPeriods: true,
    initialPlanEditPeriod: 1,
    finalPlanEditPeriod: 4,
    defaultDemandPlanningUomId: 'MT',
  });
  const snapshot = buildCommunityDemandExecutionProfileSaveRequest(draft);

  assert.equal(draft.initialPlanEditPeriod, '');
  assert.equal(draft.finalPlanEditPeriod, '');
  assert.equal(draft.constrainPlanEditPeriods, false);
  assert.equal(snapshot.constrainPlanEditPeriods, false);
  assert.equal(snapshot.initialPlanEditPeriod, undefined);
  assert.equal(snapshot.finalPlanEditPeriod, undefined);
});

test('Demand Execution Profile editor restores canonical selection and Community create/copy/save actions', () => {
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
  assert.match(page, /TaskPageLayout/);
  assert.match(page, /title="Profile selection"/);
  assert.match(page, /<template #actions>\s*<div class="flex flex-wrap justify-end gap-3">[\s\S]*?Copy profile[\s\S]*?Save profile/);
  assert.match(page, /xl:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(page, />\s*New profile\s*</);
  assert.match(page, />\s*Copy profile\s*</);
  assert.match(page, /Save profile/);
  assert.match(page, /createProfile/);
  assert.match(page, /copyProfile/);
  assert.match(page, /await loadProfiles\(snapshot\.id\)/);
  assert.match(page, /title="General parameters"/);
  assert.match(page, /title="Forecast and collaboration"/);
  assert.match(page, /title="Auto-fit execution"/);
  assert.doesNotMatch(page, /title="Current profile"/);
  assert.doesNotMatch(page, /title="Related pages"/);
  assert.doesNotMatch(page, /Review save/);
  assert.match(page, /md:grid-cols-2 xl:grid-cols-4/);
  assert.match(page, /xl:grid-cols-2 xl:items-start/);
  assert.match(page, /Material aggregation level for MAPE/);
  assert.match(page, /Location aggregation level for MAPE/);
  assert.match(page, /Default auto-fit configuration/);
  assert.match(page, /title="Auto-fit execution"[\s\S]*?OfxEditionAvailabilityMark/);
  assert.doesNotMatch(page, /Auto-fit objective function/);
  assert.doesNotMatch(page, /Tree pruning error/);
  assert.match(page, /label="Historical sales document type"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(page, /label="Location aggregation level for MAPE"[\s\S]*?\{ label: 'Consolidated', value: '' \}/);
  assert.match(page, /label="Constrain manual inputs to a fixed horizon"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.doesNotMatch(page, /v-model="draft\.constrainPlanEditPeriods"/);
  assert.match(page, /locked-label="Pro \/ Enterprise"/);
  assert.match(page, /v-model="draft\.bucketSize"[^>]+OfxSelectField|OfxSelectField[^>]+v-model="draft\.bucketSize"/);
  assert.match(page, /v-model="draft\.defaultDemandPlanningUomId"[^>]+OfxSelectField|OfxSelectField[^>]+v-model="draft\.defaultDemandPlanningUomId"/);
  assert.match(page, /\{ label: 'Auto-fit', value: 'None' \}/);
  assert.doesNotMatch(page, /New profile\s*<OfxEditionAvailabilityMark/);
  assert.doesNotMatch(page, /Copy profile\s*<OfxEditionAvailabilityMark/);

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
