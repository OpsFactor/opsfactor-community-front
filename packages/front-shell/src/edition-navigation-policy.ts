/**
 * Product-level navigation policy owned by the Community foundation.
 *
 * The policy deliberately contains no component loader, route, or theme
 * decision. Community and Enterprise hosts consume the same catalogue and
 * decide only which edition is running and which executable page implements
 * each permitted item.
 */
export const ENTERPRISE_NAVIGATION_MODULE_KEYS = new Set([
  'distribution',
  'visibility',
  'pricing',
  'planning-agent',
]);

export const ENTERPRISE_NAVIGATION_PAGE_KEYS = new Set([
  'demand-plan-change-log-report',
  'demand-demand-accuracy',
  'demand-autofit-models',
  'demand-autofit-configuration',
  'supply-constraint-tracker',
  'supply-network-explorer',
  'supply-supply-plan-flows',
  'production-line-scheduling',
  'production-production-overview',
  'process-execution',
  'configuration-sales-curves',
  'configuration-transportation-line',
  'configuration-product-location',
  'configuration-production',
  'configuration-clustering',
  'configuration-material-filter',
  'configuration-product-details',
  'admin-user-views',
  'admin-user-settings',
  'admin-settings',
]);

/** Returns whether one catalogue item is visible only to the Enterprise runtime. */
export function isEnterpriseNavigationItem(
  edition: 'community' | 'enterprise',
  moduleKey: string,
  pageKey?: string,
): boolean {

  return edition === 'community'
    && (ENTERPRISE_NAVIGATION_MODULE_KEYS.has(moduleKey)
      || (pageKey !== undefined && ENTERPRISE_NAVIGATION_PAGE_KEYS.has(pageKey)));

}
