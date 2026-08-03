/**
 * Read-only Community contract for comparing a published Demand Plan with
 * historical sell-out. The backend owns the active DFU scope and conversion.
 */
export interface DemandSalesOverviewSelection {
  demandPlanId: number;
  unitOfMeasureId: string;
  historicalPeriods: number;
  materialIds: string[];
  locationIds: string[];
}

export interface DemandSalesOverview {
  periods: string[];
  data: DemandSalesOverviewPeriod[];
}

/** One unaggregated Community row for a material, location, and period end. */
export interface DemandSalesOverviewPeriod {
  locationId: string;
  materialId: string;
  referenceDate: string;
  historicalSales: number;
  unconstrainedPlan: number;
}

/** Lightweight selector contracts from the existing Community master-data APIs. */
export interface DemandSalesOverviewMaterialOption {
  id: string;
  description: string | null;
  active: boolean | null;
}

export interface DemandSalesOverviewLocationOption {
  id: string;
  description: string | null;
  active: boolean | null;
}
