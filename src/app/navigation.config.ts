import {
  createLegacyNavigation,
  OpsFactorModuleWorkspaceRoute,
} from '@opsfactor/front-shell';
import { APPLICATION_EDITION } from '@/app/edition';

export type {
  AppModuleCardLink,
  AppModuleKey,
  AppModuleRailGroup,
  AppModuleSectionSummary,
  AppModuleSummary,
  AppPageStatus,
  AppSearchEntry,
} from '@opsfactor/front-shell';

/**
 * This host only maps edition-specific executable page loaders. The shared
 * legacy taxonomy, route metadata and Community/Enterprise policy are owned
 * by the Community front-shell package.
 */
const pageComponents = {
  'demand-planning-book': () => import('@/modules/demand-planning/DemandPlanningBookCommunityPage.vue'),
  'demand-plans': () => import('@/modules/demand-planning/pages/DemandPlansPage.vue'),
  'demand-sales-demand-overview': () => import('@/modules/demand-planning/pages/SalesDemandOverviewPage.vue'),
  'demand-cluster-level-configuration': () => import('@/modules/demand-planning/ClusterLevelConfigurationCommunityPage.vue'),
  'demand-execution-profiles': () => import('@/modules/demand-execution-profiles/DemandExecutionProfilesInspectorPage.vue'),
  'supply-planning-book': () => import('@/modules/supply-planning/SupplyPlanningBookCommunityPage.vue'),
  'supply-plans': () => import('@/modules/supply-network/pages/SupplyPlansPage.vue'),
  'supply-network-explorer': () => import('@/modules/supply-network/pages/SupplyNetworkExplorerPage.vue'),
  'supply-execution-profiles': () => import('@/modules/supply-execution-profiles/SupplyExecutionProfilesInspectorPage.vue'),
  'supply-inventory-overview': () => import('@/modules/inventory-overview/InventoryOverviewPage.vue'),
  'production-planning-book': () => import('@/modules/production-planning/ProductionPlanningBookCommunityPage.vue'),
  'production-production-overview': () => import('@/modules/production-overview/ProductionOverviewPage.vue'),
  'process-execution': () => import('@/modules/processes/pages/ProcessExecutionPage.vue'),
  'process-status': () => import('@/modules/processes/pages/ProcessStatusPage.vue'),
  'data-download-upload': () => import('@/modules/data/CommunityDataUploadPage.vue'),
  'configuration-global-parameters': () => import('@/modules/configuration/GlobalParametersCommunityPage.vue'),
  'configuration-clustering': () => import('@/modules/cluster-scope/ClusterScopeInspectorPage.vue'),
  'admin-users': () => import('@/modules/user-administration/CommunityUserAdministrationPage.vue'),
  'admin-user-views': () => import('@/modules/planning-books/UserViewsCommunityPage.vue'),
};

const navigation = createLegacyNavigation({
  edition: APPLICATION_EDITION,
  pageComponents,
  moduleOverviewComponent: OpsFactorModuleWorkspaceRoute,
});

export const APP_NAVIGATION_MODULES = navigation.APP_NAVIGATION_MODULES;
export const APP_MODULES = navigation.APP_MODULES;
export const APP_SEARCH_INDEX = navigation.APP_SEARCH_INDEX;
export const APP_ROUTE_RECORDS = navigation.APP_ROUTE_RECORDS;
