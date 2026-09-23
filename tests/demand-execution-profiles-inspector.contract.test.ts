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
    calendarProfileId: 'CALENDAR-MONTHLY',
    planningHorizonInPeriods: 12,
    constrainPlanEditPeriods: true,
    initialPlanEditPeriod: 0,
    finalPlanEditPeriod: 2,
    defaultDemandPlanningUomId: 'UNIT',
  });
  const snapshot = buildCommunityDemandExecutionProfileSaveRequest(draft);

  assert.equal(snapshot.historicalSalesDocumentType, 'Sell-out');
  assert.equal(snapshot.calendarProfileId, 'CALENDAR-MONTHLY');
  assert.equal('bucketSize' in snapshot, false);
  assert.equal('planningHorizonInPeriods' in snapshot, false);
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

test('Demand Execution Profile editor requires the linked calendar before POST', () => {
  const draft = buildCommunityDemandExecutionProfileDraft({
    id: 'DEMAND-01',
    description: 'Profile',
    historicalSalesDocumentType: 'SELLOUT',
    bucketSize: 'MONTHLY',
    calendarProfileId: 'CALENDAR-MONTHLY',
    planningHorizonInPeriods: 12,
    constrainPlanEditPeriods: false,
    initialPlanEditPeriod: null,
    finalPlanEditPeriod: null,
    defaultDemandPlanningUomId: null,
  });
  draft.calendarProfileId = '';

  assert.throws(
    () => buildCommunityDemandExecutionProfileSaveRequest(draft),
    /calendar profile is required/i,
  );
});

test('Demand Execution Profile editor normalizes fixed-horizon fields out of Community reads and writes', () => {
  const draft = buildCommunityDemandExecutionProfileDraft({
    id: 'DEMAND-OPEN',
    description: 'Open collaboration window',
    historicalSalesDocumentType: 'SELLOUT',
    bucketSize: 'Weekly',
    calendarProfileId: 'CALENDAR-WEEKLY',
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
  assert.match(page, /<template #actions>\s*<div class="flex flex-wrap justify-end gap-2 items-center">[\s\S]*?New profile[\s\S]*?Copy profile[\s\S]*?Save profile/);
  assert.doesNotMatch(page, /xl:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(page, />\s*New profile\s*</);
  assert.match(page, />\s*Copy profile\s*</);
  assert.match(page, /Save profile/);
  assert.match(page, /createProfile/);
  assert.match(page, /copyProfile/);
  assert.match(page, /await loadProfiles\(snapshot\.id\)/);
  assert.match(page, /title="Profile identity"[\s\S]*?label="Profile id"[\s\S]*?label="Profile description"[\s\S]*?title="Planning calendar"[\s\S]*?title="Demand analysis"/);
  assert.match(page, /title="Forecast and collaboration"/);
  assert.match(page, /title="Auto-fit execution"/);
  assert.doesNotMatch(page, /title="Current profile"/);
  assert.doesNotMatch(page, /title="Related pages"/);
  assert.doesNotMatch(page, /Review save/);
  assert.doesNotMatch(page, /v-for="item in summaryCards"/);
  assert.match(page, /title="Planning calendar"[\s\S]*?<template #label-action>[\s\S]*?to="\/configuration\/calendars"/);
  assert.match(page, /<dl v-if="selectedCalendar"[\s\S]*?selectedCalendar\.baseBucketSize[\s\S]*?selectedCalendar\.numberOfBasePeriods/);
  assert.doesNotMatch(page, /v-model="draft\.(bucketSize|planningHorizonInPeriods)"/);
  assert.match(page, /xl:grid-cols-2 xl:items-start/);
  assert.match(page, /Material aggregation level for MAPE/);
  assert.match(page, /Location aggregation level for MAPE/);
  assert.match(page, /Default auto-fit configuration/);
  assert.match(page, /title="Auto-fit execution"[\s\S]*?OfxEditionAvailabilityMark/);
  assert.doesNotMatch(page, /Auto-fit objective function/);
  assert.doesNotMatch(page, /Tree pruning error/);
  assert.match(page, /label="Historical sales document type"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(page, /label="Location aggregation level for MAPE"[\s\S]*?\{ label: 'Consolidated', value: '' \}/);
  assert.match(page, /label="Limit manual inputs to an edit window"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.doesNotMatch(page, /v-model="draft\.constrainPlanEditPeriods"/);
  assert.match(page, /locked-label="Pro \/ Enterprise"/);
  assert.match(page, /v-model="draft\.calendarProfileId"[^>]+OfxSelectField|OfxSelectField[^>]+v-model="draft\.calendarProfileId"/);
  assert.match(page, /v-model="draft\.defaultDemandPlanningUomId"[^>]+OfxSelectField|OfxSelectField[^>]+v-model="draft\.defaultDemandPlanningUomId"/);
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
