import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityRoot = new URL('../', import.meta.url);
const enterpriseRoot = new URL('../../opsfactor-enterprise-front/', import.meta.url);

function readCommunity(relativePath: string) {
  return readFileSync(new URL(relativePath, communityRoot), 'utf8');
}

function readEnterprise(relativePath: string) {
  return readFileSync(new URL(relativePath, enterpriseRoot), 'utf8');
}

test('Community owns Process Status normalization while edition hosts inject only their HTTP policy', () => {

  const sharedService = readCommunity('packages/front-core/src/planning/processes.service.ts');
  const communityAdapter = readCommunity('src/modules/processes/services/processes.service.ts');
  const enterpriseAdapter = readEnterprise('src/modules/processes/services/processes.service.ts');

  assert.match(sharedService, /export interface ProcessStatusTransport/);
  assert.match(sharedService, /function normalizeTask/);
  assert.match(sharedService, /export function deriveProcessTaskState/);
  assert.match(sharedService, /export function createProcessStatusService/);
  assert.doesNotMatch(sharedService, /@\/services\//);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /createProcessStatusService/);
    assert.match(adapter, /createApiError/);
    assert.match(adapter, /export \{[\s\S]*deriveProcessTaskState/);
    assert.doesNotMatch(adapter, /function normalizeTask/);
    assert.doesNotMatch(adapter, /function sortProcessStatusTasks/);
  }
});

test('Community owns the Process Status workspace while edition hosts retain only transport and notification adapters', () => {

  const sharedWorkspace = readCommunity('packages/front-processes/src/ProcessStatusWorkspace.vue');
  const communityPage = readCommunity('src/modules/processes/pages/ProcessStatusPage.vue');
  const enterprisePage = readEnterprise('src/modules/processes/pages/ProcessStatusPage.vue');

  assert.match(sharedWorkspace, /defineProps/);
  assert.match(sharedWorkspace, /fetchProcessStatusTasks/);
  assert.match(sharedWorkspace, /deleteProcessStatusTasks/);
  assert.match(sharedWorkspace, /<TaskPageLayout>/);
  assert.doesNotMatch(sharedWorkspace, /@\//);

  for (const page of [communityPage, enterprisePage]) {
    assert.match(page, /ProcessStatusWorkspace.*@opsfactor\/front-processes/);
    assert.match(page, /useNotificationsStore/);
    assert.doesNotMatch(page, /<TaskPageLayout>/);
    assert.doesNotMatch(page, /function matchesFilters/);
  }
});
