import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, '..', '..');

const applications = [
  {
    edition: 'community',
    applicationDirectory: path.join(workspaceDirectory, 'opsfactor-community-front'),
    forbiddenApplicationDirectory: path.join(workspaceDirectory, 'opsfactor-enterprise-front'),
  },
  {
    edition: 'enterprise',
    applicationDirectory: path.join(workspaceDirectory, 'opsfactor-enterprise-front'),
    forbiddenApplicationDirectory: path.join(workspaceDirectory, 'opsfactor-community-front'),
  },
];

const sourceExtensions = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs']);
/*
 * Only edition-neutral, compiled package contracts may be shared by the two
 * applications. Product modules must never cross-import the other edition.
 */
const allowedCrossApplicationImports = new Set([
  '@opsfactor/front-core',
  '@opsfactor/front-plan-history',
  '@opsfactor/front-perspective',
  '@opsfactor/front-planning-book',
  '@opsfactor/front-processes',
  '@opsfactor/front-shell',
]);

/**
 * Recursively collects only source files. Generated bundles and dependencies are intentionally
 * excluded because this check protects the authored module graph before Vite produces chunks.
 */
async function collectSourceFiles(directory) {

  const entries = await readdir(directory, { withFileTypes: true });
  const sourceFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles.push(...await collectSourceFiles(entryPath));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      sourceFiles.push(entryPath);
    }
  }

  return sourceFiles;
}

/**
 * Reads static and dynamic module specifiers without adding an AST dependency to each front.
 * This deliberately covers import/export declarations and import('...') used by lazy routes.
 */
function extractModuleSpecifiers(source) {

  const specifiers = new Set();
  const expressions = [
    /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const expression of expressions) {
    for (const match of source.matchAll(expression)) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function isWithinDirectory(candidatePath, directory) {

  const relativePath = path.relative(directory, candidatePath);
  return relativePath !== '' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath);
}

/**
 * Checks both direct package aliases and relative paths that escape one app into the other.
 * Either app may consume an explicitly versioned neutral package, but neither app may
 * consume the other application's source tree.
 */
async function verifyModuleBoundaries(application) {

  const sourceDirectory = path.join(application.applicationDirectory, 'src');
  const sourceFiles = await collectSourceFiles(sourceDirectory);
  const violations = [];

  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, 'utf8');
    for (const specifier of extractModuleSpecifiers(source)) {
      const isForbiddenAlias = specifier.startsWith('@opsfactor/front-community')
        || specifier.startsWith('@opsfactor/front-enterprise')
        || specifier.includes('opsfactor-community-front/src')
        || specifier.includes('opsfactor-enterprise-front/src');
      const isOpsfactorPackage = specifier.startsWith('@opsfactor/');
      const isAllowedSharedPackage = allowedCrossApplicationImports.has(specifier);
      const isUnauthorizedOpsfactorPackage = isOpsfactorPackage && !isAllowedSharedPackage;
      const resolvedRelativePath = specifier.startsWith('.')
        ? path.resolve(path.dirname(sourceFile), specifier)
        : null;
      const escapesIntoForbiddenApplication = resolvedRelativePath !== null
        && isWithinDirectory(resolvedRelativePath, application.forbiddenApplicationDirectory);

      if ((isForbiddenAlias && !isAllowedSharedPackage) || isUnauthorizedOpsfactorPackage || escapesIntoForbiddenApplication) {
        violations.push(`${path.relative(workspaceDirectory, sourceFile)} imports forbidden application source: ${specifier}`);
      }
    }
  }

  return violations;
}

/**
 * The Vite applications use the legacy router at src/router/index.ts.  Old
 * parallel route registries must never become a substitute for inspecting
 * that executable entry point.
 */
async function verifyActualRouter(application) {

  const routerPath = path.join(application.applicationDirectory, 'src', 'router', 'index.ts');
  const routerSource = await readFile(routerPath, 'utf8');
  const violations = [];

  if (!routerSource.includes("import { APP_ROUTE_RECORDS } from '@/app/navigation.config';")) {
    violations.push(`${path.relative(workspaceDirectory, routerPath)} must consume the actual edition navigation registry.`);
  }
  if (!routerSource.includes('...APP_ROUTE_RECORDS')) {
    violations.push(`${path.relative(workspaceDirectory, routerPath)} does not register the actual edition route records.`);
  }
  if (application.edition === 'community'
      && (!routerSource.includes("path: '/supply-planning/deployment'")
        || !routerSource.includes("path: '/supply-planning/inventory-policies'"))) {
    violations.push(`${path.relative(workspaceDirectory, routerPath)} does not expose the documented narrow Community deployment and inventory-policy routes.`);
  }
  if (application.edition === 'community') {
    for (const documentedCommunityPath of [
      '/demand-planning/cluster-scope', '/demand-planning/demand-analysis', '/demand-planning/historical-sellout',
      '/configuration/location-cluster-planning-parameters', '/configuration/location-cluster-criteria',
      '/configuration/location-master-data', '/configuration/material-master-data', '/configuration/material-statuses',
      '/configuration/operational-planning-parameters', '/configuration/uom-conversion-detail',
      '/planning/production-master-data', '/planning/uom-conversion-gaps', '/supply-planning/dependency-explorer',
      '/supply-planning/low-level-code', '/supply-planning/material-flows', '/supply-planning/network-diagnostics',
      '/supply-planning/production-overview', '/supply-planning/transportation-lanes',
    ]) {
      if (!routerSource.includes(`path: '${documentedCommunityPath}'`)) {
        violations.push(`${path.relative(workspaceDirectory, routerPath)} does not expose the documented narrow Community route ${documentedCommunityPath}.`);
      }
    }
  }
  if (!routerSource.includes("component: () => import('@/app/pages/HomePage.vue')")) {
    violations.push(`${path.relative(workspaceDirectory, routerPath)} no longer loads the legacy Home page.`);
  }

  const staleModuleRouteDirectory = path.join(application.applicationDirectory, 'src', 'router', 'modules');
  const staleModuleRouteFiles = (await readdir(staleModuleRouteDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== 'auth.routes.ts');
  if (staleModuleRouteFiles.length > 0) {
    violations.push(`${path.relative(workspaceDirectory, staleModuleRouteDirectory)} still contains parallel module route registries instead of the executable navigation registry.`);
  }

  return violations;
}

/**
 * The legacy navigation is now the common visual foundation. Community may
 * retain private labels as disabled discovery metadata, but it must not retain
 * private page loaders or source modules merely because their menu item is
 * visible. This protects the June open-core boundary from regressing back to a
 * cosmetic-only lock.
 */
async function verifyCommunityLegacyNavigationCut() {

  const communityDirectory = path.join(workspaceDirectory, 'opsfactor-community-front');
  const navigationPath = path.join(communityDirectory, 'src', 'app', 'navigation.config.ts');
  const navigationSource = await readFile(navigationPath, 'utf8');
  const navigationPolicyPath = path.join(
    communityDirectory,
    'packages',
    'front-shell',
    'src',
    'edition-navigation-policy.ts',
  );
  const navigationPolicySource = await readFile(navigationPolicyPath, 'utf8');
  const sourceFiles = await collectSourceFiles(path.join(communityDirectory, 'src'));
  const violations = [];
  const forbiddenPageLoaders = [
    'DemandPlanChangeLogReportPage.vue', 'DemandAccuracyPage.vue', 'AutoFitModelsPage.vue', 'AutoFitConfigurationPage.vue',
    'ConstraintTrackerPage.vue', 'SupplyPlanFlowsPage.vue', 'LineSchedulingPage.vue', 'OccupationVolumesPage.vue',
    'DeploymentPage.vue', 'DrpParametrizationPage.vue', 'FreightCostPage.vue', 'SalesBaricenterPage.vue',
    'PlanComparisonPage.vue', 'InventoryOptimizationPage.vue', 'AlertsPage.vue', 'ReportsPage.vue',
    'PriceSimulationPage.vue', 'ElasticityPage.vue', 'AssortmentPage.vue',
    'PlanningAgentChatPage.vue', 'SalesCurvesPage.vue', 'TransportationLinePage.vue', 'ProductLocationPage.vue',
    'ConfigurationProductionPage.vue', 'ClusteringPage.vue', 'MaterialFilterPage.vue', 'ProductDetailsPage.vue',
    'UserSettingsPage.vue', 'SettingsPage.vue',
  ];

  for (const pageLoader of forbiddenPageLoaders) {
    if (navigationSource.includes(pageLoader)) {
      violations.push(`Community legacy navigation still loads private page ${pageLoader}.`);
    }
  }

  const sharedNavigationFactoryPath = path.join(
    communityDirectory,
    'packages',
    'front-shell',
    'src',
    'legacy-navigation.ts',
  );
  const sharedNavigationFactorySource = await readFile(sharedNavigationFactoryPath, 'utf8');
  if (!navigationSource.includes('createLegacyNavigation')
      || !navigationSource.includes("from '@opsfactor/front-shell';")
      || !navigationSource.includes('edition: APPLICATION_EDITION')
      || !sharedNavigationFactorySource.includes('isEnterpriseNavigationItem(edition, moduleKey, pageKey)')) {
    violations.push('Community legacy navigation does not consume the Community-owned June Enterprise policy through the shared navigation factory.');
  }
  const sharedSidebarPath = path.join(communityDirectory, 'packages', 'front-shell', 'src', 'OpsFactorLegacySidebar.vue');
  const sharedSidebarSource = await readFile(sharedSidebarPath, 'utf8');
  if (!sharedSidebarSource.includes("from './navigation-icons';")
      || sharedSidebarSource.includes('function iconForModule(')
      || sharedSidebarSource.includes('function iconForSection(')
      || sharedSidebarSource.includes('function iconForPage(')) {
    violations.push('Community front-shell sidebar does not reuse the canonical legacy icon vocabulary.');
  }
  if (navigationSource.includes('const legacyNavigationModules:')
      || navigationSource.includes('function decorateEditionAvailability(')
      || navigationSource.includes('function createRouteMeta(')) {
    violations.push('Community host still owns a duplicated legacy navigation taxonomy instead of supplying only edition loaders.');
  }
  for (const requiredSharedNavigationContract of [
    'const legacyNavigationModules:',
    'function decorateEditionAvailability(',
    'function createRouteMeta(',
    'export function createLegacyNavigation(',
  ]) {
    if (!sharedNavigationFactorySource.includes(requiredSharedNavigationContract)) {
      violations.push(`Community front-shell navigation factory is missing ${requiredSharedNavigationContract}.`);
    }
  }
  const expectedEnterprisePolicyEntries = [
    'ENTERPRISE_NAVIGATION_MODULE_KEYS', 'ENTERPRISE_NAVIGATION_PAGE_KEYS',
    'distribution', 'visibility', 'pricing', 'planning-agent',
    'demand-plan-change-log-report', 'demand-demand-accuracy', 'demand-autofit-models', 'demand-autofit-configuration',
    'supply-constraint-tracker', 'supply-supply-plan-flows',
    'production-line-scheduling',
    'configuration-sales-curves', 'configuration-transportation-line', 'configuration-product-location',
    'configuration-production', 'configuration-material-filter', 'configuration-product-details',
    'admin-user-settings', 'admin-settings',
  ];
  for (const expectedEnterprisePolicyEntry of expectedEnterprisePolicyEntries) {
    if (!navigationPolicySource.includes(expectedEnterprisePolicyEntry)) {
      violations.push(`Community navigation policy omits the June Enterprise cut ${expectedEnterprisePolicyEntry}.`);
    }
  }
  if (navigationPolicySource.includes("'supply-network-explorer'")) {
    violations.push('Supply Network Explorer is incorrectly gated as Enterprise instead of Community.');
  }
  if (!navigationSource.includes("'supply-network-explorer': () => import('@/modules/supply-network/pages/SupplyNetworkExplorerPage.vue')")) {
    violations.push('Community navigation does not expose the canonical Supply Network Explorer page.');
  }
  if (!sharedNavigationFactorySource.includes("filter((page) => page.availableInCurrentRuntime !== false)")) {
    violations.push('Community route registry does not exclude unavailable legacy pages through the shared navigation factory.');
  }
  if (navigationSource.includes("@/modules/visibility/pages/InventoryOverviewPage.vue")) {
    violations.push('Community legacy navigation still imports the legacy Inventory Overview instead of the Community physical-inventory contract.');
  }
  if (!navigationSource.includes("@/modules/inventory-overview/InventoryOverviewPage.vue")) {
    violations.push('Community navigation does not expose the canonical Community Inventory Overview page.');
  }
  if (navigationSource.includes("@/modules/data/pages/DataDownloadUploadPage.vue")) {
    violations.push('Community navigation still imports the full legacy Data Operations page instead of the Community data catalog.');
  }
  if (!navigationSource.includes("@/modules/data/CommunityDataUploadPage.vue")) {
    violations.push('Community navigation does not expose the canonical Community data catalog.');
  }
  if (navigationSource.includes('DATA_OPERATION_SEARCH_ENTRIES')) {
    violations.push('Community navigation still exposes legacy Enterprise data-operation search entries.');
  }
  const communitySalesOverviewPath = path.join(communityDirectory, 'src', 'modules', 'demand-planning', 'pages', 'SalesDemandOverviewPage.vue');
  const communitySalesOverviewSource = await readFile(communitySalesOverviewPath, 'utf8');
  if (communitySalesOverviewSource.includes("{ label: 'Sell-in', value: 'Sell-in' }")
      || communitySalesOverviewSource.includes("{ label: 'Sales Orders', value: 'Sales Orders' }")) {
    violations.push('Community Sales/Demand Overview still offers Enterprise historical sales sources.');
  }
  const communitySalesOverviewServicePath = path.join(communityDirectory, 'src', 'modules', 'demand-planning', 'services', 'sales-demand-overview.service.ts');
  const communitySalesOverviewServiceSource = await readFile(communitySalesOverviewServicePath, 'utf8');
  if (!communitySalesOverviewServiceSource.includes("'/api/secured/planning/demand/overview'")) {
    violations.push('Community Sales/Demand Overview does not consume its canonical quantitative endpoint.');
  }
  if (communitySalesOverviewServiceSource.includes('demandplanandsaleshistory')) {
    violations.push('Community Sales/Demand Overview still calls the broad legacy BI endpoint.');
  }
  if (communitySalesOverviewSource.includes('Gross Sales')
      || communitySalesOverviewSource.includes('Net Sales')) {
    violations.push('Community Sales/Demand Overview still exposes monetary metrics.');
  }
  const canonicalCommunityPageLoaders = [
    '@/modules/demand-planning/DemandPlanningBookCommunityPage.vue',
    '@/modules/supply-planning/SupplyPlanningBookCommunityPage.vue',
    '@/modules/production-planning/ProductionPlanningBookCommunityPage.vue',
    '@/modules/planning-books/UserViewsCommunityPage.vue',
    '@/modules/production-overview/ProductionOverviewPage.vue',
    '@/modules/processes/pages/ProcessExecutionPage.vue',
    '@/modules/demand-planning/ClusterLevelConfigurationCommunityPage.vue',
    '@/modules/demand-execution-profiles/DemandExecutionProfilesInspectorPage.vue',
    '@/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue',
    '@/modules/configuration/GlobalParametersCommunityPage.vue',
    '@/modules/user-administration/CommunityUserAdministrationPage.vue',
  ];
  for (const pageLoader of canonicalCommunityPageLoaders) {
    if (!navigationSource.includes(pageLoader)) {
      violations.push(`Community navigation does not expose canonical page ${pageLoader}.`);
    }
  }
  const legacyCommunityLoadersWithEnterpriseCalls = [
    '@/modules/demand-planning/pages/ClusterLevelConfigurationPage.vue',
    '@/modules/demand-planning/pages/DemandExecutionProfilesPage.vue',
    '@/modules/supply-network/pages/ExecutionProfilesPage.vue',
    '@/modules/configuration/pages/GlobalParametersPage.vue',
    '@/modules/admin/pages/UsersPage.vue',
  ];
  for (const pageLoader of legacyCommunityLoadersWithEnterpriseCalls) {
    if (navigationSource.includes(pageLoader)) {
      violations.push(`Community navigation still imports broad legacy page ${pageLoader}.`);
    }
  }

  const forbiddenSourceDirectories = [
    'modules/distribution',
    'modules/pricing',
    'modules/planning-agent',
    'modules/visibility',
    // The Community Data screen is CommunityDataUploadPage. The generic
    // workspace below carried the full Enterprise operation taxonomy.
    'modules/data/components',
    'modules/data/composables',
    'modules/data/models',
    'modules/data/services',
  ];
  for (const directory of forbiddenSourceDirectories) {
    if (sourceFiles.some((sourceFile) => sourceFile.includes(`${path.sep}${directory.replace('/', path.sep)}${path.sep}`))) {
      violations.push(`Community source still contains private module files under src/${directory}.`);
    }
  }

  const forbiddenCommunitySourceFiles = [
    'components/ofx/data-operations/OfxDataTopicWorkspace.vue',
    'modules/data/pages/DataDownloadUploadPage.vue',
    'modules/data/pages/DataPage.vue',
    'modules/data/pages/PlanningDataPage.vue',
    'modules/demand-planning/components/AutoFitBinaryTreeNode.vue',
    'modules/demand-planning/components/AutoFitBinaryTreePanel.vue',
    'modules/demand-planning/pages/ClusterLevelConfigurationPage.vue',
    'modules/demand-planning/pages/DemandExecutionProfilesPage.vue',
    'modules/demand-planning/pages/PlanningBookPage.vue',
    'modules/demand-planning/services/auto-fit-configuration.service.ts',
    'modules/demand-planning/services/auto-fit-models.service.ts',
    'modules/demand-planning/services/demand-accuracy.service.ts',
  ];
  for (const sourceFile of forbiddenCommunitySourceFiles) {
    if (sourceFiles.some((candidate) => candidate.endsWith(sourceFile.replace('/', path.sep)))) {
      violations.push(`Community source still contains the Enterprise-only transplant ${sourceFile}.`);
    }
  }

  return violations;

}

/**
 * The actual legacy rail is the first shared visual primitive.  Keeping this
 * assertion close to the edition boundary prevents a package.json-only
 * dependency while the Enterprise source silently resumes a copied component.
 */
async function verifySharedLegacyShellPrimitive() {

  const sidebarRelativePath = path.join('src', 'layouts', 'app-shell', 'AppSidebar.vue');
  const topbarRelativePath = path.join('src', 'layouts', 'app-shell', 'AppTopbar.vue');
  const moduleSubnavRelativePath = path.join('src', 'layouts', 'app-shell', 'AppModuleSubnav.vue');
  const appShellRelativePath = path.join('src', 'layouts', 'app-shell', 'AppShell.vue');
  const expectedSidebarImport = "import { OpsFactorLegacySidebar } from '@opsfactor/front-shell';";
  const expectedTopbarImport = "import { OpsFactorLegacyTopbar } from '@opsfactor/front-shell';";
  const topbarSearchRelativePath = path.join('src', 'layouts', 'app-shell', 'AppTopbarSearch.vue');
  const expectedTopbarSearchImport = "import { OpsFactorTopbarSearch } from '@opsfactor/front-shell';";
  const expectedModuleSubnavImport = "import { OpsFactorLegacyModuleSubnav } from '@opsfactor/front-shell';";
  const expectedAppFrameImport = "import { OpsFactorLegacyAppFrame } from '@opsfactor/front-shell';";
  const navigationIconsRelativePath = path.join('src', 'app', 'navigation-icons.ts');
  const navigationConfigRelativePath = path.join('src', 'app', 'navigation.config.ts');
  const homeRelativePath = path.join('src', 'app', 'pages', 'HomePage.vue');
  const violations = [];

  for (const application of applications) {
    const sidebarPath = path.join(application.applicationDirectory, sidebarRelativePath);
    const sidebarSource = await readFile(sidebarPath, 'utf8');
    if (!sidebarSource.includes(expectedSidebarImport)) {
      violations.push(`${path.relative(workspaceDirectory, sidebarPath)} must consume OpsFactorLegacySidebar from the Community front-shell package.`);
    }
    if (sidebarSource.includes("@/components/ofx/navigation/OfxNavigationIcon.vue")) {
      violations.push(`${path.relative(workspaceDirectory, sidebarPath)} still imports the copied local navigation icon instead of the shared rail.`);
    }

    const topbarPath = path.join(application.applicationDirectory, topbarRelativePath);
    const topbarSource = await readFile(topbarPath, 'utf8');
    if (!topbarSource.includes(expectedTopbarImport)) {
      violations.push(`${path.relative(workspaceDirectory, topbarPath)} must consume OpsFactorLegacyTopbar from the Community front-shell package.`);
    }

    const topbarSearchPath = path.join(application.applicationDirectory, topbarSearchRelativePath);
    const topbarSearchSource = await readFile(topbarSearchPath, 'utf8');
    if (!topbarSearchSource.includes(expectedTopbarSearchImport)
        || !topbarSearchSource.includes('<OpsFactorTopbarSearch')
        || !topbarSearchSource.includes(':theme-mode="themeStore.mode"')) {
      violations.push(`${path.relative(workspaceDirectory, topbarSearchPath)} must be a thin themed adapter to the Community-owned OpsFactorTopbarSearch.`);
    }

    const moduleSubnavPath = path.join(application.applicationDirectory, moduleSubnavRelativePath);
    const moduleSubnavSource = await readFile(moduleSubnavPath, 'utf8');
    if (!moduleSubnavSource.includes(expectedModuleSubnavImport)) {
      violations.push(`${path.relative(workspaceDirectory, moduleSubnavPath)} must consume OpsFactorLegacyModuleSubnav from the Community front-shell package.`);
    }

    const appShellPath = path.join(application.applicationDirectory, appShellRelativePath);
    const appShellSource = await readFile(appShellPath, 'utf8');
    if (!appShellSource.includes(expectedAppFrameImport)) {
      violations.push(`${path.relative(workspaceDirectory, appShellPath)} must consume OpsFactorLegacyAppFrame from the Community front-shell package.`);
    }
    if (appShellSource.includes("import AppContentFrame from './AppContentFrame.vue';")) {
      violations.push(`${path.relative(workspaceDirectory, appShellPath)} still owns a copied AppContentFrame instead of the shared legacy frame.`);
    }

    const navigationIconsPath = path.join(application.applicationDirectory, navigationIconsRelativePath);
    const navigationIconsSource = await readFile(navigationIconsPath, 'utf8');
    if (!navigationIconsSource.includes("from '@opsfactor/front-shell';")) {
      violations.push(`${path.relative(workspaceDirectory, navigationIconsPath)} must consume the icon vocabulary from the Community front-shell package.`);
    }
    if (navigationIconsSource.includes('AppModuleKey') || navigationIconsSource.includes('function getModuleIconName')) {
      violations.push(`${path.relative(workspaceDirectory, navigationIconsPath)} still owns a copied navigation-icon policy.`);
    }

    const navigationConfigPath = path.join(application.applicationDirectory, navigationConfigRelativePath);
    const navigationConfigSource = await readFile(navigationConfigPath, 'utf8');
    if (!navigationConfigSource.includes('createLegacyNavigation')
        || !navigationConfigSource.includes("from '@opsfactor/front-shell';")
        || navigationConfigSource.includes('const legacyNavigationModules:')) {
      violations.push(`${path.relative(workspaceDirectory, navigationConfigPath)} must consume the Community navigation factory rather than own a taxonomy copy.`);
    }

    const homePath = path.join(application.applicationDirectory, homeRelativePath);
    const homeSource = await readFile(homePath, 'utf8');
    if (!homeSource.includes("import { OpsFactorWorkspaceHome } from '@opsfactor/front-shell';")
        || !homeSource.includes('<OpsFactorWorkspaceHome')) {
      violations.push(`${path.relative(workspaceDirectory, homePath)} must consume the Community-owned legacy workspace Home.`);
    }
  }

  return violations;

}

/**
 * Common visual primitives belong to the compiled Community foundation.
 * Neither application may quietly grow a local copy after the initial
 * migration has established one source of truth.
 */
async function verifySharedPagePrimitives() {

  const sharedPrimitives = [
    { relativePath: path.join('layouts', 'page', 'TaskPageLayout.vue'), name: 'TaskPageLayout' },
    { relativePath: path.join('components', 'ofx', 'layout', 'OfxPageHeader.vue'), name: 'OfxPageHeader' },
    { relativePath: path.join('components', 'ofx', 'surfaces', 'OfxSectionCard.vue'), name: 'OfxSectionCard' },
    { relativePath: path.join('components', 'ofx', 'feedback', 'OfxEmptyState.vue'), name: 'OfxEmptyState' },
    { relativePath: path.join('components', 'ofx', 'feedback', 'OfxLoadingState.vue'), name: 'OfxLoadingState' },
    { relativePath: path.join('components', 'ofx', 'overlays', 'OfxConfirmDialog.vue'), name: 'OfxConfirmDialog' },
    { relativePath: path.join('components', 'ofx', 'analytics', 'OfxKpiCard.vue'), name: 'OfxKpiCard' },
    { relativePath: path.join('components', 'ofx', 'data-display', 'OfxTableCellText.vue'), name: 'OfxTableCellText' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxFilterBar.vue'), name: 'OfxFilterBar' },
  ];
  const violations = [];
  const sharedFormAdapters = [
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxTextField.vue'), name: 'OfxTextField' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxToggleField.vue'), name: 'OfxToggleField' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxDateField.vue'), name: 'OfxDateField' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxSelectField.vue'), name: 'OfxSelectField' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxPeriodPicker.vue'), name: 'OfxPeriodPicker' },
    { relativePath: path.join('components', 'ofx', 'data-display', 'OfxColumnManagerDrawer.vue'), name: 'OfxColumnManagerDrawer' },
    { relativePath: path.join('wrappers', 'primevue', 'multi-select', 'PrimeMultiSelectAdapter.vue'), name: 'OfxPrimeMultiSelectAdapter' },
    { relativePath: path.join('components', 'ofx', 'data-entry', 'OfxEntityMultiSelect.vue'), name: 'OfxEntityMultiSelect' },
    { relativePath: path.join('components', 'ofx', 'data-entry', 'OfxDateRangePicker.vue'), name: 'OfxDateRangePicker' },
    { relativePath: path.join('components', 'ofx', 'data-operations', 'OfxDownloadSplitButton.vue'), name: 'OfxDownloadSplitButton' },
    { relativePath: path.join('components', 'ofx', 'data-display', 'OfxTableToolbar.vue'), name: 'OfxTableToolbar' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxActiveFilterChips.vue'), name: 'OfxActiveFilterChips' },
    { relativePath: path.join('components', 'ofx', 'forms', 'OfxFilterDrawer.vue'), name: 'OfxFilterDrawer' },
    { relativePath: path.join('components', 'ofx', 'data-display', 'OfxContextSummary.vue'), name: 'OfxContextSummary' },
    { relativePath: path.join('components', 'ofx', 'data-operations', 'OfxOperationFilters.vue'), name: 'OfxOperationFilters' },
    { relativePath: path.join('wrappers', 'ag-grid', 'renderers', 'AgGridCellRenderer.vue'), name: 'OfxAgGridCellRenderer' },
    { relativePath: path.join('components', 'ofx', 'surfaces', 'OfxCard.vue'), name: 'OfxCard' },
    { relativePath: path.join('layouts', 'page', 'DetailsPageLayout.vue'), name: 'DetailsPageLayout' },
    { relativePath: path.join('layouts', 'page', 'ReportPageLayout.vue'), name: 'ReportPageLayout' },
    { relativePath: path.join('wrappers', 'echarts', 'EChartAdapter.vue'), name: 'EChartAdapter' },
  ];
  const sharedStateAdapters = [
    { relativePath: path.join('layouts', 'page', 'DashboardPageLayout.vue'), name: 'OpsFactorDashboardPageLayout' },
    { relativePath: path.join('components', 'ofx', 'feedback', 'OfxNotificationCenter.vue'), name: 'OfxNotificationCenter' },
  ];
  const apiDocumentationPageRelativePath = path.join('modules', 'data', 'pages', 'ApiDocumentationRedirectPage.vue');
  const moduleWorkspacePageRelativePath = path.join('layouts', 'page', 'ModuleWorkspacePage.vue');
  const legacyScreenPageRelativePath = path.join('components', 'ofx', 'navigation', 'OfxLegacyScreenPage.vue');

  for (const application of applications) {
    const copiedApiDocumentationPage = path.join(application.applicationDirectory, 'src', apiDocumentationPageRelativePath);
    try {
      await readFile(copiedApiDocumentationPage, 'utf8');
      violations.push(`${path.relative(workspaceDirectory, copiedApiDocumentationPage)} duplicates the API documentation redirect owned by the Community front-shell package.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const copiedModuleWorkspacePage = path.join(application.applicationDirectory, 'src', moduleWorkspacePageRelativePath);
    try {
      await readFile(copiedModuleWorkspacePage, 'utf8');
      violations.push(`${path.relative(workspaceDirectory, copiedModuleWorkspacePage)} duplicates the module-workspace route owned by the Community front-shell package.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const legacyScreenPagePath = path.join(application.applicationDirectory, 'src', legacyScreenPageRelativePath);
    const legacyScreenPageSource = await readFile(legacyScreenPagePath, 'utf8');
    if (!legacyScreenPageSource.includes("import { OpsFactorLegacyScreenPage } from '@opsfactor/front-shell';")
        || !legacyScreenPageSource.includes(':theme-mode="themeStore.mode"')
        || legacyScreenPageSource.includes('function toneClasses(')
        || legacyScreenPageSource.includes('<TaskPageLayout>')) {
      violations.push(`${path.relative(workspaceDirectory, legacyScreenPagePath)} must remain a typed theme adapter to the Community-owned OpsFactorLegacyScreenPage.`);
    }
    for (const sharedPrimitive of sharedPrimitives) {
      const copiedPrimitivePath = path.join(application.applicationDirectory, 'src', sharedPrimitive.relativePath);
      try {
        await readFile(copiedPrimitivePath, 'utf8');
        violations.push(`${path.relative(workspaceDirectory, copiedPrimitivePath)} duplicates a page primitive owned by the Community front-shell package.`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }

    const sourceFiles = await collectSourceFiles(path.join(application.applicationDirectory, 'src'));
    const sharedFeaturePackageSourceFiles = (await Promise.all([
      'front-plan-history',
      'front-processes',
    ].map((packageName) => collectSourceFiles(path.join(
      workspaceDirectory,
      'opsfactor-community-front',
      'packages',
      packageName,
      'src',
    ))))).flat();
    for (const sharedPrimitive of sharedPrimitives) {
      const { name: primitiveName } = sharedPrimitive;
      const primitiveConsumers = [];
      for (const sourceFile of [...sourceFiles, ...sharedFeaturePackageSourceFiles]) {
        const source = await readFile(sourceFile, 'utf8');
        if (source.includes(`import { ${primitiveName} } from '@opsfactor/front-shell';`)) {
          primitiveConsumers.push(sourceFile);
        }
      }
      if (primitiveConsumers.length === 0) {
        violations.push(`${application.edition} does not consume shared ${primitiveName} from the Community front-shell package.`);
      }
    }

    for (const sharedFormAdapter of sharedFormAdapters) {
      const adapterPath = path.join(application.applicationDirectory, 'src', sharedFormAdapter.relativePath);
      const adapterSource = await readFile(adapterPath, 'utf8');
      const requiresThemeInjection = sharedFormAdapter.name === 'EChartAdapter'
        || sharedFormAdapter.name === 'OfxColumnManagerDrawer'
        || (['OfxSelectField', 'OfxPrimeMultiSelectAdapter', 'OfxEntityMultiSelect', 'OfxDateRangePicker', 'OfxDownloadSplitButton', 'OfxTableToolbar'].includes(sharedFormAdapter.name)
          && application.edition === 'enterprise');
      const usesSharedFormAdapter = requiresThemeInjection
        ? adapterSource.includes(`import { ${sharedFormAdapter.name} } from '@opsfactor/front-shell';`)
          && adapterSource.includes(':theme-mode="themeStore.mode"')
        : adapterSource.includes(`export { ${sharedFormAdapter.name} as default } from '@opsfactor/front-shell';`);
      if (!usesSharedFormAdapter) {
        violations.push(`${path.relative(workspaceDirectory, adapterPath)} must be a thin adapter to the Community-owned ${sharedFormAdapter.name}.`);
      }
    }

    for (const sharedStateAdapter of sharedStateAdapters) {
      const adapterPath = path.join(application.applicationDirectory, 'src', sharedStateAdapter.relativePath);
      const adapterSource = await readFile(adapterPath, 'utf8');
      const requiredBinding = sharedStateAdapter.name === 'OpsFactorDashboardPageLayout'
        ? ':immersive-workspace="navigationStore.immersiveWorkspace"'
        : sharedStateAdapter.name === 'OpsFactorModuleWorkspace'
          ? ':module-info="moduleInfo"'
          : ':items="items"';
      if (!adapterSource.includes(`import { ${sharedStateAdapter.name}`)
          || !adapterSource.includes("from '@opsfactor/front-shell';")
          || !adapterSource.includes(requiredBinding)) {
        violations.push(`${path.relative(workspaceDirectory, adapterPath)} must inject host navigation state into the Community-owned ${sharedStateAdapter.name}.`);
      }
    }

    const navigationConfigPath = path.join(application.applicationDirectory, 'src', 'app', 'navigation.config.ts');
    const navigationConfigSource = await readFile(navigationConfigPath, 'utf8');
    if (!navigationConfigSource.includes('OpsFactorModuleWorkspaceRoute')
        || !navigationConfigSource.includes('moduleOverviewComponent: OpsFactorModuleWorkspaceRoute')) {
      violations.push(`${path.relative(workspaceDirectory, navigationConfigPath)} must use the Community-owned module-workspace route directly.`);
    }
  }

  return violations;

}

/**
 * Every executable Enterprise page kept from the legacy front must be selected
 * by the Community-owned catalogue. Every catalogue item needs an executable
 * loader; a generic placeholder route is prohibited.
 */
async function verifyExecutableLoaderCoverage() {

  const communityDirectory = path.join(workspaceDirectory, 'opsfactor-community-front');
  const enterpriseDirectory = path.join(workspaceDirectory, 'opsfactor-enterprise-front');
  const sharedNavigationPath = path.join(communityDirectory, 'packages', 'front-shell', 'src', 'legacy-navigation.ts');
  const communityNavigationPath = path.join(communityDirectory, 'src', 'app', 'navigation.config.ts');
  const enterpriseNavigationPath = path.join(enterpriseDirectory, 'src', 'app', 'navigation.config.ts');
  const [sharedNavigationSource, communityNavigationSource, enterpriseNavigationSource] = await Promise.all([
    readFile(sharedNavigationPath, 'utf8'),
    readFile(communityNavigationPath, 'utf8'),
    readFile(enterpriseNavigationPath, 'utf8'),
  ]);
  const extractLoaderKeys = (source) => [...source.matchAll(/'([^']+)':\s*(?:\(\)\s*=>\s*import|[A-Za-z_]\w*)/g)].map((match) => match[1]);
  const sharedComponentKeys = new Set([...sharedNavigationSource.matchAll(/componentKey: '([^']+)'/g)].map((match) => match[1]));
  const communityLoaderKeys = extractLoaderKeys(communityNavigationSource);
  const enterpriseLoaderKeys = extractLoaderKeys(enterpriseNavigationSource);
  const enterpriseLoaderKeySet = new Set(enterpriseLoaderKeys);
  const violations = [];

  if (sharedNavigationSource.includes('legacyRouteComponent')
      || sharedNavigationSource.includes('componentKey?:')) {
    violations.push('Shared executable navigation must require a concrete component key and cannot retain a generic LegacyRoutePage fallback.');
  }

  for (const loaderKey of communityLoaderKeys) {
    if (!sharedComponentKeys.has(loaderKey)) {
      violations.push(`Community loader ${loaderKey} is not selected by the shared executable navigation catalogue.`);
    }
  }
  for (const loaderKey of enterpriseLoaderKeys) {
    if (!sharedComponentKeys.has(loaderKey)) {
      violations.push(`Enterprise loader ${loaderKey} is not selected by the shared executable navigation catalogue.`);
    }
  }
  for (const componentKey of sharedComponentKeys) {
    if (!enterpriseLoaderKeySet.has(componentKey)) {
      violations.push(`Shared executable navigation item ${componentKey} has no Enterprise loader.`);
    }
  }

  return violations;

}

/**
 * Community feature pages must compose the legacy shell primitives instead of
 * silently recreating the pre-migration workspace root. This is intentionally
 * source-level: a successful build alone cannot distinguish a shared page
 * frame from a visually divergent local `<main class="workspace">`.
 */
async function verifyCommunityPageFrameOwnership() {

  const communitySourceDirectory = path.join(workspaceDirectory, 'opsfactor-community-front', 'src');
  const sourceFiles = await collectSourceFiles(communitySourceDirectory);
  const violations = [];

  for (const sourceFile of sourceFiles.filter((candidate) => candidate.endsWith('.vue'))) {
    const source = await readFile(sourceFile, 'utf8');
    if (source.includes('<main class="workspace') && !source.includes('<TaskPageLayout')) {
      violations.push(`${path.relative(workspaceDirectory, sourceFile)} recreates the retired local workspace root instead of consuming TaskPageLayout.`);
    }
  }

  return violations;

}

/**
 * Enterprise is allowed to add private feature pages, but its executable
 * routes must still inherit the legacy frame instead of reviving the local
 * workspace root. Non-routed experimental modules are deliberately outside
 * this check; the source of truth is the actual navigation registry.
 */
async function verifyEnterpriseExecutablePageFrameOwnership() {

  const enterpriseDirectory = path.join(workspaceDirectory, 'opsfactor-enterprise-front');
  const navigationPath = path.join(enterpriseDirectory, 'src', 'app', 'navigation.config.ts');
  const navigationSource = await readFile(navigationPath, 'utf8');
  const violations = [];

  for (const match of navigationSource.matchAll(/import\('@\/([^']+\.vue)'\)/g)) {
    const pagePath = path.join(enterpriseDirectory, 'src', match[1]);
    const pageSource = await readFile(pagePath, 'utf8');
    if (pageSource.includes('<main class="workspace') && !pageSource.includes('<TaskPageLayout')) {
      violations.push(`${path.relative(workspaceDirectory, pagePath)} recreates the retired local workspace root in an executable Enterprise route.`);
    }
  }

  return violations;

}

/**
 * Shared Vue packages use Tailwind utility classes. The host scanner must keep
 * their source directories in scope; otherwise production purging removes
 * responsive shell classes and the desktop rail silently disappears.
 */
async function verifySharedTailwindContent() {

  const expectedConfigEntries = [
    {
      configPath: path.join(workspaceDirectory, 'opsfactor-community-front', 'tailwind.config.ts'),
      sourceEntries: [
        './packages/front-core/src/**/*.{vue,ts}',
        './packages/front-plan-history/src/**/*.{vue,ts}',
        './packages/front-perspective/src/**/*.{vue,ts}',
        './packages/front-shell/src/**/*.{vue,ts}',
        './packages/front-planning-book/src/**/*.{vue,ts}',
        './packages/front-processes/src/**/*.{vue,ts}',
      ],
    },
    {
      configPath: path.join(workspaceDirectory, 'opsfactor-enterprise-front', 'tailwind.config.ts'),
      sourceEntries: [
        '../opsfactor-community-front/packages/front-core/src/**/*.{vue,ts}',
        '../opsfactor-community-front/packages/front-plan-history/src/**/*.{vue,ts}',
        '../opsfactor-community-front/packages/front-perspective/src/**/*.{vue,ts}',
        '../opsfactor-community-front/packages/front-shell/src/**/*.{vue,ts}',
        '../opsfactor-community-front/packages/front-planning-book/src/**/*.{vue,ts}',
        '../opsfactor-community-front/packages/front-processes/src/**/*.{vue,ts}',
      ],
    },
  ];
  const violations = [];

  for (const expectedConfig of expectedConfigEntries) {
    const source = await readFile(expectedConfig.configPath, 'utf8');
    for (const sourceEntry of expectedConfig.sourceEntries) {
      if (!source.includes(sourceEntry)) {
        violations.push(`${path.relative(workspaceDirectory, expectedConfig.configPath)} must scan ${sourceEntry} so shared shell classes survive the production build.`);
      }
    }
  }

  return violations;

}

const violations = [];
for (const application of applications) {
  violations.push(...await verifyModuleBoundaries(application));
  violations.push(...await verifyActualRouter(application));
}
violations.push(...await verifyCommunityLegacyNavigationCut());
violations.push(...await verifySharedLegacyShellPrimitive());
violations.push(...await verifySharedPagePrimitives());
violations.push(...await verifyExecutableLoaderCoverage());
violations.push(...await verifyCommunityPageFrameOwnership());
violations.push(...await verifyEnterpriseExecutablePageFrameOwnership());
violations.push(...await verifySharedTailwindContent());

if (violations.length > 0) {
  console.error('Edition boundary verification failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log('Edition boundary verification passed for Community and Enterprise executable routers and shared shell contracts.');
}
