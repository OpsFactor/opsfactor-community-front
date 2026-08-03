import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildCommunityConfiguredViewPayload } from '../src/modules/planning-books/configured-views.contract.ts';
import { buildCommunityPlanningBookRichRows } from '../src/modules/planning-books/community-planning-book-grid-rich.utils.ts';
import { resolvePlanningBookPeriod } from '../src/modules/demand-planning/planning-book.utils.ts';
import type { PlanningBook } from '../src/modules/demand-planning/planning-book.types.ts';
import { SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS } from '../src/modules/supply-planning/supply-planning-book.types.ts';
import {
  isSupplyPlanningBookDetailQuantityEditable,
  supportsSupplyPlanningBookDetails,
} from '../src/modules/supply-planning/supply-planning-book.utils.ts';

test('Planning Book resolves a summarized visual field to the canonical timestamp period', () => {
  const planningBook: PlanningBook = {
    viewName: 'Demand View',
    viewType: 'Demand Planning Book',
    autoSubmitChanges: true,
    keyFigures: ['Demand Adjustment'],
    bucketSize: 'MENSAL',
    uom: 'EA',
    periodList: ['2026-08-31T23:59:59.000Z'],
    columnDefs: [{ field: '2026-08-31', name: '2026-08-31', dataColumn: true }],
    groups: [],
  };

  assert.equal(resolvePlanningBookPeriod(planningBook, '2026-08-31'), '2026-08-31T23:59:59.000Z');
});

test('Demand Planning Book uses the neutral virtualized grid without changing its Community operational handlers', () => {
  const communityPage = readFileSync(new URL('../src/modules/demand-planning/DemandPlanningBookCommunityPage.vue', import.meta.url), 'utf8');
  const richGrid = readFileSync(new URL('../packages/front-planning-book/src/components/PlanningBookVirtualGrid.vue', import.meta.url), 'utf8');

  assert.match(communityPage, /PlanningBookVirtualGrid/);
  assert.match(communityPage, /buildCommunityPlanningBookRichRows/);
  assert.match(communityPage, /loadPlanningBook\(/);
  assert.match(communityPage, /savePlanningBookCells\(/);
  assert.match(communityPage, /editableDemandPlanningBookKeyFigures/);
  assert.match(communityPage, /autoSubmitChanges/);
  assert.match(communityPage, /pendingCells/);
  assert.match(communityPage, /exportOpenedPlanningBook/);
  assert.match(communityPage, /openedPlanningBookSelection/);
  assert.match(communityPage, /Export XLSX/);
  assert.match(richGrid, /ROW_HEIGHT/);
  assert.match(richGrid, /renderedRows/);
  assert.match(richGrid, /filterText/);
  assert.match(richGrid, /hierarchyParentRowKey/);
  assert.doesNotMatch(richGrid, /api\/secured|referencePlan|xlsx|upload|changeLog/i);
});

test('Planning Book tree-cell renderers are owned by the Community package and consumed by the Enterprise extension', () => {
  const packageIndex = readFileSync(new URL('../packages/front-planning-book/src/index.ts', import.meta.url), 'utf8');
  const packageRenderer = readFileSync(new URL('../packages/front-planning-book/src/components/PlanningBookTreeCellRenderer.vue', import.meta.url), 'utf8');
  const productionPackageRenderer = readFileSync(new URL('../packages/front-planning-book/src/components/ProductionPlanningTreeCellRenderer.vue', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/planning/PlanningBookTreeCellRenderer.vue', import.meta.url), 'utf8');
  const enterpriseProductionAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/planning/ProductionPlanningTreeCellRenderer.vue', import.meta.url), 'utf8');

  assert.match(packageIndex, /PlanningBookTreeCellRenderer/);
  assert.match(packageRenderer, /Neutral AG Grid renderer/);
  assert.match(packageRenderer, /params\.data/);
  assert.match(productionPackageRenderer, /Neutral AG Grid renderer/);
  assert.match(productionPackageRenderer, /toggleRow/);
  assert.match(enterpriseAdapter, /PlanningBookTreeCellRenderer as default.*@opsfactor\/front-planning-book/s);
  assert.match(enterpriseProductionAdapter, /ProductionPlanningTreeCellRenderer as default.*@opsfactor\/front-planning-book/s);
});

test('Production Planning grid is owned by the Community package while Enterprise injects its user theme policy', () => {
  const packageIndex = readFileSync(new URL('../packages/front-planning-book/src/index.ts', import.meta.url), 'utf8');
  const packageGrid = readFileSync(new URL('../packages/front-planning-book/src/components/ProductionPlanningBookGrid.vue', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/planning/OfxProductionPlanningGrid.vue', import.meta.url), 'utf8');

  assert.match(packageIndex, /ProductionPlanningBookGrid/);
  assert.match(packageGrid, /Minimal workbook contract/);
  assert.match(packageGrid, /ProductionPlanningTreeCellRenderer/);
  assert.doesNotMatch(packageGrid, /@\/modules|useThemeStore|api\/secured/);
  assert.match(enterpriseAdapter, /ProductionPlanningBookGrid.*@opsfactor\/front-planning-book/);
  assert.match(enterpriseAdapter, /:theme-mode="themeStore\.mode"/);
});

test('Planning Book DTO contracts and normalization are owned by the Community package', () => {
  const packageTypes = readFileSync(new URL('../packages/front-planning-book/src/planning-book.dto.ts', import.meta.url), 'utf8');
  const packageNormalization = readFileSync(new URL('../packages/front-planning-book/src/planning-book.normalization.ts', import.meta.url), 'utf8');
  const communityTypes = readFileSync(new URL('../src/features/planning-book/planning-book.types.ts', import.meta.url), 'utf8');
  const communityNormalization = readFileSync(new URL('../src/features/planning-book/planning-book.utils.ts', import.meta.url), 'utf8');
  const enterpriseTypes = readFileSync(new URL('../../opsfactor-enterprise-front/src/features/planning-book/planning-book.types.ts', import.meta.url), 'utf8');
  const enterpriseNormalization = readFileSync(new URL('../../opsfactor-enterprise-front/src/features/planning-book/planning-book.utils.ts', import.meta.url), 'utf8');

  assert.match(packageTypes, /Edition-neutral DTO contracts/);
  assert.match(packageNormalization, /normalizePlanningBook/);
  assert.match(packageNormalization, /aggregatePlanningBookSubtotalField/);
  assert.doesNotMatch(packageNormalization, /api\/secured|requestJson|useThemeStore/);
  for (const adapter of [communityTypes, communityNormalization, enterpriseTypes, enterpriseNormalization]) {
    assert.match(adapter, /@opsfactor\/front-planning-book/);
    assert.doesNotMatch(adapter, /function normalizePlanningBook|type PlanningBookDto/);
  }
});

test('Legacy Planning Book AG Grid is supplied once by Community and Enterprise injects its theme policy', () => {
  const packageIndex = readFileSync(new URL('../packages/front-planning-book/src/index.ts', import.meta.url), 'utf8');
  const packageGrid = readFileSync(new URL('../packages/front-planning-book/src/components/LegacyPlanningBookGrid.vue', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/planning/OfxPlanningBookGrid.vue', import.meta.url), 'utf8');

  assert.match(packageIndex, /LegacyPlanningBookGrid/);
  assert.match(packageGrid, /PlanningBookTreeCellRenderer/);
  assert.match(packageGrid, /aggregatePlanningBookSubtotalField/);
  assert.match(packageGrid, /request-details/);
  assert.doesNotMatch(packageGrid, /@\/|useThemeStore|api\/secured/);
  assert.match(enterpriseAdapter, /LegacyPlanningBookGrid.*@opsfactor\/front-planning-book/);
  assert.match(enterpriseAdapter, /:theme-mode="themeStore\.mode"/);
});

test('Planning Book detail dialog is supplied by Community while Enterprise injects its user theme policy', () => {
  const packageDialog = readFileSync(new URL('../packages/front-planning-book/src/components/PlanningBookDetailsDialog.vue', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/planning/OfxPlanningBookDetailsDialog.vue', import.meta.url), 'utf8');

  assert.match(packageDialog, /Plan identity and update/);
  assert.match(packageDialog, /AgGridVue/);
  assert.doesNotMatch(packageDialog, /api\/secured|requestJson|updateSupplyPlanningBook/i);
  assert.match(enterpriseAdapter, /PlanningBookDetailsDialog.*@opsfactor\/front-planning-book/);
  assert.match(enterpriseAdapter, /:theme-mode="themeStore\.mode"/);
  assert.match(enterpriseAdapter, /@submit="emit\('submit', \$event\)"/);
});

test('Demand Planning Book preserves the legacy context and collaboration hierarchy while gating Enterprise workflow', () => {
  const communityPage = readFileSync(new URL('../src/modules/demand-planning/DemandPlanningBookCommunityPage.vue', import.meta.url), 'utf8');

  assert.match(communityPage, /DashboardPageLayout/);
  assert.match(communityPage, /title="Plan context"/);
  assert.match(communityPage, /title="Collaboration workflow"/);
  assert.match(communityPage, /OfxLoadingState/);
  assert.match(communityPage, /OfxEmptyState/);
  assert.match(communityPage, /OfxSelectField/);
  assert.match(communityPage, /OfxToggleField/);
  assert.match(communityPage, /Include a reference plan · Enterprise/);
  assert.match(communityPage, /locked-label="Enterprise"/);
  assert.match(communityPage, /Collaborate via Excel <em>Enterprise<\/em>/);
  assert.match(communityPage, /disabled>/);
  assert.match(communityPage, /Export XLSX/);
  assert.match(communityPage, /Demand Planning Workspace/);
  assert.match(communityPage, /Reopen selection/);
  assert.match(communityPage, /function leavePlanningBook/);
  assert.match(communityPage, /v-if="!planningBook"/);
  assert.doesNotMatch(communityPage, /referencePlanId|xlsx\/import|change log|\/data\//i);
});

test('Community rich grid preserves real zero, unavailable state and a local key-figure tree', () => {
  const rows = buildCommunityPlanningBookRichRows([
    {
      rowKey: 'LOC::MAT::Direct Demand', keyFigure: 'Direct Demand',
      locationDescriptionCols: { locationId: 'LOC' }, materialDescriptionCols: { materialId: 'MAT' },
      values: { '2026-08-31': 0 }, unavailableReasons: {}, additionalClasses: {},
    },
    {
      rowKey: 'LOC::MAT::Demand Adjustment', keyFigure: 'Demand Adjustment',
      locationDescriptionCols: { locationId: 'LOC' }, materialDescriptionCols: { materialId: 'MAT' },
      values: { '2026-08-31': null }, unavailableReasons: { '2026-08-31': 'Not applicable' },
      additionalClasses: { '2026-08-31': ['crosshatch'] },
    },
  ]);

  assert.equal(rows[0]?.values['2026-08-31'], 0);
  assert.equal(rows[0]?.hierarchyDepth, 0);
  assert.equal(rows[0]?.hierarchyExpandable, true);
  assert.equal(rows[1]?.hierarchyDepth, 1);
  assert.equal(rows[1]?.hierarchyParentRowKey, 'LOC::MAT::Direct Demand');
  assert.equal(rows[1]?.unavailableReasons['2026-08-31'], 'Not applicable');
  assert.deepEqual(rows[1]?.additionalClasses['2026-08-31'], ['crosshatch']);
});

test('Demand Planning Book XLSX export uses only the opened view selection and authenticated binary endpoint', () => {
  const service = readFileSync(new URL('../src/modules/demand-planning/planning-book.service.ts', import.meta.url), 'utf8');
  const communityPage = readFileSync(new URL('../src/modules/demand-planning/DemandPlanningBookCommunityPage.vue', import.meta.url), 'utf8');

  assert.match(service, /requestBlob\('\/api\/secured\/planning\/demand\/planningbook\/xlsx'/);
  assert.match(service, /method: 'POST'/);
  assert.match(service, /JSON\.stringify\(selection\)/);
  for (const forbiddenFragment of ['/data/', 'reference', 'autofit', 'change log', 'upload']) {
    assert.equal(service.toLowerCase().includes(forbiddenFragment), false, `Export transport must not use ${forbiddenFragment}`);
  }
  assert.match(communityPage, /downloadPlanningBookSpreadsheet/);
  assert.match(communityPage, /URL\.revokeObjectURL/);
  assert.match(communityPage, /openedPlanningBookSelection\.value/);
});

test('Configured Views payload fixes every Community-only setting', () => {
  const payload = buildCommunityConfiguredViewPayload({
    userId: 'planner',
    viewName: 'Demand View',
    viewType: 'Demand Planning Book',
    unitOfMeasure: 'EA',
    keyFigureList: [{ keyFigure: 'Direct Demand', allowChanges: true }],
  });

  assert.deepEqual(payload, {
    userId: 'planner',
    viewName: 'Demand View',
    viewType: 'Demand Planning Book',
    unitOfMeasure: 'EA',
    keyFigureList: [{ keyFigure: 'Direct Demand', allowChanges: true }],
    showMaterialLevel: true,
    showLocationLevel: true,
    directDemandUpdateKeyFigure: 'Demand Adjustment',
    materialCharacteristicDetailList: [],
    locationCharacteristicDetailList: [],
    materialLocationCharacteristicDetailList: [],
    demandPlanWorkflowId: null,
    demandPlanWorkflowStageId: null,
  });
});

test('Supply Planning Book uses canonical on-demand detail endpoints only', () => {
  assert.deepEqual(SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS, {
    read: '/api/secured/planning/supply/planningbook/detail',
    update: '/api/secured/planning/supply/planningbook/detail/update',
  });
});

test('Supply Planning Book restricts detail editing to planned Working Plan quantities', () => {
  assert.equal(supportsSupplyPlanningBookDetails('Planned Production-Working Plan'), true);
  assert.equal(supportsSupplyPlanningBookDetails('Planned Inbound-Working Plan'), true);
  assert.equal(supportsSupplyPlanningBookDetails('Indirect Demand-Constrained Plan'), true);
  assert.equal(supportsSupplyPlanningBookDetails('Stock-Working Plan'), false);
  assert.equal(isSupplyPlanningBookDetailQuantityEditable('Planned Production-Working Plan', { 'Production Version Id': 'PV-01' }), true);
  assert.equal(isSupplyPlanningBookDetailQuantityEditable('Planned Production-Working Plan', { 'Production Version Id': 'No Prod Version' }), false);
  assert.equal(isSupplyPlanningBookDetailQuantityEditable('Planned Inbound-Working Plan', { 'Origin Location Id': 'DC' }), true);
  assert.equal(isSupplyPlanningBookDetailQuantityEditable('Indirect Demand-Working Plan', { Quantity: 12 }), false);
  assert.equal(isSupplyPlanningBookDetailQuantityEditable('Planned Production-Constrained Plan', { 'Production Version Id': 'PV-01' }), false);
});

test('Supply Planning Book uses the neutral rich grid while preserving on-demand detail gates', () => {
  const communityPage = readFileSync(new URL('../src/modules/supply-planning/SupplyPlanningBookCommunityPage.vue', import.meta.url), 'utf8');

  assert.match(communityPage, /PlanningBookVirtualGrid/);
  assert.match(communityPage, /buildCommunityPlanningBookRichRows/);
  assert.match(communityPage, /getSupplyPlanningBookCatalog/);
  assert.match(communityPage, /saveSupplyPlanningBookCell\(/);
  assert.match(communityPage, /saveSupplyPlanningBookCellDetails\(/);
  assert.match(communityPage, /openCellDetails\(/);
  assert.match(communityPage, /COMMUNITY_EDITABLE_KEY_FIGURES/);
  assert.match(communityPage, /DashboardPageLayout/);
  assert.match(communityPage, /title="Workbook Selection"/);
  assert.match(communityPage, /User view/);
  assert.match(communityPage, /Supply Planning Workspace/);
  assert.match(communityPage, /Reopen selection/);
  assert.match(communityPage, /function leavePlanningBook/);
  assert.match(communityPage, /v-if="!planningBook"/);
  assert.match(communityPage, /!row\.additionalClasses\[field\]\?\.includes\('crosshatch'\)/);
  assert.doesNotMatch(communityPage, /referencePlanId|xlsx\/import|change log|\/data\//i);
});

test('Production Planning Book preserves the legacy production workbook selection hierarchy', () => {
  const communityPage = readFileSync(new URL('../src/modules/production-planning/ProductionPlanningBookCommunityPage.vue', import.meta.url), 'utf8');

  assert.match(communityPage, /DashboardPageLayout/);
  assert.match(communityPage, /eyebrow="Production" title="Planning Book"/);
  assert.match(communityPage, /title="Workbook Selection"/);
  assert.match(communityPage, /PlanningBookVirtualGrid/);
  assert.match(communityPage, /savePlannedQuantity/);
  assert.match(communityPage, /Production Planning Workspace/);
  assert.match(communityPage, /Reopen selection/);
  assert.match(communityPage, /function leavePlanningBook/);
  assert.match(communityPage, /v-if="!planningBook"/);
});
