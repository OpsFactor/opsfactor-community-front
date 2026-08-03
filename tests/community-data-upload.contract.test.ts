import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCommunityDataEndpoint,
  buildCommunityDataJsonPayload,
  COMMUNITY_DATA_FAMILIES,
  type CommunityDataFamily,
} from '../src/modules/data/community-data-upload.types.ts';

function family(id: string): CommunityDataFamily {

  const selectedFamily = COMMUNITY_DATA_FAMILIES.find((candidate) => candidate.id === id);
  assert.ok(selectedFamily, `Expected Community data family ${id}.`);
  return selectedFamily;
}

function operation(familyId: string, kind: CommunityDataFamily['operations'][number]['kind']) {

  const selectedOperation = family(familyId).operations.find((candidate) => candidate.kind === kind);
  assert.ok(selectedOperation, `Expected ${kind} on ${familyId}.`);
  return selectedOperation;
}

test('Community Data catalog exactly mirrors the approved operational families', () => {
  assert.deepEqual(
    COMMUNITY_DATA_FAMILIES.map((candidate) => candidate.subPath),
    [
      'unitofmeasure', 'unitconversion', 'unitconversionmaterial', 'location', 'material',
      'materiallocationparameters', 'inventorypolicy', 'inventorypolicydetail', 'supplynetworkversion',
      'transportationlane', 'transportationlanematerial', 'productionresourceavailability', 'bom',
      'bomcomponents', 'productionresource', 'productionrouting', 'operationproductionrouting',
      'simpleproductionversion', 'stock', 'sellout', 'inventoryplan',
    ],
  );

  const catalog = COMMUNITY_DATA_FAMILIES.map((candidate) => candidate.subPath).join('\n');
  for (const forbiddenSubPath of [
    'configuredview', 'fillwithdemandplan', 'autofit', 'inventoryoptimization', 'sellin', 'order',
    'pricelist', 'costlist', 'optimizationmodel', 'productionplan', 'maintenance', 'shift', 'workflow',
  ]) {
    assert.equal(catalog.includes(forbiddenSubPath), false, `Community Data catalog must not expose ${forbiddenSubPath}.`);
  }
});

test('Community Data declares exceptions per family instead of offering a universal destructive operation', () => {
  assert.deepEqual(family('unit-of-measure').operations.map((candidate) => candidate.kind), [
    'download-file', 'download-json', 'upload-file', 'upload-json',
  ]);
  assert.deepEqual(family('routing-operation').operations.map((candidate) => candidate.kind), [
    'download-file', 'upload-file',
  ]);
  assert.deepEqual(family('inventory-plan-export').operations.map((candidate) => candidate.kind), [
    'download-file', 'download-json',
  ]);

  for (const familyId of ['stock', 'sell-out']) {
    const deleteOperation = operation(familyId, 'delete-json');
    assert.equal(deleteOperation.requiresDateRange, true, `${familyId} delete must stay bounded by dates.`);
  }
  assert.equal(family('materials').operations.some((candidate) => candidate.kind === 'delete-json'), true);
  assert.equal(family('unit-of-measure').operations.some((candidate) => candidate.kind === 'delete-json'), false);
  assert.equal(family('inventory-plan-export').operations.some((candidate) => candidate.kind === 'delete-json'), false);
});

test('Community Data builds only canonical endpoint paths with required scoped identifiers', () => {
  assert.equal(buildCommunityDataEndpoint({ family: family('locations'), operation: operation('locations', 'download-json') }), '/api/secured/data/location');
  assert.equal(buildCommunityDataEndpoint({ family: family('locations'), operation: operation('locations', 'download-file') }), '/api/secured/data/file/location');
  assert.equal(buildCommunityDataEndpoint({ family: family('materials'), operation: operation('materials', 'delete-json') }), '/api/secured/data/material/delete');
  assert.equal(
    buildCommunityDataEndpoint({
      family: family('stock'), operation: operation('stock', 'download-json'),
      dateRange: { initialDate: '2026-01-01', finalDate: '2026-01-31' },
    }),
    '/api/secured/data/stock/2026-01-01/2026-01-31',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('inventory-plan-export'), operation: operation('inventory-plan-export', 'download-file'), supplyPlanId: ' PLAN / 1 ' }),
    '/api/secured/data/file/inventoryplan/PLAN%20%2F%201',
  );
  assert.throws(
    () => buildCommunityDataEndpoint({ family: family('stock'), operation: operation('stock', 'delete-json') }),
    /initial and final dates/i,
  );
  assert.throws(
    () => buildCommunityDataEndpoint({ family: family('inventory-plan-export'), operation: operation('inventory-plan-export', 'download-json') }),
    /supply plan id/i,
  );
});

test('Community Data JSON enforces the synchronous integration envelope without changing unit-of-measure payloads', () => {
  assert.equal(
    buildCommunityDataJsonPayload(family('materials'), '{"data":[]}'),
    '{"data":[],"threadSync":"SYNC"}',
  );
  assert.equal(buildCommunityDataJsonPayload(family('unit-of-measure'), '[]'), '[]');
  assert.throws(
    () => buildCommunityDataJsonPayload(family('materials'), '{"data":[],"threadSync":"ASYNC"}'),
    /synchronously/i,
  );
  assert.throws(
    () => buildCommunityDataJsonPayload(family('unit-of-measure'), '{}'),
    /JSON array/i,
  );
});

test('Community Data transport uses fixed targets, multipart field file, and ResponseDTO messages', () => {
  const source = readFileSync(new URL('../src/modules/data/community-data-upload.service.ts', import.meta.url), 'utf8');
  assert.match(source, /formData\.append\('file', file, file\.name\)/);
  assert.match(source, /target\.operation\.kind === 'delete-json' \? 'DELETE' : 'POST'/);
  assert.match(source, /buildCommunityDataEndpoint\(target\)/);
  assert.match(source, /toResponseMessage\(response, fallback\)/);
});

test('Community Data preserves the legacy catalog hierarchy without turning Planning Book views into Data operations', () => {
  const navigationHost = readFileSync(new URL('../src/app/navigation.config.ts', import.meta.url), 'utf8');
  const sharedNavigation = readFileSync(new URL('../packages/front-shell/src/legacy-navigation.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/data/CommunityDataUploadPage.vue', import.meta.url), 'utf8');

  assert.ok(navigationHost.includes("'data-download-upload': () => import('@/modules/data/CommunityDataUploadPage.vue')"));
  assert.match(sharedNavigation, /path: '\/data\/download-upload'/);
  assert.doesNotMatch(navigationHost, /data-topic-inventory-policy/);
  assert.match(page, /TaskPageLayout/);
  assert.match(page, /Theme/);
  assert.match(page, /Group/);
  assert.match(page, /Section/);
  assert.match(page, /Topic/);
  assert.match(page, /Fixed controller contracts only; no arbitrary paths/);
  assert.match(page, /Enterprise-only topics/);
  assert.match(page, /Transactional Data <strong>Enterprise<\/strong>/);
  assert.match(page, /Configuration Data <strong>Enterprise<\/strong>/);
  assert.match(page, /Planning Data <strong>Enterprise<\/strong>/);
  assert.match(page, /Demand Auto-fit Models <strong>Enterprise<\/strong>/);
  assert.match(page, /Inventory Optimization <strong>Enterprise<\/strong>/);
  assert.match(page, /Detailed Production and Sequencing <strong>Enterprise<\/strong>/);
  assert.match(page, /OfxDataTopicWorkspace/);
  assert.match(page, /:operations="operationOptions"/);
  assert.match(page, /:download-visible="downloadVisible"/);
  assert.match(page, /:import-visible="importVisible"/);
  assert.match(page, /:import-description="currentOperation\.kind === 'upload-file'/);
  assert.match(page, /:danger-visible="dangerVisible"/);
  assert.match(page, /theme-mode="light"/);
  assert.equal(page.includes('dataupload/'), false, 'Community Data must use only canonical data roots.');
});
