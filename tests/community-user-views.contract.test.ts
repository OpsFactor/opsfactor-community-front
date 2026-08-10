import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityUserViewsPage = readFileSync(new URL('../src/modules/planning-books/UserViewsCommunityPage.vue', import.meta.url), 'utf8');
const communityNavigation = readFileSync(new URL('../src/app/navigation.config.ts', import.meta.url), 'utf8');
const communityNavigationPolicy = readFileSync(new URL('../packages/front-shell/src/edition-navigation-policy.ts', import.meta.url), 'utf8');

test('Community preserves the canonical user-centric User Views flow', () => {
  assert.match(communityNavigation, /'admin-user-views': \(\) => import\('\@\/modules\/planning-books\/UserViewsCommunityPage\.vue'\)/);
  assert.doesNotMatch(communityNavigationPolicy, /'admin-user-views'/);
  assert.match(communityUserViewsPage, /const PLANNING_BOOK_VIEW_TYPES = \['Demand Planning Book', 'Supply Planning Book'\]/);
  assert.match(communityUserViewsPage, /getConfiguredViewUsers\(/);
  assert.match(communityUserViewsPage, /getConfiguredViewsForUser\(/);
  assert.match(communityUserViewsPage, /getUnitOfMeasureIds\(/);
  assert.match(communityUserViewsPage, /createConfiguredView\(/);
  assert.match(communityUserViewsPage, /saveConfiguredView\(/);
  assert.match(communityUserViewsPage, /deleteConfiguredView\(/);
  assert.match(communityUserViewsPage, />New View</);
  assert.match(communityUserViewsPage, />Copy To User</);
  assert.match(communityUserViewsPage, /Save View/);
  assert.match(communityUserViewsPage, />Remove View</);
  assert.match(communityUserViewsPage, /label="User"/);
  assert.match(communityUserViewsPage, /label="View"/);
  assert.match(communityUserViewsPage, /v-if="draft"\s+title="Workspace Summary"/);
  assert.match(communityUserViewsPage, /workspace-grid/);
  assert.match(communityUserViewsPage, /metric\.detail/);
  assert.match(communityUserViewsPage, /All DFUs/);
  assert.match(communityUserViewsPage, /OfxButton variant="secondary"/);
  assert.match(communityUserViewsPage, /OfxButton variant="danger"/);
});

test('Community User Views keeps private controls in place and visibly gated', () => {
  for (const enterpriseOnlyCapability of [
    'fetchProductCharacteristics',
    'fetchLocationCharacteristics',
    'fetchProductLocationCharacteristics',
    'fetchDemandPlanWorkflows',
    'fetchDemandPlanWorkflowStages',
    'materialLocationCharacteristicDetailList',
    'demandPlanWorkflowId',
    'demandPlanWorkflowStageId',
  ]) {
    assert.equal(communityUserViewsPage.includes(enterpriseOnlyCapability), false, `${enterpriseOnlyCapability} must remain Enterprise-only.`);
  }
  assert.match(communityUserViewsPage, /OfxEditionAvailabilityMark/);
  assert.match(communityUserViewsPage, /title="Material Aggregation and Filters"/);
  assert.match(communityUserViewsPage, /title="Location Aggregation and Filters"/);
  assert.match(communityUserViewsPage, /title="Product-Location \(DFU\) Filters"/);
  assert.match(communityUserViewsPage, /material characteristics registered in Master Data/);
  assert.match(communityUserViewsPage, /Material-location characteristic filters are available in Pro/);
  assert.doesNotMatch(communityUserViewsPage, /class="locked-control"/);
  assert.match(communityUserViewsPage, /const communityWorkflowOptions = \[\{ label: 'None', value: '' \}\]/);
  assert.match(communityUserViewsPage, /const communityDirectDemandOptions = \[\{ label: 'Demand Adjustment', value: 'Demand Adjustment' \}\]/);
  assert.match(communityUserViewsPage, /<OfxSelectField\s+v-if="isDemandPlanningBook"\s+model-value=""\s+label="Workflow"\s+:options="communityWorkflowOptions"[\s\S]*?locked\s+locked-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /<OfxSelectField\s+v-if="isDemandPlanningBook"\s+model-value=""\s+label="Workflow Stage"\s+:options="communityWorkflowOptions"[\s\S]*?locked\s+locked-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /<OfxSelectField\s+v-if="isDemandPlanningBook"\s+model-value="Demand Adjustment"\s+label="Direct Demand Input Key Figure"\s+:options="communityDirectDemandOptions"[\s\S]*?locked\s+locked-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /<OfxToggleField\s+:model-value="false"\s+label="Allow input in frozen horizon"\s+locked\s+locked-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /label="Material-Level Detail"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /label="Location-Level Detail"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.doesNotMatch(communityUserViewsPage, /v-model="draft\.allowInputFrozenHorizon"/);
});

test('Community User Views provides persisted material and location ID filters', () => {
  assert.match(communityUserViewsPage, /loadCommunityMaterials\(\)/);
  assert.match(communityUserViewsPage, /loadCommunityLocations\(\)/);
  assert.match(communityUserViewsPage, /v-model="draft\.materialIdFilterList"/);
  assert.match(communityUserViewsPage, /v-model="draft\.locationIdFilterList"/);
  assert.match(communityUserViewsPage, /label="Material IDs"/);
  assert.match(communityUserViewsPage, /label="Location IDs"/);
  assert.match(communityUserViewsPage, /title="Key Figure Selection"/);
  assert.match(communityUserViewsPage, /COMMUNITY_DEMAND_KEY_FIGURES/);
  assert.match(communityUserViewsPage, /getMaterialCharacteristics\(\)/);
  assert.match(communityUserViewsPage, /getLocationCharacteristics\(\)/);
  assert.doesNotMatch(communityUserViewsPage, /MATERIAL_STATUS/);
  assert.doesNotMatch(communityUserViewsPage, /LOCATION_TYPE/);
  assert.match(communityUserViewsPage, /setCharacteristicFilterValues\('material'/);
  assert.match(communityUserViewsPage, /setCharacteristicFilterValues\('location'/);
  assert.doesNotMatch(communityUserViewsPage, /An empty selection includes every active/);
});

test('Community User Views defaults auto-submit to false and gates key-figure configuration', () => {
  assert.match(communityUserViewsPage, /autoSubmitChanges: view\.autoSubmitChanges \?\? false/);
  assert.match(communityUserViewsPage, /title="Key Figure Selection"[\s\S]*?OfxEditionAvailabilityMark edition-label="Pro \/ Enterprise"/);
  assert.match(communityUserViewsPage, /label="Visible key figures"[\s\S]*?disabled/);
  assert.match(communityUserViewsPage, /Position \{\{ keyFigure\.position/);
  assert.match(communityUserViewsPage, /Baseline remains read-only/);
});
