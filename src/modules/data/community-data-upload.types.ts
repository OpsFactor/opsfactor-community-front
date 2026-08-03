/** The two wire formats intentionally exposed by the Community data-integration controllers. */
export type CommunityDataFormat = 'file' | 'json';

/**
 * An operation is declared per family instead of being inferred from a path.
 *
 * This keeps the browser from becoming a generic REST explorer: a new server
 * subpath remains unavailable until it is intentionally classified here.
 */
export interface CommunityDataOperation {
  kind: 'download-file' | 'download-json' | 'upload-file' | 'upload-json' | 'delete-json';
  requiresDateRange?: boolean;
  requiresSupplyPlanId?: boolean;
}

/** Static description of one intentionally published Community data family. */
export interface CommunityDataFamily {
  id: string;
  group: 'master-data' | 'production' | 'operational-data';
  label: string;
  description: string;
  subPath: string;
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
  dateRange?: CommunityDataDateRange;
  supplyPlanId?: string;
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
    id: 'unit-of-measure', group: 'master-data', label: 'Unit of Measure',
    description: 'Shared quantitative units. JSON accepts the server list directly.',
    subPath: 'unitofmeasure', jsonPayload: 'bare-list', operations: FILE_AND_JSON_OPERATIONS,
  },
  {
    id: 'unit-conversion', group: 'master-data', label: 'Unit Conversion',
    description: 'Global conversions between compatible quantitative dimensions.',
    subPath: 'unitconversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'material-unit-conversion', group: 'master-data', label: 'Material Unit Conversion',
    description: 'Material-specific quantitative conversions.',
    subPath: 'unitconversionmaterial', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'locations', group: 'master-data', label: 'Locations',
    description: 'Community location master data without geographic or economic extensions.',
    subPath: 'location', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'materials', group: 'master-data', label: 'Materials',
    description: 'Community material master data and planning status.',
    subPath: 'material', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'material-location-parameters', group: 'master-data', label: 'Material-Location Parameters',
    description: 'Operational parameters for existing material and location combinations.',
    subPath: 'materiallocationparameters', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'inventory-policy', group: 'master-data', label: 'Inventory Policy',
    description: 'Operational inventory-policy headers.',
    subPath: 'inventorypolicy', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'inventory-policy-detail', group: 'master-data', label: 'Inventory Policy Detail',
    description: 'Material-location rules belonging to operational inventory policies.',
    subPath: 'inventorypolicydetail', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'supply-network-version', group: 'master-data', label: 'Supply Network Version',
    description: 'Network-version headers used by the Community heuristic.',
    subPath: 'supplynetworkversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'transportation-lane', group: 'master-data', label: 'Transportation Lane',
    description: 'Base origin-to-destination lanes without private freight and fleet data.',
    subPath: 'transportationlane', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'transportation-lane-material', group: 'master-data', label: 'Transportation Lane Material',
    description: 'Material-specific lane eligibility and operational parameters.',
    subPath: 'transportationlanematerial', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-resource-availability', group: 'production', label: 'Production Resource Availability',
    description: 'Basic daily resource availability in hours.',
    subPath: 'productionresourceavailability', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'bill-of-materials', group: 'production', label: 'Bill of Materials',
    description: 'Basic bill-of-materials headers.',
    subPath: 'bom', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'bill-of-materials-components', group: 'production', label: 'Bill of Materials Components',
    description: 'Components of basic bills of materials.',
    subPath: 'bomcomponents', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-resource', group: 'production', label: 'Production Resource',
    description: 'Basic productive resources without shifts, maintenance or cost.',
    subPath: 'productionresource', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'production-routing', group: 'production', label: 'Production Routing',
    description: 'Basic production routings used by the Community heuristic.',
    subPath: 'productionrouting', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'routing-operation', group: 'production', label: 'Routing Operation',
    description: 'FILE-only routing-operation relationship maintained by its dedicated controller.',
    subPath: 'operationproductionrouting', jsonPayload: 'integration-envelope',
    operations: [{ kind: 'download-file' }, { kind: 'upload-file' }],
  },
  {
    id: 'simple-production-version', group: 'production', label: 'Simple Production Version',
    description: 'Community production versions without parallel-version scheduling.',
    subPath: 'simpleproductionversion', jsonPayload: 'integration-envelope', operations: STANDARD_MUTABLE_OPERATIONS,
  },
  {
    id: 'stock', group: 'operational-data', label: 'Stock',
    description: 'Quantitative stock snapshots. Downloads and deletion require an explicit date range.',
    subPath: 'stock', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresDateRange: true },
      { kind: 'download-json', requiresDateRange: true },
      { kind: 'upload-file' }, { kind: 'upload-json' },
      { kind: 'delete-json', requiresDateRange: true },
    ],
  },
  {
    id: 'sell-out', group: 'operational-data', label: 'Sell-out',
    description: 'Community historical sales. Downloads and deletion require an explicit date range.',
    subPath: 'sellout', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresDateRange: true },
      { kind: 'download-json', requiresDateRange: true },
      { kind: 'upload-file' }, { kind: 'upload-json' },
      { kind: 'delete-json', requiresDateRange: true },
    ],
  },
  {
    id: 'inventory-plan-export', group: 'operational-data', label: 'Inventory Plan Export',
    description: 'Read-only export for one existing Supply Plan; it never writes planning data.',
    subPath: 'inventoryplan', jsonPayload: 'integration-envelope',
    operations: [
      { kind: 'download-file', requiresSupplyPlanId: true },
      { kind: 'download-json', requiresSupplyPlanId: true },
    ],
  },
] as const;

export const COMMUNITY_DATA_GROUPS = [
  { id: 'master-data', label: 'Master Data' },
  { id: 'production', label: 'Basic Production Data' },
  { id: 'operational-data', label: 'Operational Data' },
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
  const root = `/api/secured/data/${suffix}${family.subPath}`;

  if (operation.requiresSupplyPlanId) {
    const supplyPlanId = target.supplyPlanId?.trim() ?? '';
    if (supplyPlanId.length === 0) {
      throw new Error('A Supply Plan ID is required for this export.');
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
