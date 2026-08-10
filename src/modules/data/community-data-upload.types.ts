import type { DataCatalogThemeId } from './planning-front-data-taxonomy';

/** The two wire formats intentionally exposed by the Community data-integration controllers. */
export type CommunityDataFormat = 'file' | 'json';
/** Download format options follow the Planning Front split-button contract. */
export type CommunityDataDownloadFormat = 'xlsx' | 'csvStandard' | 'csvSystemLocale';
export type CommunityDataTheme = DataCatalogThemeId;

/**
 * An operation is declared per family instead of being inferred from a path.
 *
 * This keeps the browser from becoming a generic REST explorer: a new server
 * subpath remains unavailable until it is intentionally classified here.
 */
export interface CommunityDataOperation {
  kind: 'download-file' | 'download-json' | 'upload-file' | 'upload-json' | 'delete-json';
  requiresDateRange?: boolean;
  requiresDemandPlanId?: boolean;
  requiresSupplyPlanId?: boolean;
  requiresUnitOfMeasureId?: boolean;
}

/** One Planning Front topic may expose related definition and assignment datasets. */
export interface CommunityDataVariant {
  id: string;
  label: string;
  subPath: string;
}

/** Static description of one intentionally published Community data family. */
export interface CommunityDataFamily {
  id: string;
  catalogTopicId: string;
  theme: CommunityDataTheme;
  group: string;
  section: string;
  label: string;
  description: string;
  subPath: string;
  variants?: readonly CommunityDataVariant[];
  jsonPayload: 'integration-envelope' | 'bare-list';
  operations: readonly CommunityDataOperation[];
}

export interface CommunityDataDateRange {
  initialDate: string;
  finalDate: string;
}

export interface CommunityDataTarget {
  family: CommunityDataFamily;
  operation: CommunityDataOperation;
  variantSubPath?: string;
  dateRange?: CommunityDataDateRange;
  demandPlanId?: string;
  supplyPlanId?: string;
  unitOfMeasureId?: string;
}

const STANDARD_MUTABLE_OPERATIONS: readonly CommunityDataOperation[] = [
  { kind: 'download-file' },
  { kind: 'download-json' },
  { kind: 'upload-file' },
  { kind: 'upload-json' },
  { kind: 'delete-json' },
];

const FILE_AND_JSON_OPERATIONS: readonly CommunityDataOperation[] = [
  { kind: 'download-file' },
  { kind: 'download-json' },
  { kind: 'upload-file' },
  { kind: 'upload-json' },
];

/**
 * Complete Community allowlist mirrored from the backend contract test.
 *
 * `configuredview`, Planning Book views, template fill utilities, orders,
 * AutoFit, Inventory Optimization, financial data and Enterprise-only supply
 * capabilities deliberately have no representation in this collection.
 */
export const COMMUNITY_DATA_FAMILIES: readonly CommunityDataFamily[] = [
  {
    id: 'unit-of-measure', catalogTopicId: 'unit-of-measure', theme: 'master-data', group: 'units-and-conversions', section: 'units', label: 'Unit of Measure',
    description: 'Shared quantitative units. JSON accepts the server list directly.',
    subPath: 'unitofmeasure', jsonPayload: 'bare-list', operations: FILE_AND_JSON_OPERATIONS,
  },
  {
    id: 'unit-conversion', catalogTopicId: 'uom-conversion', theme: 'master-data', group: 'units-and-conversions', section: 'conversions', label: 'Unit Conversion',
    description: 'Global conversions between compatible quantitative dimensions.',
    subPath: 'unitconversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'material-unit-conversion', catalogTopicId: 'uom-conversion-by-material', theme: 'master-data', group: 'units-and-conversions', section: 'conversions', label: 'Material Unit Conversion',
    description: 'Material-specific quantitative conversions.',
    subPath: 'unitconversionmaterial', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'locations', catalogTopicId: 'locations', theme: 'master-data', group: 'materials-locations', section: 'locations', label: 'Locations',
    description: 'Location master data without geographic or economic extensions.',
    subPath: 'location', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'materials', catalogTopicId: 'material-master', theme: 'master-data', group: 'materials-locations', section: 'materials', label: 'Materials',
    description: 'Material master data and planning status.',
    subPath: 'material', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'material-characteristics', catalogTopicId: 'material-characteristics', theme: 'master-data', group: 'materials-locations', section: 'materials', label: 'Material Characteristics',
    description: 'Public material-characteristic definitions used by Planning Book filters and User Views.',
    subPath: 'characteristic/material', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
    variants: [
      { id: 'definitions', label: 'Characteristic definitions', subPath: 'characteristic/material' },
      { id: 'values', label: 'Values by material', subPath: 'characteristic/material/value' },
    ],
  },
  {
    id: 'location-characteristics', catalogTopicId: 'location-characteristics', theme: 'master-data', group: 'materials-locations', section: 'locations', label: 'Location Characteristics',
    description: 'Public location-characteristic definitions used by Planning Book filters and User Views.',
    subPath: 'characteristic/location', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
    variants: [
      { id: 'definitions', label: 'Characteristic definitions', subPath: 'characteristic/location' },
      { id: 'values', label: 'Values by location', subPath: 'characteristic/location/value' },
    ],
  },
  {
    id: 'material-location-parameters', catalogTopicId: 'product-location-parameters', theme: 'configuration', group: 'material-location', section: 'material-location-attributes', label: 'Material-Location Parameters',
    description: 'Operational parameters for existing material and location combinations.',
    subPath: 'materiallocationparameters', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'inventory-policy', catalogTopicId: 'inventory-policy', theme: 'configuration', group: 'supply-planning', section: 'inventory-policy-setup', label: 'Inventory Policy',
    description: 'Operational inventory-policy headers.',
    subPath: 'inventorypolicy', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'inventory-policy-detail', catalogTopicId: 'inventory-policy-details', theme: 'configuration', group: 'supply-planning', section: 'inventory-policy-setup', label: 'Inventory Policy Detail',
    description: 'Material-location rules belonging to operational inventory policies.',
    subPath: 'inventorypolicydetail', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'supply-network-version', catalogTopicId: 'supply-network-version', theme: 'master-data', group: 'supply-network', section: 'transportation-network', label: 'Supply Network Version',
    description: 'Network-version headers used by supply planning.',
    subPath: 'supplynetworkversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'transportation-lane', catalogTopicId: 'transportation-lane', theme: 'master-data', group: 'supply-network', section: 'transportation-network', label: 'Transportation Lane',
    description: 'Base origin-to-destination lanes.',
    subPath: 'transportationlane', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'transportation-lane-material', catalogTopicId: 'transportation-lane-material', theme: 'master-data', group: 'supply-network', section: 'transportation-network', label: 'Transportation Lane Material',
    description: 'Material-specific lane eligibility and operational parameters.',
    subPath: 'transportationlanematerial', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-resource-availability', catalogTopicId: 'production-resource-availability', theme: 'master-data', group: 'production', section: 'production-resources', label: 'Production Resource Availability',
    description: 'Basic daily resource availability in hours.',
    subPath: 'productionresourceavailability', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'bill-of-materials', catalogTopicId: 'bill-of-materials', theme: 'master-data', group: 'production', section: 'bill-of-materials', label: 'Bill of Materials',
    description: 'Basic bill-of-materials headers.',
    subPath: 'bom', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'bill-of-materials-components', catalogTopicId: 'bill-of-materials-components', theme: 'master-data', group: 'production', section: 'bill-of-materials', label: 'Bill of Materials Components',
    description: 'Components of basic bills of materials.',
    subPath: 'bomcomponents', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-resource', catalogTopicId: 'production-resources', theme: 'master-data', group: 'production', section: 'production-resources', label: 'Production Resource',
    description: 'Basic productive resources.',
    subPath: 'productionresource', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-routing', catalogTopicId: 'production-routing', theme: 'master-data', group: 'production', section: 'production-routing', label: 'Production Routing',
    description: 'Basic production routings used by supply planning.',
    subPath: 'productionrouting', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'routing-operation', catalogTopicId: 'production-routing-operations', theme: 'master-data', group: 'production', section: 'production-routing', label: 'Routing Operation',
    description: 'FILE-only routing-operation relationship maintained by its dedicated controller.',
    subPath: 'operationproductionrouting', jsonPayload: 'integration-envelope',
    operations: [{ kind: 'download-file' }, { kind: 'upload-file' }],
  },
  {
    id: 'simple-production-version', catalogTopicId: 'single-routing-production-version', theme: 'master-data', group: 'production', section: 'production-version', label: 'Simple Production Version',
    description: 'Production versions with a single routing.',
    subPath: 'simpleproductionversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'stock', catalogTopicId: 'stock', theme: 'transactional-data', group: 'inventory', section: 'inventory-snapshots', label: 'Stock Position',
    description: 'Opening and current stock positions used as the inventory baseline for Supply Planning. Downloads and deletion require an explicit date range.',
    subPath: 'stock', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresDateRange: true },
      { kind: 'download-json', requiresDateRange: true },
      { kind: 'upload-file' }, { kind: 'upload-json' },
      { kind: 'delete-json', requiresDateRange: true },
    ],
  },
  {
    id: 'sell-out', catalogTopicId: 'sales-sell-out', theme: 'transactional-data', group: 'sales', section: 'historical-sales', label: 'Sell-out',
    description: 'Historical sell-out used for forecast and Demand Planning. Downloads require an explicit date range.',
    subPath: 'sellout', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresDateRange: true },
      { kind: 'download-json', requiresDateRange: true },
      { kind: 'upload-file' }, { kind: 'upload-json' },
      { kind: 'delete-json', requiresDateRange: true },
    ],
  },
  {
    id: 'fulfilled-demand-export', catalogTopicId: 'direct-demand-supply-plan', theme: 'planning-data', group: 'supply-planning', section: 'fulfilled-demand', label: 'Fulfilled Demand for Supply Plan',
    description: 'Read-only physical demand fulfillment for one Supply Plan: unconstrained, fulfilled, unmet, and fulfillment rate.',
    subPath: 'fulfilleddemand', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true, requiresUnitOfMeasureId: true },
      { kind: 'download-json', requiresSupplyPlanId: true, requiresUnitOfMeasureId: true },
    ],
  },
  {
    id: 'demand-plan-detailed-export', catalogTopicId: 'demand-plan', theme: 'planning-data', group: 'demand-planning', section: 'detailed-extraction', label: 'Demand Planning - Full Download',
    description: 'Read-only detailed extraction of all standard key figures for one Demand Plan.',
    subPath: 'demandplan', jsonPayload: 'integration-envelope',
    operations: [{ kind: 'download-file', requiresDemandPlanId: true }],
  },
  {
    id: 'distribution-plan-export', catalogTopicId: 'distribution-plan', theme: 'planning-data', group: 'supply-planning', section: 'purchase-distribution-plan', label: 'Purchase/Distribution Plan',
    description: 'Read-only purchase and distribution output for one Supply Plan.',
    subPath: 'distributionplan', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true },
      { kind: 'download-json', requiresSupplyPlanId: true },
    ],
  },
  {
    id: 'production-plan-volume-export', catalogTopicId: 'production-plan-volume', theme: 'planning-data', group: 'supply-planning', section: 'production-plan', label: 'Production Plan - Volumes',
    description: 'Read-only production-volume output for one Supply Plan.',
    subPath: 'productionplan/volume', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true },
      { kind: 'download-json', requiresSupplyPlanId: true },
    ],
  },
  {
    id: 'production-plan-occupation-export', catalogTopicId: 'production-plan-occupation', theme: 'planning-data', group: 'supply-planning', section: 'production-plan', label: 'Production Plan - Resource Occupation',
    description: 'Read-only productive-resource occupation for one Supply Plan.',
    subPath: 'productionplan/occupation', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true },
      { kind: 'download-json', requiresSupplyPlanId: true },
    ],
  },
  {
    id: 'inventory-plan-export', catalogTopicId: 'inventory-plan', theme: 'planning-data', group: 'supply-planning', section: 'inventory-plan', label: 'Inventory Plan Export',
    description: 'Read-only export for one existing Supply Plan; it never writes planning data.',
    subPath: 'inventoryplan', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true },
      { kind: 'download-json', requiresSupplyPlanId: true },
    ],
  },
] as const;

/** Builds a payload accepted by each family without adding asynchronous execution to Community. */
export function buildCommunityDataJsonPayload(family: CommunityDataFamily, source: string): string {

  const parsedPayload: unknown = JSON.parse(source);
  if (family.jsonPayload === 'bare-list') {
    if (!Array.isArray(parsedPayload)) {
      throw new Error(`${family.label} requires a JSON array.`);
    }
    return JSON.stringify(parsedPayload);
  }

  if (parsedPayload === null || Array.isArray(parsedPayload) || typeof parsedPayload !== 'object') {
    throw new Error(`${family.label} requires an integration object with a data array or filter.`);
  }

  const payload = parsedPayload as Record<string, unknown>;
  if (payload.threadSync !== undefined && payload.threadSync !== 'SYNC') {
    throw new Error('Community data operations run synchronously; threadSync must be SYNC when provided.');
  }

  return JSON.stringify({ ...payload, threadSync: 'SYNC' });
}

/** Resolves a path only from a known family and known operation. */
export function buildCommunityDataEndpoint(target: CommunityDataTarget): string {

  const { family, operation } = target;
  const suffix = operation.kind === 'download-file' || operation.kind === 'upload-file' ? 'file/' : '';
  const root = `/api/secured/data/${suffix}${target.variantSubPath ?? family.subPath}`;

  if (operation.requiresDemandPlanId) {
    const demandPlanId = target.demandPlanId?.trim() ?? '';
    if (demandPlanId.length === 0) {
      throw new Error('A Demand Plan ID is required for this export.');
    }
    return `${root}/${encodeURIComponent(demandPlanId)}`;
  }

  if (operation.requiresSupplyPlanId) {
    const supplyPlanId = target.supplyPlanId?.trim() ?? '';
    if (supplyPlanId.length === 0) {
      throw new Error('A Supply Plan ID is required for this export.');
    }
    if (operation.requiresUnitOfMeasureId) {
      const unitOfMeasureId = target.unitOfMeasureId?.trim() ?? '';
      if (unitOfMeasureId.length === 0) {
        throw new Error('A unit of measure is required for this export.');
      }
      return `${root}/${encodeURIComponent(supplyPlanId)}/${encodeURIComponent(unitOfMeasureId)}`;
    }
    return `${root}/${encodeURIComponent(supplyPlanId)}`;
  }

  if (operation.requiresDateRange) {
    const initialDate = target.dateRange?.initialDate.trim() ?? '';
    const finalDate = target.dateRange?.finalDate.trim() ?? '';
    if (initialDate.length === 0 || finalDate.length === 0) {
      throw new Error('Initial and final dates are required for this operation.');
    }
    return `${root}/${encodeURIComponent(initialDate)}/${encodeURIComponent(finalDate)}`;
  }

  return operation.kind === 'delete-json' ? `${root}/delete` : root;
}

export function createCommunityDataJsonTemplate(family: CommunityDataFamily): string {

  return family.jsonPayload === 'bare-list'
    ? '[]'
    : '{\n  "data": [],\n  "threadSync": "SYNC"\n}';
}

export function isCommunityDataMutation(operation: CommunityDataOperation): boolean {

  return operation.kind === 'upload-file' || operation.kind === 'upload-json' || operation.kind === 'delete-json';
}
