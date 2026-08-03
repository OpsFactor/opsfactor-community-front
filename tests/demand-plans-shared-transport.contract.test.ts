import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('both edition adapters inject only host HTTP policy into Community-owned Demand and Supply Plan transports', () => {
  const communityAdapter = readFileSync(new URL('../src/modules/demand-planning/services/demand-plans.service.ts', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/demand-planning/services/demand-plans.service.ts', import.meta.url), 'utf8');
  const communitySupplyAdapter = readFileSync(new URL('../src/modules/supply-network/services/supply-plans.service.ts', import.meta.url), 'utf8');
  const enterpriseSupplyAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/supply-network/services/supply-plans.service.ts', import.meta.url), 'utf8');

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /createDemandPlansService/);
    assert.match(adapter, /httpRequest/);
    assert.doesNotMatch(adapter, /api\/secured\/planning\/demand\/delete/);
    assert.doesNotMatch(adapter, /readResponseMessage/);
  }

  for (const adapter of [communitySupplyAdapter, enterpriseSupplyAdapter]) {
    assert.match(adapter, /createSupplyPlansService/);
    assert.match(adapter, /httpRequest/);
    assert.doesNotMatch(adapter, /api\/secured\/planning\/supply\/delete/);
    assert.doesNotMatch(adapter, /readResponseMessage/);
  }
});

test('Community owns the Demand Planning Book transport while both hosts retain authentication adapters only', () => {
  const sharedService = readFileSync(new URL('../packages/front-planning-book/src/demand-planning-book.service.ts', import.meta.url), 'utf8');
  const communityAdapter = readFileSync(new URL('../src/modules/demand-planning/services/demand-planning-book.service.ts', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/demand-planning/services/demand-planning-book.service.ts', import.meta.url), 'utf8');

  assert.match(sharedService, /export function createDemandPlanningBookService/);
  assert.match(sharedService, /planningbook\/xlsx\/import/);
  assert.match(sharedService, /transport\.requestJson/);
  assert.doesNotMatch(sharedService, /@\/services\//);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /createDemandPlanningBookService/);
    assert.match(adapter, /requestJson/);
    assert.doesNotMatch(adapter, /planningbook\/xlsx\/import/);
    assert.doesNotMatch(adapter, /function triggerBrowserDownload/);
  }
});

test('Community owns Demand and Supply Plan history workspaces while both hosts retain only adapters', () => {
  const demandWorkspace = readFileSync(new URL('../packages/front-plan-history/src/DemandPlansHistoryWorkspace.vue', import.meta.url), 'utf8');
  const supplyWorkspace = readFileSync(new URL('../packages/front-plan-history/src/SupplyPlansHistoryWorkspace.vue', import.meta.url), 'utf8');
  const pages = [
    readFileSync(new URL('../src/modules/demand-planning/pages/DemandPlansPage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/demand-planning/pages/DemandPlansPage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/modules/supply-network/pages/SupplyPlansPage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/supply-network/pages/SupplyPlansPage.vue', import.meta.url), 'utf8'),
  ];

  for (const workspace of [demandWorkspace, supplyWorkspace]) {
    assert.match(workspace, /defineProps/);
    assert.match(workspace, /<TaskPageLayout>/);
    assert.match(workspace, /delete.*Plans/);
    assert.doesNotMatch(workspace, /@\//);
  }

  for (const page of pages) {
    assert.match(page, /@opsfactor\/front-plan-history/);
    assert.match(page, /useNotificationsStore/);
    assert.doesNotMatch(page, /<TaskPageLayout>/);
    assert.doesNotMatch(page, /OfxDataTable/);
  }
});
