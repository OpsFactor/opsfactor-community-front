import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(relativePath: string): string {

  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

}

test('Community persisted identities use catalogs instead of free-form codes', () => {

  const optionCatalog = source('src/services/community-option-catalog.service.ts');
  const pages = [
    'src/modules/data/CommunityDataUploadPage.vue',
    'src/modules/low-level-code/LowLevelCodeInspectorPage.vue',
    'src/modules/uom-conversion-detail/UomConversionDetailInspectorPage.vue',
    'src/modules/production-master-data/ProductionMasterDataPage.vue',
    'src/modules/inventory-policies/InventoryPoliciesInspectorPage.vue',
    'src/modules/transportation-lanes/TransportationLanesInspectorPage.vue',
    'src/modules/operational-planning-parameters/OperationalPlanningParametersPage.vue',
    'src/modules/historical-sellout/HistoricalSelloutReportPage.vue',
    'src/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue',
  ].map(source).join('\n');

  for (const endpoint of [
    '/api/secured/planning/demand/demandplan',
    '/api/secured/planning/supply',
    '/api/secured/supplynetwork/version',
    '/api/secured/location',
    '/api/secured/material',
    '/api/secured/unitofmeasure/findids',
    '/api/secured/configs/inventorypolicy',
  ]) {
    assert.ok(optionCatalog.includes(endpoint), `Missing shared selector endpoint ${endpoint}.`);
  }

  assert.doesNotMatch(pages, /no (?:material |location |uom )?catalog/i);
  assert.doesNotMatch(pages, /enter (?:an? )?(?:existing )?(?:supply plan|demand plan|material|location|uom|inventory policy) id/i);
  assert.doesNotMatch(pages, /(?:Supply Plan|Demand Plan|Material|Location|UOM|Inventory Policy) ID\s*<input[^>]*v-model/i);
  assert.match(pages, /loadCommunitySupplyPlans/);
  assert.match(pages, /loadCommunityMaterials/);
  assert.match(pages, /loadCommunityLocations/);
  assert.match(pages, /loadCommunityUnitOfMeasureIds/);
  assert.match(pages, /loadCommunityInventoryPolicies/);

});

test('Community keeps the Planning Front semantic control type for enumerations and sets', () => {

  const demandProfiles = source('src/modules/demand-execution-profiles/DemandExecutionProfilesInspectorPage.vue');
  const supplyProfiles = source('src/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue');
  const inventoryPolicies = source('src/modules/inventory-policies/InventoryPoliciesInspectorPage.vue');
  const inventoryOverview = source('src/modules/inventory-overview/InventoryOverviewPage.vue');
  const operationalParameters = source('src/modules/operational-planning-parameters/OperationalPlanningParametersPage.vue');

  assert.match(demandProfiles, /<OfxSelectField v-model="draft\.bucketSize"/);
  assert.match(demandProfiles, /<OfxSelectField[\s\S]*?v-model="draft\.defaultDemandPlanningUomId"/);
  assert.match(supplyProfiles, /<OfxSelectField[^>]*v-model="current\.targetStockModel"/);
  assert.match(supplyProfiles, /<OfxSelectField[\s\S]*?v-if="current\.consolidateClientDemand"[\s\S]*?v-model="current\.demandConsolidationMode"/);
  assert.match(supplyProfiles, /<OfxEntityMultiSelect[^>]*v-model="current\.inventoryPolicyIdSet"/);
  assert.match(inventoryPolicies, /<OfxSelectField v-model="rule\.modeloReabastecimento"/);
  assert.match(inventoryPolicies, /<OfxSelectField v-model="rule\.modeloOperacional"/);
  assert.match(inventoryPolicies, /<OfxSelectField v-model="rule\.calculoSafetyStock"/);
  assert.match(inventoryOverview, /<MaterialLocationScopeFilters/);
  assert.match(inventoryOverview, /v-model="initialScope"/);
  assert.match(inventoryOverview, /<OfxEntityMultiSelect v-model="analysisMaterialIds"/);
  assert.match(inventoryOverview, /<OfxEntityMultiSelect v-model="analysisLocationIds"/);
  assert.match(operationalParameters, /<OfxSelectField v-model="materialLocationDraft\.lifecycleStage"/);
  assert.match(operationalParameters, /<OfxSelectField v-model="materialLocationDraft\.defaultUomId"/);

});

test('Edition markers display the minimum commercial edition and reserve Enterprise for exclusive capabilities', () => {

  const mark = source('packages/front-shell/src/OfxEditionAvailabilityMark.vue');
  const policy = source('packages/front-shell/src/edition-navigation-policy.ts');
  const selectField = source('packages/front-shell/src/OfxSelectField.vue');
  const frontShellPackage = source('packages/front-shell/package.json');
  const applicationMain = source('src/app/main.ts');

  assert.match(mark, /props\.editionLabel === 'Enterprise'\s*\? 'Available in ENTERPRISE'\s*:\s*'Available in PRO'/);
  assert.match(mark, /props\.editionLabel === 'Enterprise' \? 'ENT' : 'PRO'/);
  assert.match(mark, /@mouseenter="showTooltip"/);
  assert.match(mark, /@focus="showTooltip"/);
  assert.match(frontShellPackage, /"\.\/styles\.css": "\.\/dist\/index\.css"/);
  assert.match(applicationMain, /import '@opsfactor\/front-shell\/styles\.css';/);
  assert.match(policy, /moduleKey === 'planning-agent' \? 'Enterprise' : 'Pro \/ Enterprise'/);
  assert.match(selectField, /enterprise\$\/i\.test\(props\.lockedLabel\)\) return 'Enterprise'/);
  assert.match(selectField, /pro\\s\*\\\/\\s\*enterprise/);

});

test('Edition-locked controls use a neutral owner state and an explicit lock glyph', () => {

  const lockIcon = source('packages/front-shell/src/OfxLockedControlIcon.vue');
  const selectField = source('packages/front-shell/src/OfxSelectField.vue');
  const textField = source('packages/front-shell/src/OfxTextField.vue');
  const toggleField = source('packages/front-shell/src/OfxToggleField.vue');
  const multiSelect = source('packages/front-shell/src/OfxEntityMultiSelect.vue');

  assert.match(lockIcon, /<rect[^>]+stroke="currentColor"/);
  assert.match(lockIcon, /<path[^>]+stroke="currentColor"/);

  for (const component of [selectField, textField, toggleField, multiSelect]) {
    assert.match(component, /OfxLockedControlIcon/);
    assert.match(component, /var\(--ofx-surface-elevated\),var\(--ofx-muted\)/);
  }

  assert.match(selectField, /const isLockedVisual = computed\(\(\) => props\.locked \|\| Boolean\(props\.disabled && props\.requiredEdition\)\)/);
  assert.match(textField, /const isLockedVisual = computed\(\(\) => props\.locked \|\| Boolean\(props\.disabled && props\.requiredEdition\)\)/);
  assert.match(toggleField, /const isLockedVisual = computed\(\(\) => props\.locked \|\| Boolean\(props\.disabled && props\.requiredEdition\)\)/);
  assert.match(multiSelect, /const isEditionLocked = computed\(\(\) => props\.disabled && Boolean\(props\.requiredEdition\)\)/);
  assert.doesNotMatch(selectField, /bg-\[color:rgb\(75_124_255_\/_0\.08\)\]/);
  assert.doesNotMatch(textField, /bg-\[color:rgb\(75_124_255_\/_0\.08\)\]/);

});
