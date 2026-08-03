import { createRouter as createVueRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppShell from '@/layouts/app-shell/AppShell.vue';
import { authGuard } from '@/app/guards/auth.guard';
import { ROUTE_NAMES } from './route-names';
import { authRoutes } from './modules/auth.routes';
import { useNavigationStore } from '@/stores/app/navigation.store';
import { APP_ROUTE_RECORDS } from '@/app/navigation.config';

const DEFAULT_ROUTE = '/';
const LEGACY_NAV_REDIRECTS = [
  { path: '/visibility/occupation-volumes', redirect: '/supply-planning/production-overview' },
  { path: '/visibility/logistics-overview', redirect: '/distribution/distribution-overview' },
  { path: '/visibility/consolidated-plan', redirect: '/demand-planning/sales-demand-overview' },
  { path: '/visibility/demand-accuracy', redirect: '/demand-planning/demand-accuracy' },
  { path: '/visibility/supply-plan-flows', redirect: '/supply-planning/material-flows' },
  { path: '/supply-network/low-level-code', redirect: '/supply-planning/low-level-code' },
];

/**
 * Community operational routes intentionally stay narrow and outside the
 * legacy rail taxonomy. They preserve documented Community capabilities
 * without turning the Enterprise Distribution/Visibility workspaces into a
 * cosmetic Community menu.
 */
const COMMUNITY_OPERATIONAL_ROUTE_RECORDS: RouteRecordRaw[] = [
  {
    path: '/supply-planning/deployment',
    name: 'community-supply-deployment',
    component: () => import('@/modules/deployment/DeploymentOperationalPage.vue'),
    meta: {
      title: 'Deployment',
      description: 'Review and replace one planned inbound route in the current Working Plan.',
      requiresAuth: true,
      subnav: [],
    },
  },
  {
    path: '/supply-planning/inventory-policies',
    name: 'community-inventory-policies',
    component: () => import('@/modules/inventory-policies/InventoryPoliciesInspectorPage.vue'),
    meta: {
      title: 'Inventory Policies',
      description: 'Inspect and replace one existing Community inventory-policy snapshot.',
      requiresAuth: true,
      subnav: [],
    },
  },
];

/**
 * Community capabilities documented after the June split but intentionally not
 * promoted to the legacy rail. These routes keep their narrow controller
 * contracts reachable without presenting the Enterprise workspaces as a
 * cosmetic Community navigation option.
 */
const COMMUNITY_DOCUMENTED_ROUTE_RECORDS: RouteRecordRaw[] = [
  {
    path: '/demand-planning/cluster-scope', name: 'community-demand-cluster-scope',
    component: () => import('@/modules/cluster-scope/ClusterScopeInspectorPage.vue'),
    meta: { title: 'Demand Planning Clusters', description: 'Edit one bounded Community cluster definition.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/demand-planning/demand-analysis', name: 'community-demand-analysis',
    component: () => import('@/modules/demand-analysis/DemandAnalysisPage.vue'),
    meta: { title: 'Demand Analysis', description: 'Configure and simulate a bounded Community demand analysis.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/demand-planning/historical-sellout', name: 'community-historical-sellout',
    component: () => import('@/modules/historical-sellout/HistoricalSelloutReportPage.vue'),
    meta: { title: 'Historical Sell-out', description: 'Read the raw Community sell-out report for an explicit interval.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/location-cluster-planning-parameters', name: 'community-location-cluster-planning-parameters',
    component: () => import('@/modules/cluster-location-planning-parameters/ClusterLocationPlanningParametersInspectorPage.vue'),
    meta: { title: 'Location Cluster Planning Parameters', description: 'Inspect bounded cluster planning parameters.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/location-cluster-criteria', name: 'community-location-cluster-criteria',
    component: () => import('@/modules/location-cluster-criteria/LocationClusterCriteriaCatalogPage.vue'),
    meta: { title: 'Location Cluster Criteria', description: 'Read the allowed Community cluster criteria.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/location-master-data', name: 'community-location-master-data',
    component: () => import('@/modules/location-master-data/LocationMasterDataCatalogPage.vue'),
    meta: { title: 'Location Master Data', description: 'Read the bounded Community location catalog.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/material-master-data', name: 'community-material-master-data',
    component: () => import('@/modules/material-master-data/MaterialMasterDataCatalogPage.vue'),
    meta: { title: 'Material Master Data', description: 'Read Community material and cluster snapshots.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/material-statuses', name: 'community-material-statuses',
    component: () => import('@/modules/material-statuses/MaterialStatusesInspectorPage.vue'),
    meta: { title: 'Material Statuses', description: 'Read the allowed Community material statuses.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/operational-planning-parameters', name: 'community-operational-planning-parameters',
    component: () => import('@/modules/operational-planning-parameters/OperationalPlanningParametersPage.vue'),
    meta: { title: 'Operational Planning Parameters', description: 'Maintain bounded Community planning parameters.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/configuration/uom-conversion-detail', name: 'community-uom-conversion-detail',
    component: () => import('@/modules/uom-conversion-detail/UomConversionDetailInspectorPage.vue'),
    meta: { title: 'UOM Conversion Detail', description: 'Inspect one material-specific Community conversion.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/planning/production-master-data', name: 'community-production-master-data',
    component: () => import('@/modules/production-master-data/ProductionMasterDataPage.vue'),
    meta: { title: 'Production Master Data', description: 'Browse Community production master-data snapshots.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/planning/uom-conversion-gaps', name: 'community-uom-conversion-gaps',
    component: () => import('@/modules/uom-conversion-gaps/UomConversionGapsPage.vue'),
    meta: { title: 'UOM Conversion Gaps', description: 'Diagnose Community conversion gaps without mutation.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/dependency-explorer', name: 'community-dependency-explorer',
    component: () => import('@/modules/dependency-explorer/DependencyExplorerPage.vue'),
    meta: { title: 'Dependency Explorer', description: 'Read a bounded Community supply dependency tree.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/low-level-code', name: 'community-low-level-code',
    component: () => import('@/modules/low-level-code/LowLevelCodeInspectorPage.vue'),
    meta: { title: 'Low Level Code', description: 'Inspect one material-specific Community low-level code path.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/material-flows', name: 'community-material-flows',
    component: () => import('@/modules/material-flows/MaterialFlowsPage.vue'),
    meta: { title: 'Material Flows', description: 'Read the Community physical origin-to-destination flow matrix.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/network-diagnostics', name: 'community-network-diagnostics',
    component: () => import('@/modules/network-diagnostics/NetworkDiagnosticsPage.vue'),
    meta: { title: 'Network Diagnostics', description: 'Inspect the bounded Community network circularity diagnostics.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/production-overview', name: 'community-production-overview',
    component: () => import('@/modules/production-overview/ProductionOverviewPage.vue'),
    meta: { title: 'Production Overview', description: 'Review the Community physical production snapshot.', requiresAuth: true, subnav: [] },
  },
  {
    path: '/supply-planning/transportation-lanes', name: 'community-transportation-lanes',
    component: () => import('@/modules/transportation-lanes/TransportationLanesInspectorPage.vue'),
    meta: { title: 'Transportation Lanes', description: 'Maintain bounded Community supply-network lanes.', requiresAuth: true, subnav: [] },
  },
];

const routes = [
  {
    path: '/',
    component: AppShell,
    children: [
      {
        path: '',
        name: ROUTE_NAMES.home,
        component: () => import('@/app/pages/HomePage.vue'),
        meta: {
          title: 'Workspace Home',
          description: 'Choose a workspace and enter the module overview that matches the planning decision you need to make.',
          requiresAuth: true,
          subnav: [],
        },
      },
      ...LEGACY_NAV_REDIRECTS,
      ...COMMUNITY_OPERATIONAL_ROUTE_RECORDS,
      ...COMMUNITY_DOCUMENTED_ROUTE_RECORDS,
      ...APP_ROUTE_RECORDS,
    ],
  },
  ...authRoutes,
  {
    path: '/:pathMatch(.*)*',
    redirect: DEFAULT_ROUTE,
  },
];

export function createRouter() {
  const router = createVueRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior() {
      return { top: 0 };
    },
  });

  router.beforeEach(authGuard);
  router.afterEach((to) => {
    const navigationStore = useNavigationStore();
    navigationStore.setFromRoute(to);
    if (typeof document !== 'undefined') {
      document.title = to.meta.title ? `OpsFactor | ${String(to.meta.title)}` : 'OpsFactor Planning';
    }
  });

  return router;
}
