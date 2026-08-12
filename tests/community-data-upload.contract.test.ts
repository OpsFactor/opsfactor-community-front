import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCommunityDataEndpoint,
  buildCommunityDataJsonPayload,
  COMMUNITY_DATA_FAMILIES,
  type CommunityDataFamily,
} from '../src/modules/data/community-data-upload.types.ts';
import { PLANNING_FRONT_DATA_THEMES } from '../src/modules/data/planning-front-data-taxonomy.ts';

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
      'characteristic/material', 'characteristic/location', 'materiallocationparameters', 'inventorypolicy', 'inventorypolicydetail', 'supplynetworkversion',
      'transportationlane', 'transportationlanematerial', 'productionresourceavailability', 'bom',
      'bomcomponents', 'productionresource', 'productionrouting', 'operationproductionrouting',
      'simpleproductionversion', 'stock', 'sellout', 'fulfilleddemand', 'demandplan', 'distributionplan',
      'productionplan/volume', 'productionplan/occupation', 'inventoryplan',
    ],
  );

  const catalog = COMMUNITY_DATA_FAMILIES.map((candidate) => candidate.subPath).join('\n');
  for (const forbiddenSubPath of [
    'configuredview', 'fillwithdemandplan', 'autofit', 'inventoryoptimization', 'sellin', 'order',
    'pricelist', 'costlist', 'optimizationmodel', 'maintenance', 'shift', 'workflow',
  ]) {
    assert.equal(catalog.includes(forbiddenSubPath), false, `Community Data catalog must not expose ${forbiddenSubPath}.`);
  }
});

test('Every executable Community family resolves to one exact Planning Front topic path', () => {

  for (const candidate of COMMUNITY_DATA_FAMILIES) {
    const theme = PLANNING_FRONT_DATA_THEMES.find((catalogTheme) => catalogTheme.id === candidate.theme);
    const group = theme?.groups.find((catalogGroup) => catalogGroup.id === candidate.group);
    const section = group?.subgroups.find((catalogSection) => catalogSection.id === candidate.section);
    const topic = section?.topics.find((catalogTopic) => catalogTopic.id === candidate.catalogTopicId);

    assert.ok(topic, `Community family ${candidate.id} does not resolve at ${candidate.theme}/${candidate.group}/${candidate.section}/${candidate.catalogTopicId}.`);
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
  assert.deepEqual(family('fulfilled-demand-export').operations.map((candidate) => candidate.kind), [
    'download-file', 'download-json',
  ]);

  for (const familyId of ['stock', 'sell-out']) {
    const deleteOperation = operation(familyId, 'delete-json');
    assert.equal(deleteOperation.requiresDateRange, true, `${familyId} delete must stay bounded by dates.`);
  }
  assert.equal(family('material-location-parameters').operations.some((candidate) => candidate.kind === 'delete-json'), true);
  assert.equal(family('materials').operations.some((candidate) => candidate.kind === 'delete-json'), false);
  assert.equal(family('unit-of-measure').operations.some((candidate) => candidate.kind === 'delete-json'), false);
  assert.equal(family('inventory-plan-export').operations.some((candidate) => candidate.kind === 'delete-json'), false);
  assert.equal(family('fulfilled-demand-export').operations.some((candidate) => candidate.kind === 'delete-json'), false);
});

test('Community Data builds only canonical endpoint paths with required scoped identifiers', () => {
  assert.equal(buildCommunityDataEndpoint({ family: family('locations'), operation: operation('locations', 'download-json') }), '/api/secured/data/location');
  assert.equal(buildCommunityDataEndpoint({ family: family('locations'), operation: operation('locations', 'download-file') }), '/api/secured/data/file/location');
  assert.equal(buildCommunityDataEndpoint({ family: family('material-location-parameters'), operation: operation('material-location-parameters', 'delete-json') }), '/api/secured/data/materiallocationparameters');
  assert.equal(
    buildCommunityDataEndpoint({
      family: family('stock'), operation: operation('stock', 'download-json'),
      dateRange: { initialDate: '2026-01-01', finalDate: '2026-01-31' },
    }),
    '/api/secured/data/stock/2026-01-01/2026-01-31',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('material-characteristics'), operation: operation('material-characteristics', 'download-file'), variantSubPath: 'characteristic/material/value' }),
    '/api/secured/data/file/characteristic/material/value',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('demand-plan-detailed-export'), operation: operation('demand-plan-detailed-export', 'download-file'), demandPlanId: '12' }),
    '/api/secured/data/file/demandplan/12',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('fulfilled-demand-export'), operation: operation('fulfilled-demand-export', 'download-json'), supplyPlanId: '94' }),
    '/api/secured/data/fulfilleddemand/94',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('fulfilled-demand-export'), operation: operation('fulfilled-demand-export', 'download-file'), supplyPlanId: '94', referenceDate: '2027-02-01' }),
    '/api/secured/data/file/fulfilleddemand/94/period/2027-02-01',
  );
  assert.equal(
    buildCommunityDataEndpoint({ family: family('demand-plan-detailed-export'), operation: operation('demand-plan-detailed-export', 'download-file'), demandPlanId: '12', referenceDate: '2027-02-01' }),
    '/api/secured/data/file/demandplan/12/period/2027-02-01',
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
  assert.match(source, /downloadTabularData/);
  assert.match(source, /XLSX\.writeFile/);
  assert.match(source, /csvStandard/);
  assert.match(source, /csvSystemLocale/);
});

test('Community Data overlays availability on the Planning Front hierarchy without rewriting it', () => {
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
  assert.match(page, /PLANNING_FRONT_DATA_THEMES/);
  assert.match(page, /familyForTopic/);
  assert.match(page, /themeHasCommunityTopic/);
  assert.match(page, /groupHasCommunityTopic/);
  assert.match(page, /catalogSelectionIsExecutable/);
  assert.match(page, /selectCatalogTheme/);
  assert.match(page, /selectCatalogSection/);
  assert.match(page, /Pro \/ Enterprise/);
  assert.doesNotMatch(page, /Firm production, purchase, transfer, sell-in, and customer-order flows/);
  assert.match(page, /:disabled="familyForTopic/);
  assert.match(page, /This topic is not available in the current edition/);
  assert.doesNotMatch(page, /Community \/ \{\{ selectedTheme\.title \}\}/);
  assert.doesNotMatch(page, /community-badge/);
  assert.match(page, /OfxDataTopicWorkspace/);
  assert.match(page, /:operations="operationOptions"/);
  assert.match(page, /:download-visible="downloadVisible"/);
  assert.match(page, /:import-visible="importVisible"/);
  assert.match(page, /ref="fileInputRef" type="file" class="hidden-file-input"/);
  assert.match(page, /@change="runUpload"/);
  assert.match(page, /@import="triggerImport"/);
  assert.match(page, /:import-label="importActionLabel"/);
  assert.match(page, /busy\.value \? 'Importing…'/);
  assert.match(page, /operationRequiresPlanOptions/);
  assert.doesNotMatch(page, /Selected file:/);
  assert.doesNotMatch(page, /Confirm upload\?/);
  assert.match(page, /:download-format="downloadFormat"/);
  assert.match(page, /:download-options="downloadOptions"/);
  assert.match(page, /download-presentation="format-select"/);
  assert.match(page, /download-action-variant="accent"/);
  assert.match(page, /label: 'XLSX'/);
  assert.doesNotMatch(page, /Download FILE rows/);
  assert.doesNotMatch(page, /Download JSON/);
  assert.doesNotMatch(page, /Upload JSON/);
  assert.match(page, /theme-mode="light"/);
  assert.equal(page.includes('dataupload/'), false, 'Community Data must use only canonical data roots.');

  const transactionalTheme = PLANNING_FRONT_DATA_THEMES.find((theme) => theme.id === 'transactional-data');
  assert.ok(transactionalTheme);
  const inventoryGroup = transactionalTheme.groups.find((group) => group.id === 'inventory');
  const salesGroup = transactionalTheme.groups.find((group) => group.id === 'sales');
  assert.ok(inventoryGroup);
  assert.equal(inventoryGroup.title, 'Inventory');
  assert.equal(inventoryGroup.subgroups[0]?.title, 'Stock');
  assert.ok(salesGroup);
  assert.equal(salesGroup.title, 'Sales');
  assert.deepEqual(salesGroup.subgroups[0]?.topics.map((topic) => topic.title), ['Sales / Sell-out', 'Sales / Sell-in']);
  assert.ok(transactionalTheme.groups.some((group) => group.title === 'Orders'));
  assert.ok(transactionalTheme.groups.some((group) => group.title === 'Campaign / Event Data'));
});

test('plan-based Community exports use the same complete-or-period scope as the Planning Front', () => {

  const page = readFileSync(new URL('../src/modules/data/CommunityDataUploadPage.vue', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../src/modules/data/community-data-upload.types.ts', import.meta.url), 'utf8');
  const dataWorkspace = readFileSync(new URL('../packages/front-shell/src/OfxDataTopicWorkspace.vue', import.meta.url), 'utf8');

  assert.match(catalog, /fulfilled-demand-export[\s\S]*?supportsPlanPeriodScope: true/);
  assert.match(catalog, /demand-plan-detailed-export[\s\S]*?supportsPlanPeriodScope: true/);
  assert.match(page, /Plan period/);
  assert.match(page, /Complete dataset/);
  assert.match(page, /showPlanPeriodSelector/);
  assert.match(page, /Boolean\(selectedPlanId\.value\.trim\(\)\)/);
  assert.match(page, /downloadSelectionChips/);
  assert.match(page, /\/api\/secured\/planning\/\$\{planType\}\//);
  assert.doesNotMatch(page, /Unit of Measure/);
  assert.match(dataWorkspace, /resolvedDownloadActionVariant/);
  assert.match(dataWorkspace, /isLightTheme\.value \? 'accent' : 'default'/);
});

test('Community Data makes the Supply and Demand baseline inputs discoverable in the transactional hierarchy', () => {
  const stock = family('stock');
  const sellOut = family('sell-out');

  assert.equal(stock.theme, 'transactional-data');
  assert.equal(stock.group, 'inventory');
  assert.equal(stock.section, 'inventory-snapshots');
  assert.equal(stock.catalogTopicId, 'stock');
  assert.match(stock.description, /Supply Planning/);
  assert.equal(sellOut.theme, 'transactional-data');
  assert.equal(sellOut.group, 'sales');
  assert.equal(sellOut.section, 'historical-sales');
  assert.equal(sellOut.catalogTopicId, 'sales-sell-out');
  assert.match(sellOut.description, /Demand Planning/);
});
