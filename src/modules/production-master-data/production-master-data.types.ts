/** A raw Community routing definition; no scheduling attributes are exposed. */
export interface CommunityRouting {
  id: string;
  description: string | null;
  priority: number | null;
  locationId: string | null;
  outputMaterialId: string | null;
  canBeUsedWithoutProductionVersion: boolean | null;
  active: boolean | null;
}

/** One operation in a Community routing. */
export interface CommunityRoutingOperation {
  routingId: string;
  operationPosition: number | null;
  productionResourceId: string | null;
  unitOfMeasureId: string | null;
  baseQuantity: number | null;
  hoursByBaseQuantity: number | null;
}

/** A Community bill of materials header. */
export interface CommunityBillOfMaterials {
  id: string;
  description: string | null;
  outputMaterialId: string | null;
  outputUnitOfMeasureId: string | null;
  outputQuantity: number | null;
  active: boolean | null;
}

/** One Community bill of materials component. */
export interface CommunityBillOfMaterialsComponent {
  billOfMaterialsId: string;
  componentMaterialId: string | null;
  componentMaterialUnitOfMeasureId: string | null;
  quantity: number | null;
}

/** A basic Community production resource, without shifts, maintenance or costs. */
export interface CommunityProductionResource {
  productionResourceId: string;
  locationId: string | null;
  description: string | null;
  active: boolean | null;
  efficiency: number | null;
}

/**
 * Browser draft for the only mutable production master-data family in Community.
 * The technical resource identity is immutable after creation; Location remains
 * an explicit operational identifier instead of a preloaded master-data lookup.
 */
export interface CommunityProductionResourceDraft {
  isNew: boolean;
  productionResourceId: string;
  locationId: string;
  description: string;
  active: boolean | null;
  efficiency: string;
}

/** Exact five-field Community payload accepted by productionresource/save. */
export interface CommunityProductionResourceSaveRequest {
  productionResourceId: string;
  locationId: string;
  description: string | null;
  active: boolean | null;
  efficiency: number | null;
}

/** One backend-detected routing/BOM inconsistency. */
export interface CommunityRoutingBomInconsistency {
  productionRoutingId: string | null;
  lastOperationPosition: number | null;
  productionRoutingOutputMaterial: string | null;
  operationBillOfMaterials: string | null;
  operationBillOfMaterialsOutputMaterial: string | null;
  inconsistency: string | null;
}

export type ProductionMasterDataTab =
  | 'routings'
  | 'routingOperations'
  | 'billsOfMaterials'
  | 'billOfMaterialsComponents'
  | 'productionResources'
  | 'inconsistencies';

/** Generic display row keeps each endpoint response independent in the browser. */
export type ProductionMasterDataRow = Record<string, unknown>;

/** Converts a persisted resource snapshot into an editable, text-safe browser draft. */
export function buildProductionResourceDraft(resource: CommunityProductionResource): CommunityProductionResourceDraft {

  return {
    isNew: false,
    productionResourceId: requireText(resource.productionResourceId, 'Production Resource ID'),
    locationId: requireText(resource.locationId, 'Location ID'),
    description: resource.description ?? '',
    active: resource.active,
    efficiency: resource.efficiency === null ? '' : String(resource.efficiency),
  };
}

/** Starts a new resource without loading a Location catalog. */
export function newProductionResourceDraft(): CommunityProductionResourceDraft {

  return {
    isNew: true,
    productionResourceId: '',
    locationId: '',
    description: '',
    active: true,
    efficiency: '',
  };
}

/** Serializes only the five values accepted by the Community resource endpoint. */
export function buildProductionResourceSaveRequest(
  draft: CommunityProductionResourceDraft,
): CommunityProductionResourceSaveRequest {

  return {
    productionResourceId: requireText(draft.productionResourceId, 'Production Resource ID'),
    locationId: requireText(draft.locationId, 'Location ID'),
    description: draft.description.trim() || null,
    active: draft.active,
    efficiency: parseOptionalFiniteNumber(draft.efficiency, 'Efficiency'),
  };
}

function requireText(value: string | null, label: string): string {

  const normalizedValue = value?.trim() ?? '';
  if (normalizedValue.length === 0) throw new Error(`${label} is required.`);
  return normalizedValue;
}

function parseOptionalFiniteNumber(value: string, label: string): number | null {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return null;

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) throw new Error(`${label} must be a finite number when informed.`);
  return parsedValue;
}
