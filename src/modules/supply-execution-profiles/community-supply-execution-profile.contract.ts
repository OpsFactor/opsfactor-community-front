/**
 * Minimum input shape accepted by the Community edition boundary.
 *
 * The canonical Planning Front page carries the complete Enterprise profile
 * model. This contract intentionally accepts that broad source while returning
 * only fields that have runtime meaning in Community.
 */
export interface SupplyExecutionProfileSource {
  id: string;
  description?: string | null;
  inventoryPolicyIdSet?: string[] | null;
  [key: string]: unknown;
}

/** Payload sent to the public heuristic-only backend. */
export interface CommunitySupplyExecutionProfilePayload {
  id: string;
  description: string;
  executionModel: 'Heuristic';
  considerForecastForMto: true;
  automaticallyRunConstrainedPlan: true;
  productiveCapacityType: 'Total Hours / Day';
  directDemandFairShare: true;
  executeSupplyPlanForAllLocations: true;
  inventoryPolicyIdSet: string[];
  [key: string]: unknown;
}

/** Fields the Community UI may copy from the canonical Planning Front draft. */
export const COMMUNITY_EDITABLE_SUPPLY_EXECUTION_PROFILE_FIELDS = [
  'planHorizonInDays',
  'generatePlannedInboundOrders',
  'generatePlannedProductionOrders',
  'generatePlannedInboundOrdersWhenProductionIsViable',
  'alwaysUseDrp',
  'roundRequisitionsByMoqAndLotSize',
  'roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods',
  'expeditionPeriodsToRoundRequisitionsByMoqAndLotSize',
  'roundProductionByMoqAndLotSize',
  'roundProductionByMoqAndLotSizeForAllPeriods',
  'periodsToRoundProductionByMoqAndLotSize',
  'considerInitialStock',
  'saveInventoryPlan',
  'considerProductionConstraints',
  'targetStockModel',
  'planTypeForWorkVersion',
] as const;

/**
 * Applies the Community edition boundary for create, copy, and update.
 *
 * Locked fields remain visible in the canonical page, but never cross the
 * network boundary. Fixed values make the effective Community behavior
 * explicit and prevent a broad draft from re-enabling private capabilities.
 */
export function toCommunitySupplyExecutionProfilePayload(
  profile: SupplyExecutionProfileSource,
): CommunitySupplyExecutionProfilePayload {

  const id = profile.id.trim();
  if (id.length === 0) {
    throw new Error('Supply Planning execution profile id is required.');
  }

  const payload: CommunitySupplyExecutionProfilePayload = {
    id,
    description: profile.description?.trim() || id,
    executionModel: 'Heuristic',
    considerForecastForMto: true,
    automaticallyRunConstrainedPlan: true,
    productiveCapacityType: 'Total Hours / Day',
    directDemandFairShare: true,
    executeSupplyPlanForAllLocations: true,
    inventoryPolicyIdSet: Array.isArray(profile.inventoryPolicyIdSet)
      ? [...profile.inventoryPolicyIdSet]
      : [],
  };

  for (const field of COMMUNITY_EDITABLE_SUPPLY_EXECUTION_PROFILE_FIELDS) {
    if (profile[field] !== undefined) {
      payload[field] = profile[field];
    }
  }

  return payload;

}
