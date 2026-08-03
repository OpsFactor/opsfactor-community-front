/** Transport shape shared by the Community-owned Supply Plans history workspace. */
export interface SupplyPlanHistoryDemandPlanDto {
  demandPlanId?: number;
  description?: string;
}

/** A persisted Supply Plan version returned by the edition-specific HTTP adapter. */
export interface SupplyPlanHistoryDto {
  supplyPlanId: number;
  supplyNetworkVersionId?: string;
  executionProfileId?: string;
  description: string;
  bucketSize?: string;
  timeOfExecution?: string;
  beginsOn?: string;
  generatedBy?: string;
  demandPlanDTO?: SupplyPlanHistoryDemandPlanDto | null;
}
