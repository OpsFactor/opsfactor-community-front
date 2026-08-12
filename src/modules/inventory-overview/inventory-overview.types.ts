/**
 * Physical Inventory Overview contract published by the Community backend.
 *
 * The screen exposes the Community physical axis only. Characteristics narrow
 * a physical material-location snapshot; financial axes and write-off remain
 * outside this public contract.
 */
export interface InventoryOverviewSelection {
  supplyPlanId: number;
  unitOfMeasureId: string;
  materialIds: string[];
  locationIds: string[];
  valuesByMaterialCharacteristicId: Record<string, string[]>;
  valuesByLocationCharacteristicId: Record<string, string[]>;
  postHorizonPolicy: PostHorizonPolicy;
}

export type PostHorizonPolicy = 'LIMIT_TO_PLANNING_HORIZON' | 'AVERAGE_ALL_PERIODS';

/**
 * Creates the physical Community request explicitly instead of forwarding a
 * UI object that could accidentally acquire legacy or Enterprise-only axes.
 */
export function buildInventoryOverviewRequest(selection: InventoryOverviewSelection): InventoryOverviewSelection {
  return {
    supplyPlanId: selection.supplyPlanId,
    unitOfMeasureId: selection.unitOfMeasureId,
    materialIds: selection.materialIds,
    locationIds: selection.locationIds,
    valuesByMaterialCharacteristicId: selection.valuesByMaterialCharacteristicId,
    valuesByLocationCharacteristicId: selection.valuesByLocationCharacteristicId,
    postHorizonPolicy: selection.postHorizonPolicy,
  };
}

export interface InventoryOverview {
  unitOfMeasureId: string;
  periods: InventoryOverviewPeriod[];
  daysInPeriod: number[];
  materialLocationDetails: InventoryOverviewMaterialLocationDetail[];
}

/** A physical material-location row used for local filtering after the load. */
export interface InventoryOverviewMaterialLocationDetail {
  locationId: string;
  locationDescription: string | null;
  materialId: string;
  materialDescription: string | null;
  valuesByLocationCharacteristicId: Record<string, string>;
  valuesByMaterialCharacteristicId: Record<string, string>;
  constrainedProjectedStock: number[];
  unconstrainedProjectedStock: number[];
  constrainedConsumption: number[];
  unconstrainedConsumption: number[];
}

/** Public categorical characteristic catalog shared with the master-data API. */
export interface InventoryOverviewCharacteristic {
  caracteristicaId: string;
  descricao: string;
  listaAtributos: string[];
}

export interface InventoryOverviewPeriod {
  periodEnd: string;
  constrainedProjectedStock: number;
  unconstrainedProjectedStock: number;
  constrainedDaysOfSupply: number;
  unconstrainedDaysOfSupply: number;
}

/** Lightweight selector representations from existing Community APIs. */
export interface SupplyPlanOption {
  supplyPlanId: number;
  description: string | null;
  beginsOn: string | null;
}

export interface MaterialOption {
  id: string;
  description: string | null;
  active: boolean | null;
}

export interface LocationOption {
  id: string;
  description: string | null;
  active: boolean | null;
}
