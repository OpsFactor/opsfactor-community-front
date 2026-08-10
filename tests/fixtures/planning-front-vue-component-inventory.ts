export type PlanningFrontComponentDisposition =
  | 'edition-host'
  | 'shared-package'
  | 'community-adapter'
  | 'enterprise-host'
  | 'approved-retirement';

export interface PlanningFrontComponentDestination {
  workspace: 'community' | 'enterprise' | 'shared-package';
  path: string;
}

export interface PlanningFrontComponentInventoryEntry {
  referencePath: string;
  disposition: PlanningFrontComponentDisposition;
  destinations: PlanningFrontComponentDestination[];
  rationale: string;
}

const editionHostComponents = [
  'app/App.vue',
  'app/pages/HomePage.vue',
  'components/ofx/data-display/OfxColumnManagerDrawer.vue',
  'components/ofx/data-display/OfxContextSummary.vue',
  'components/ofx/data-display/OfxDataTable.vue',
  'components/ofx/data-display/OfxPivotTable.vue',
  'components/ofx/data-display/OfxTableToolbar.vue',
  'components/ofx/data-entry/OfxDateRangePicker.vue',
  'components/ofx/data-entry/OfxEntityMultiSelect.vue',
  'components/ofx/data-operations/OfxDownloadSplitButton.vue',
  'components/ofx/data-operations/OfxOperationFilters.vue',
  'components/ofx/data-operations/filters/OfxDateRangeFilter.vue',
  'components/ofx/data-operations/filters/OfxLocationCharacteristicsFilter.vue',
  'components/ofx/data-operations/filters/OfxLocationsFilter.vue',
  'components/ofx/data-operations/filters/OfxMaterialCharacteristicsFilter.vue',
  'components/ofx/data-operations/filters/OfxMaterialsFilter.vue',
  'components/ofx/feedback/OfxNotificationCenter.vue',
  'components/ofx/forms/OfxActiveFilterChips.vue',
  'components/ofx/forms/OfxDateField.vue',
  'components/ofx/forms/OfxFilterDrawer.vue',
  'components/ofx/forms/OfxPeriodPicker.vue',
  'components/ofx/forms/OfxSelectField.vue',
  'components/ofx/forms/OfxTextField.vue',
  'components/ofx/forms/OfxToggleField.vue',
  'components/ofx/navigation/OfxLegacyScreenPage.vue',
  'components/ofx/planning/OfxSupplyDependencyGraph.vue',
  'components/ofx/planning/OfxSupplyDependencyNode.vue',
  'components/ofx/surfaces/OfxCard.vue',
  'layouts/app-shell/AppModuleSubnav.vue',
  'layouts/app-shell/AppShell.vue',
  'layouts/app-shell/AppSidebar.vue',
  'layouts/app-shell/AppTopbar.vue',
  'layouts/app-shell/AppTopbarSearch.vue',
  'layouts/page/DashboardPageLayout.vue',
  'layouts/page/DetailsPageLayout.vue',
  'layouts/page/LegacyRoutePage.vue',
  'layouts/page/ModuleLandingPage.vue',
  'layouts/page/ReportPageLayout.vue',
  'modules/auth/pages/LoginPage.vue',
  'modules/demand-planning/pages/DemandPlansPage.vue',
  'modules/demand-planning/pages/SalesDemandOverviewPage.vue',
  'modules/processes/pages/ProcessExecutionPage.vue',
  'modules/processes/pages/ProcessStatusPage.vue',
  'modules/supply-network/pages/SupplyNetworkExplorerPage.vue',
  'modules/supply-network/pages/SupplyPlansPage.vue',
  'wrappers/ag-grid/AgGridTableAdapter.vue',
  'wrappers/ag-grid/renderers/AgGridCellRenderer.vue',
  'wrappers/echarts/EChartAdapter.vue',
  'wrappers/filepond/FilePondAdapter.vue',
  'wrappers/perspective/PerspectivePivotAdapter.vue',
  'wrappers/primevue/data-table/PrimeDataTableAdapter.vue',
  'wrappers/primevue/multi-select/PrimeMultiSelectAdapter.vue',
] as const;

const sharedPackageComponents = {
  'components/ofx/analytics/OfxKpiCard.vue': 'packages/front-shell/src/OfxKpiCard.vue',
  'components/ofx/data-display/OfxTableCellText.vue': 'packages/front-shell/src/OfxTableCellText.vue',
  'components/ofx/data-operations/OfxDataTopicWorkspace.vue': 'packages/front-shell/src/OfxDataTopicWorkspace.vue',
  'components/ofx/data-operations/OfxOperationPanel.vue': 'packages/front-shell/src/OfxOperationPanel.vue',
  'components/ofx/feedback/OfxEmptyState.vue': 'packages/front-shell/src/OfxEmptyState.vue',
  'components/ofx/feedback/OfxLoadingState.vue': 'packages/front-shell/src/OfxLoadingState.vue',
  'components/ofx/forms/OfxFilterBar.vue': 'packages/front-shell/src/OfxFilterBar.vue',
  'components/ofx/layout/OfxPageHeader.vue': 'packages/front-shell/src/OfxPageHeader.vue',
  'components/ofx/navigation/OfxNavigationIcon.vue': 'packages/front-shell/src/OpsFactorNavigationIcon.vue',
  'components/ofx/overlays/OfxConfirmDialog.vue': 'packages/front-shell/src/OfxConfirmDialog.vue',
  'components/ofx/overlays/OfxModalDialog.vue': 'packages/front-shell/src/OfxModalDialog.vue',
  'components/ofx/planning/OfxPlanningBookDetailsDialog.vue': 'packages/front-planning-book/src/components/PlanningBookDetailsDialog.vue',
  'components/ofx/planning/OfxPlanningBookGrid.vue': 'packages/front-planning-book/src/components/PlanningBookGrid.vue',
  'components/ofx/planning/OfxProductionPlanningGrid.vue': 'packages/front-planning-book/src/components/ProductionPlanningBookGrid.vue',
  'components/ofx/planning/PlanningBookTreeCellRenderer.vue': 'packages/front-planning-book/src/components/PlanningBookTreeCellRenderer.vue',
  'components/ofx/planning/ProductionPlanningTreeCellRenderer.vue': 'packages/front-planning-book/src/components/ProductionPlanningTreeCellRenderer.vue',
  'components/ofx/surfaces/OfxSectionCard.vue': 'packages/front-shell/src/OfxSectionCard.vue',
  'layouts/page/ModuleWorkspacePage.vue': 'packages/front-shell/src/OpsFactorModuleWorkspace.vue',
  'layouts/page/TaskPageLayout.vue': 'packages/front-shell/src/TaskPageLayout.vue',
} as const;

const communityAdapterComponents = {
  'modules/admin/pages/SettingsPage.vue': 'src/layouts/app-shell/AppTopbar.vue',
  'modules/admin/pages/UserSettingsPage.vue': 'src/layouts/app-shell/AppTopbar.vue',
  'modules/admin/pages/UserViewsPage.vue': 'src/modules/planning-books/UserViewsCommunityPage.vue',
  'modules/admin/pages/UsersPage.vue': 'src/modules/user-administration/CommunityUserAdministrationPage.vue',
  'modules/configuration/pages/ClusteringPage.vue': 'src/modules/cluster-scope/ClusterScopeInspectorPage.vue',
  'modules/configuration/pages/ConfigurationProductionPage.vue': 'src/modules/production-master-data/ProductionMasterDataPage.vue',
  'modules/configuration/pages/GlobalParametersPage.vue': 'src/modules/configuration/GlobalParametersCommunityPage.vue',
  'modules/configuration/pages/ProductDetailsPage.vue': 'src/modules/material-master-data/MaterialMasterDataCatalogPage.vue',
  'modules/configuration/pages/ProductLocationPage.vue': 'src/modules/cluster-location-planning-parameters/ClusterLocationPlanningParametersInspectorPage.vue',
  'modules/configuration/pages/TransportationLinePage.vue': 'src/modules/transportation-lanes/TransportationLanesInspectorPage.vue',
  'modules/data/pages/DataDownloadUploadPage.vue': 'src/modules/data/CommunityDataUploadPage.vue',
  'modules/demand-planning/pages/ClusterLevelConfigurationPage.vue': 'src/modules/demand-planning/ClusterLevelConfigurationCommunityPage.vue',
  'modules/demand-planning/pages/DemandExecutionProfilesPage.vue': 'src/modules/demand-execution-profiles/DemandExecutionProfilesInspectorPage.vue',
  'modules/demand-planning/pages/PlanningBookPage.vue': 'src/modules/demand-planning/DemandPlanningBookCommunityPage.vue',
  'modules/production/pages/ProductionPlanningBookPage.vue': 'src/modules/production-planning/ProductionPlanningBookCommunityPage.vue',
  'modules/supply-network/pages/ExecutionProfilesPage.vue': 'src/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue',
  'modules/supply-network/pages/SupplyNetworkPage.vue': 'src/modules/supply-network/pages/SupplyNetworkExplorerPage.vue',
  'modules/supply-network/pages/SupplyPlanningBookPage.vue': 'src/modules/supply-planning/SupplyPlanningBookCommunityPage.vue',
  'modules/visibility/pages/InventoryOverviewPage.vue': 'src/modules/inventory-overview/InventoryOverviewPage.vue',
  'modules/visibility/pages/MaterialFlowsPage.vue': 'src/modules/material-flows/MaterialFlowsPage.vue',
  'modules/visibility/pages/OccupationVolumesPage.vue': 'src/modules/production-overview/ProductionOverviewPage.vue',
} as const;

const enterpriseHostComponents = [
  'components/ofx/planning/OfxLineSchedulingBoard.vue',
  'components/ofx/planning/OfxLineSchedulingMaterialGrid.vue',
  'features/planning-book/components/PlanningBookPreviewPanel.vue',
  'modules/admin/pages/AdminPage.vue',
  'modules/configuration/pages/ConfigurationPage.vue',
  'modules/configuration/pages/MaterialFilterPage.vue',
  'modules/configuration/pages/SalesCurvesPage.vue',
  'modules/demand-planning/components/AutoFitBinaryTreeNode.vue',
  'modules/demand-planning/components/AutoFitBinaryTreePanel.vue',
  'modules/demand-planning/pages/AutoFitConfigurationPage.vue',
  'modules/demand-planning/pages/AutoFitModelsPage.vue',
  'modules/demand-planning/pages/DemandAccuracyPage.vue',
  'modules/demand-planning/pages/DemandPlanChangeLogReportPage.vue',
  'modules/demand-planning/pages/DemandPlanningPage.vue',
  'modules/distribution/components/SalesBaricenterMap.vue',
  'modules/distribution/pages/DeploymentPage.vue',
  'modules/distribution/pages/DistributionPage.vue',
  'modules/distribution/pages/DrpParametrizationPage.vue',
  'modules/distribution/pages/FreightCostPage.vue',
  'modules/distribution/pages/SalesBaricenterPage.vue',
  'modules/planning-agent/pages/PlanningAgentChatPage.vue',
  'modules/pricing/pages/AssortmentPage.vue',
  'modules/pricing/pages/ElasticityPage.vue',
  'modules/pricing/pages/PriceSimulationPage.vue',
  'modules/pricing/pages/PricingPage.vue',
  'modules/production/pages/LineSchedulingPage.vue',
  'modules/production/pages/ProductionPage.vue',
  'modules/supply-network/pages/ConstraintTrackerPage.vue',
  'modules/visibility/components/SupplyPlanFlowMap.vue',
  'modules/visibility/pages/AlertsPage.vue',
  'modules/visibility/pages/ConsolidatedPlanPage.vue',
  'modules/visibility/pages/DemandAccuracyPage.vue',
  'modules/visibility/pages/InventoryOptimizationPage.vue',
  'modules/visibility/pages/LogisticsOverviewPage.vue',
  'modules/visibility/pages/PlanComparisonPage.vue',
  'modules/visibility/pages/ReportsPage.vue',
  'modules/visibility/pages/SupplyPlanFlowsPage.vue',
  'modules/visibility/pages/VisibilityPage.vue',
] as const;

const approvedRetirements = {
  'layouts/app-shell/AppContentFrame.vue': 'Its single scrolling main wrapper is owned by each edition AppShell; a second wrapper component would duplicate shell structure.',
  'modules/data/components/DataContractViewer.vue': 'Retired with the parallel Data workspace; Community uses the canonical topic workspace and upload surface.',
  'modules/data/components/DataHierarchyNavigator.vue': 'Retired with the parallel Data workspace; navigation is driven by the canonical Data taxonomy.',
  'modules/data/components/DataInterfaceCardGrid.vue': 'Retired with the parallel Data workspace; interface cards are rendered by the canonical topic workspace.',
  'modules/data/components/DataOperationPanel.vue': 'Retired with the parallel Data workspace; operations use shared OfxOperationPanel.',
  'modules/data/pages/ApiDocumentationRedirectPage.vue': 'Replaced by the shared OpsFactorApiDocumentationRedirect host adapter.',
  'modules/data/pages/DataPage.vue': 'Retired parallel landing page; edition navigation routes directly to canonical Data capabilities.',
  'modules/data/pages/PlanningDataPage.vue': 'Retired placeholder page; it did not provide an executable planning-data capability.',
} as const;

function editionHostEntry(referencePath: string): PlanningFrontComponentInventoryEntry {
  return {
    referencePath,
    disposition: 'edition-host',
    destinations: [
      { workspace: 'community', path: `src/${referencePath}` },
      { workspace: 'enterprise', path: `src/${referencePath}` },
    ],
    rationale: 'Both edition hosts intentionally own this component path while sharing lower-level packages and backend contracts.',
  };
}

function enterpriseDestination(referencePath: string): PlanningFrontComponentDestination {
  return { workspace: 'enterprise', path: `src/${referencePath}` };
}

export const planningFrontVueComponentInventory: readonly PlanningFrontComponentInventoryEntry[] = [
  ...editionHostComponents.map(editionHostEntry),
  ...Object.entries(sharedPackageComponents).map(([referencePath, path]) => ({
    referencePath,
    disposition: 'shared-package' as const,
    destinations: [
      { workspace: 'shared-package' as const, path },
    ],
    rationale: 'The reference component was extracted to a Community-owned reusable package consumed by both editions.',
  })),
  ...Object.entries(communityAdapterComponents).map(([referencePath, path]) => ({
    referencePath,
    disposition: 'community-adapter' as const,
    destinations: [
      { workspace: 'community' as const, path },
      enterpriseDestination(referencePath),
    ],
    rationale: 'Community exposes the same public capability through a canonical edition-safe implementation; Enterprise retains the reference host path.',
  })),
  ...enterpriseHostComponents.map((referencePath) => ({
    referencePath,
    disposition: 'enterprise-host' as const,
    destinations: [enterpriseDestination(referencePath)],
    rationale: 'This reference surface remains in the Enterprise host; its availability is governed by the edition capability policy.',
  })),
  ...Object.entries(approvedRetirements).map(([referencePath, rationale]) => ({
    referencePath,
    disposition: 'approved-retirement' as const,
    destinations: [],
    rationale,
  })),
];
