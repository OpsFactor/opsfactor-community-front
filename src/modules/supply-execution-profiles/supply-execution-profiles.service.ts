import { httpRequest } from '@/services/api/http';
import { requestJson } from '@/services/api/request';
import {
  toCommunitySupplyExecutionProfilePayload,
} from './community-supply-execution-profile.contract';

export {
  toCommunitySupplyExecutionProfilePayload,
} from './community-supply-execution-profile.contract';

export interface SupplyExecutionProfile {
  id: string;
  description: string;
  executionModel: 'Optimizer' | 'Heuristic' | 'Process Chain' | string;
  optimizationModelType?: 'Continuo' | 'Mixed Integer' | 'Integer / Combinatorial' | string | null;
  cpSatContinuousVariableScale?: number | null;
  enableLineSequencing?: boolean;
  enableGreenfield?: boolean;
  /**
   * Temporary read compatibility with the provisional backend contract.
   */
  enableGreenfieldBrownfield?: boolean;
  planHorizonInDays?: number;
  productFilterId?: string | null;
  customerDemandPrioritizationModelId?: string | null;
  safetyStockPrioritizationModelId?: string | null;
  increaseObjectiveFunctionImpactInEarlierPeriods?: boolean;
  maximumPercentageIncreaseObjectiveFunctionImpactAtFirstPeriod?: number | string | null;
  objectiveFunctionTemporalImpactDecayModel?: string | null;
  objectiveFunctionTemporalImpactExponentialDecayFactor?: number | string | null;
  objectiveFunctionTemporalImpactMinimumMultiplier?: number | string | null;
  planTypeForWorkVersion?: string | null;
  logisticsCapacityLevel?: string | null;
  saveOptimizerVariablesAndConstraints?: boolean;
  saveInventoryPlan?: boolean;
  executeSupplyPlanForAllLocations?: boolean;
  generateUnconstrainedPlan?: boolean;
  heuristicUnconstrainedPlanCapacityLeveling?: boolean;
  ignoreProductionConstraintsForUnconstrainedPlan?: boolean;
  ignoreStorageConstraintsForUnconstrainedPlan?: boolean;
  ignoreOutboundConstraintsForUnconstrainedPlan?: boolean;
  ignoreInboundConstraintsForUnconstrainedPlan?: boolean;
  ignoreLeadTimeConstraintsForUnconstrainedPlan?: boolean;
  maximumTransferCostImpactForLeadTimeReduction?: number | null;
  maximumMaterialObjectiveValueImpactForLeadTimeReduction?: number | null;
  ignoreMarginConstraintsForUnconstrainedPlan?: boolean;
  metDemandObjectiveValueIncreasePercentage?: number | null;
  minimumMetDemandObjectiveValue?: number | null;
  alwaysUseDrp?: boolean;
  generatePlannedProductionOrders?: boolean;
  generatePlannedInboundOrders?: boolean;
  generatePlannedInboundOrdersWhenProductionIsViable?: boolean;
  roundRequisitionsByMoqAndLotSize?: boolean;
  roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods?: boolean;
  expeditionPeriodsToRoundRequisitionsByMoqAndLotSize?: number | null;
  roundPlannedPurchaseOrdersByMinimumLotSize?: boolean;
  allocateTransfersInFleets?: boolean;
  roundProductionByMoqAndLotSize?: boolean;
  roundProductionByMoqAndLotSizeForAllPeriods?: boolean;
  periodsToRoundProductionByMoqAndLotSize?: number | null;
  firmOrderCogsIncentivePercentage?: number | null;
  segmentInventoryByBatch?: boolean;
  increaseWorkingCapitalImpactForOlderBatches?: boolean;
  maximumPercentageIncreaseWorkingCapitalImpactForOldestBatch?: number | null;
  productionResourceConfigurationSet?: SupplyExecutionProfileProductionResourceConfiguration[] | null;
  [key: string]: unknown;
}

export interface NamedOptionDto {
  id: string;
  description?: string | null;
}

export interface LocationDto {
  id: string;
  description?: string | null;
}

export interface ProductionResourceDto {
  productionResourceId: string;
  locationId?: string | null;
  description?: string | null;
  active?: boolean | null;
}

export interface SupplyExecutionProfileProductionResourceConfiguration {
  productionResourceId: string;
  active?: boolean | null;
  hardOccupationRate?: number | string | null;
  locationId?: string | null;
  description?: string | null;
}

export interface SupplyExecutionProfileLocation {
  locationId: string;
  alwaysUseDrp?: boolean | null;
  priority?: boolean | null;
  executeSupplyPlan?: boolean | null;
  customerOrdersAndForecastReconciliationModelForProjectedInventory?: string | null;
  customerOrdersAndForecastReconciliationModelForSafetyStock?: string | null;
  customerOrderHorizonInDays?: number | null;
  generatePlannedInboundOrders?: boolean | null;
  generatePlannedProductionOrders?: boolean | null;
  considerProductionConstraints?: boolean | null;
  considerStorageConstraints?: boolean | null;
  considerInboundConstraints?: boolean | null;
  considerOutboundConstraints?: boolean | null;
  productiveCapacityType?: string | null;
  maximumReplenishmentLeadTimeInDays?: number | null;
  planHorizonInDays?: number | null;
  greenfieldLocation?: boolean | null;
  greenfieldLocationActivationCost?: number | null;
  [key: string]: unknown;
}

export interface SupplyExecutionProfileProcessChainStep {
  referencedProcessChainExecutionProfileId?: string | null;
  step?: number | null;
  considerPreviousStepRequisitions?: boolean | null;
  considerPreviousStepPlannedProductionOrders?: boolean | null;
  [key: string]: unknown;
}

export async function fetchSupplyExecutionProfiles() {
  return requestJson<SupplyExecutionProfile[]>('/api/secured/supplyplanexecutionprofile');
}

/**
 * Location overrides belong to the Enterprise overlay. The shared Planning
 * Front page keeps their chapter in place, but Community never calls a
 * private endpoint to populate it.
 */
export async function fetchSupplyExecutionProfileLocations(
  _executionProfileId: string,
): Promise<SupplyExecutionProfileLocation[]> {
  return [];
}

/** Process-chain details remain a visible, locked Enterprise capability. */
export async function fetchSupplyExecutionProfileProcessChainSteps(
  _executionProfileId: string,
): Promise<SupplyExecutionProfileProcessChainStep[]> {
  return [];
}

/** Per-profile production-resource exceptions are not configurable in Community. */
export async function fetchProductionResources(): Promise<ProductionResourceDto[]> {
  return [];
}

export async function saveSupplyExecutionProfileLocation(
  _locationOverride: SupplyExecutionProfileLocation & { executionProfileId: string },
): Promise<never> {
  throw new Error('Supply execution profile location overrides are available in Enterprise.');
}

export async function saveSupplyExecutionProfileLocations(
  _locationOverrides: Array<SupplyExecutionProfileLocation & { executionProfileId: string }>,
): Promise<never> {
  throw new Error('Supply execution profile location overrides are available in Enterprise.');
}

export async function deleteSupplyExecutionProfileLocation(
  _locationOverride: Pick<SupplyExecutionProfileLocation, 'locationId'> & { executionProfileId: string },
): Promise<never> {
  throw new Error('Supply execution profile location overrides are available in Enterprise.');
}

export async function saveSupplyExecutionProfileProcessChainStep(
  _step: SupplyExecutionProfileProcessChainStep & { baseProcessChainExecutionProfileId: string },
): Promise<never> {
  throw new Error('Supply execution profile process chains are available in Enterprise.');
}

export async function saveSupplyExecutionProfile(profile: SupplyExecutionProfile) {
  const communityPayload = toCommunitySupplyExecutionProfilePayload(profile);
  const response = await httpRequest('/api/secured/supplyplanexecutionprofile', {
    method: 'POST',
    body: JSON.stringify(communityPayload),
  });

  if (!response.ok) {
    throw new Error('Unable to save supply execution profile');
  }
}

export async function fetchProductFilters(): Promise<NamedOptionDto[]> {
  return [];
}

export async function fetchLocations(): Promise<LocationDto[]> {
  return [];
}

export async function fetchDemandPrioritizationModels(): Promise<NamedOptionDto[]> {
  return [];
}

export async function fetchSafetyStockPrioritizationModels(): Promise<NamedOptionDto[]> {
  return [];
}

export async function fetchInventoryPolicies() {
  return requestJson<NamedOptionDto[]>('/api/secured/configs/inventorypolicy');
}

export async function fetchTemporalSplitCurves(): Promise<NamedOptionDto[]> {
  return [];
}

export async function fetchLogisticsCostCurves(): Promise<NamedOptionDto[]> {
  return [];
}

export async function fetchUomIds(): Promise<string[]> {
  return [];
}
