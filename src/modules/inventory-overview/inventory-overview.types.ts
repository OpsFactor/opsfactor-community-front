/**
 * Physical Inventory Overview contract published by the Community backend.
 *
 * The screen deliberately knows no financial axis, write-off series,
 * characteristic aggregation, or legacy primary-axis configuration.
 */
export interface InventoryOverviewSelection {
  supplyPlanId: number;
  unitOfMeasureId: string;
  materialIds: string[];
  locationIds: string[];
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
    postHorizonPolicy: selection.postHorizonPolicy,
  };
}

export interface InventoryOverview {
  unitOfMeasureId: string;
  periods: InventoryOverviewPeriod[];
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
