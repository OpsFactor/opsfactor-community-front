/**
 * Browser contract for the physical Community Production Overview.
 *
 * The backend accepts the historical material-characteristic map, but the
 * Community page deliberately fixes it to the only published dimension:
 * {@code materialId}. It never forwards an arbitrary browser-side pivot.
 */
export interface ProductionOverviewSelection {
  supplyPlanId: number;
  uomId: string;
  locationIds: string[];
  materialIds: string[];
}

/**
 * Materializes the exact canonical request instead of serializing UI state.
 * Locations and materials are deliberately mandatory in this SPA slice even
 * though an empty historical backend selection would mean the whole scope.
 */
export function buildProductionOverviewRequest(selection: ProductionOverviewSelection): {
  supplyPlanId: number;
  uomId: string;
  locationDTOs: Array<{ id: string }>;
  valuesByMaterialCharacteristicId: { materialId: string[] };
} {
  return {
    supplyPlanId: selection.supplyPlanId,
    uomId: selection.uomId,
    locationDTOs: selection.locationIds.map((id) => ({ id })),
    valuesByMaterialCharacteristicId: { materialId: selection.materialIds },
  };
}

/** Physical aggregate returned by the Community projection-backed endpoint. */
export interface ProductionOverview {
  finalDateTimeByPeriod: string[];
  capacityByProductionResource: ProductionResourceCapacity[];
  stockAndProductionByLocationAndMaterialGrouping: StockAndProduction[];
  directAndIndirectDemandByLocationAndMaterialGrouping: DirectAndIndirectDemand[];
  occupationAndProductionByProductionResourceAndMaterialGrouping: ProductionResourceOccupation[];
}

export interface StockAndProduction {
  locationId: string;
  materialId: string;
  quantityUomId: string;
  constrainedInventory: number[];
  unconstrainedInventory: number[];
  constrainedProduction: number[];
  unconstrainedProduction: number[];
  constrainedInbound: number[];
  unconstrainedInbound: number[];
}

export interface DirectAndIndirectDemand {
  locationId: string;
  materialId: string;
  quantityUomId: string;
  constrainedDirectDemand: number[];
  unconstrainedDirectDemand: number[];
  constrainedIndirectDemand: number[];
  unconstrainedIndirectDemand: number[];
}

export interface ProductionResourceCapacity {
  locationId: string;
  productionResourceId: string;
  capacityInHoursOrQuantity: number[];
}

export interface ProductionResourceOccupation {
  locationId: string;
  productionResourceId: string;
  materialId: string;
  uomId: string;
  constrainedProductionQuantity: number[];
  unconstrainedProductionQuantity: number[];
  constrainedOccupationInHoursOrQuantity: number[];
  unconstrainedOccupationInHoursOrQuantity: number[];
}

/**
 * The only body accepted by the Community resource-period detail endpoint.
 *
 * Plan, resource and period remain path variables. The UI may only reduce the
 * already selected physical scope through the fixed material identifier.
 */
export function buildProductionOverviewResourceDetailRequest(materialIds: string[]): {
  valuesByMaterialCharacteristicId: { materialId: string[] };
} {

  return { valuesByMaterialCharacteristicId: { materialId: materialIds } };

}

/** Read-only header for one production resource cell. */
export interface ProductionOverviewResourceDetail {
  supplyPlanId: number;
  locationId: string;
  locationDescription: string | null;
  productionResourceId: string;
  productionResourceDescription: string | null;
  periodIndex: number;
  plannedDate: string;
  resourceCapacityUnitOfMeasureId: string;
  availableCapacityInHoursOrQuantity: number | null;
  rows: ProductionOverviewResourceDetailRow[];
}

/**
 * A physical output line from the selected resource and period.
 *
 * Quantities and capacity consumption keep the units supplied by the backend;
 * they are intentionally not safe to sum or convert in this presentation.
 */
export interface ProductionOverviewResourceDetailRow {
  outputMaterialId: string;
  outputMaterialDescription: string | null;
  productionVersionId: string | null;
  routingId: string;
  routingDescription: string | null;
  billOfMaterialsId: string;
  billOfMaterialsDescription: string | null;
  resourceCapacityUnitOfMeasureId: string;
  unitOfMeasureId: string;
  unconstrainedHours: number | null;
  constrainedHours: number | null;
  workPlanHours: number | null;
  unconstrainedQuantity: number | null;
  constrainedQuantity: number | null;
  workPlanQuantity: number | null;
}

/** Existing Community selector shapes; no production-specific catalog exists. */
export interface SupplyPlanOption {
  supplyPlanId: number;
  description: string | null;
}

export interface NamedOption {
  id: string;
  description: string | null;
  active: boolean | null;
}
