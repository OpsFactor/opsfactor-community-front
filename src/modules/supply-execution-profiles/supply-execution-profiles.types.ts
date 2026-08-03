/**
 * Community-facing snapshot of a Supply Planning execution profile. Fields
 * that have no Community runtime meaning are deliberately absent.
 */
export interface CommunitySupplyExecutionProfile {
  id?: string | null;
  description?: string | null;
  executionModel?: string | null;
  planHorizonInDays?: number | null;
  generatePlannedInboundOrders?: boolean | null;
  generatePlannedProductionOrders?: boolean | null;
  generatePlannedInboundOrdersWhenProductionIsViable?: boolean | null;
  alwaysUseDrp?: boolean | null;
  considerForecastForMto?: boolean | null;
  automaticallyRunConstrainedPlan?: boolean | null;
  roundRequisitionsByMoqAndLotSize?: boolean | null;
  roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods?: boolean | null;
  expeditionPeriodsToRoundRequisitionsByMoqAndLotSize?: number | null;
  roundProductionByMoqAndLotSize?: boolean | null;
  roundProductionByMoqAndLotSizeForAllPeriods?: boolean | null;
  periodsToRoundProductionByMoqAndLotSize?: number | null;
  considerInitialStock?: boolean | null;
  saveInventoryPlan?: boolean | null;
  considerProductionConstraints?: boolean | null;
  productiveCapacityType?: string | null;
  targetStockModel?: string | null;
  generateUnconstrainedPlan?: boolean | null;
  heuristicUnconstrainedPlanCapacityLeveling?: boolean | null;
  ignoreProductionConstraintsForUnconstrainedPlan?: boolean | null;
  consolidateClientDemand?: boolean | null;
  demandConsolidationMode?: string | null;
  planTypeForWorkVersion?: string | null;
  directDemandFairShare?: boolean | null;
  inventoryPolicyIdSet?: string[] | null;
}

/** Editable representation of an existing Community profile snapshot. */
export interface CommunitySupplyExecutionProfileDraft {
  id: string;
  description: string;
  planHorizonInDays: string;
  generatePlannedInboundOrders: boolean;
  generatePlannedProductionOrders: boolean;
  generatePlannedInboundOrdersWhenProductionIsViable: boolean;
  alwaysUseDrp: boolean;
  roundRequisitionsByMoqAndLotSize: boolean;
  roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods: boolean;
  expeditionPeriodsToRoundRequisitionsByMoqAndLotSize: string;
  roundProductionByMoqAndLotSize: boolean;
  roundProductionByMoqAndLotSizeForAllPeriods: boolean;
  periodsToRoundProductionByMoqAndLotSize: string;
  considerInitialStock: boolean;
  saveInventoryPlan: boolean;
  considerProductionConstraints: boolean;
  targetStockModel: string;
  generateUnconstrainedPlan: boolean;
  heuristicUnconstrainedPlanCapacityLeveling: boolean;
  ignoreProductionConstraintsForUnconstrainedPlan: boolean;
  consolidateClientDemand: boolean;
  demandConsolidationMode: string;
  planTypeForWorkVersion: 'PLANO_RESTRITO' | 'PLANO_IRRESTRITO';
  inventoryPolicyIds: string;
}

/** Full Community POST contract produced from an existing profile only. */
export interface CommunitySupplyExecutionProfileSaveRequest {
  id: string;
  description: string;
  executionModel: 'HEURISTICO';
  planHorizonInDays?: number;
  generatePlannedInboundOrders: boolean;
  generatePlannedProductionOrders: boolean;
  generatePlannedInboundOrdersWhenProductionIsViable: boolean;
  alwaysUseDrp: boolean;
  considerForecastForMto: true;
  automaticallyRunConstrainedPlan: true;
  roundRequisitionsByMoqAndLotSize: boolean;
  roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods: boolean;
  expeditionPeriodsToRoundRequisitionsByMoqAndLotSize?: number;
  roundProductionByMoqAndLotSize: boolean;
  roundProductionByMoqAndLotSizeForAllPeriods: boolean;
  periodsToRoundProductionByMoqAndLotSize?: number;
  considerInitialStock: boolean;
  saveInventoryPlan: boolean;
  considerProductionConstraints: boolean;
  productiveCapacityType: 'HORAS_POR_DIA';
  targetStockModel?: string;
  generateUnconstrainedPlan: boolean;
  /** Shared heuristic opt-in; an absent persisted value is explicitly false. */
  heuristicUnconstrainedPlanCapacityLeveling: boolean;
  ignoreProductionConstraintsForUnconstrainedPlan: boolean;
  directDemandFairShare: true;
  consolidateClientDemand: boolean;
  demandConsolidationMode?: string;
  planTypeForWorkVersion: 'PLANO_RESTRITO' | 'PLANO_IRRESTRITO';
  inventoryPolicyIdSet: string[];
}

/** Canonical Community read and write endpoint for Supply execution profiles. */
export const SUPPLY_EXECUTION_PROFILE_ENDPOINT = '/api/secured/supplyplanexecutionprofile';

/** Builds an editor draft without mutating the captured server profile. */
export function buildCommunitySupplyExecutionProfileDraft(
  profile: CommunitySupplyExecutionProfile,
): CommunitySupplyExecutionProfileDraft {

  return {
    id: profile.id?.trim() ?? '',
    description: profile.description ?? '',
    planHorizonInDays: formatDraftNumber(profile.planHorizonInDays),
    generatePlannedInboundOrders: profile.generatePlannedInboundOrders ?? false,
    generatePlannedProductionOrders: profile.generatePlannedProductionOrders ?? false,
    generatePlannedInboundOrdersWhenProductionIsViable:
      profile.generatePlannedInboundOrdersWhenProductionIsViable ?? false,
    alwaysUseDrp: profile.alwaysUseDrp ?? false,
    roundRequisitionsByMoqAndLotSize: profile.roundRequisitionsByMoqAndLotSize ?? false,
    roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods:
      profile.roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods ?? false,
    expeditionPeriodsToRoundRequisitionsByMoqAndLotSize:
      formatDraftNumber(profile.expeditionPeriodsToRoundRequisitionsByMoqAndLotSize),
    roundProductionByMoqAndLotSize: profile.roundProductionByMoqAndLotSize ?? false,
    roundProductionByMoqAndLotSizeForAllPeriods:
      profile.roundProductionByMoqAndLotSizeForAllPeriods ?? false,
    periodsToRoundProductionByMoqAndLotSize:
      formatDraftNumber(profile.periodsToRoundProductionByMoqAndLotSize),
    considerInitialStock: profile.considerInitialStock ?? false,
    saveInventoryPlan: profile.saveInventoryPlan ?? false,
    considerProductionConstraints: profile.considerProductionConstraints ?? false,
    targetStockModel: profile.targetStockModel ?? '',
    generateUnconstrainedPlan: profile.generateUnconstrainedPlan ?? true,
    heuristicUnconstrainedPlanCapacityLeveling:
      profile.heuristicUnconstrainedPlanCapacityLeveling ?? false,
    ignoreProductionConstraintsForUnconstrainedPlan:
      profile.ignoreProductionConstraintsForUnconstrainedPlan ?? false,
    consolidateClientDemand: profile.consolidateClientDemand ?? false,
    demandConsolidationMode: profile.demandConsolidationMode ?? '',
    planTypeForWorkVersion: profile.planTypeForWorkVersion === 'PLANO_IRRESTRITO'
      ? 'PLANO_IRRESTRITO'
      : 'PLANO_RESTRITO',
    inventoryPolicyIds: (profile.inventoryPolicyIdSet ?? []).join('\n'),
  };

}

/**
 * Validates and materializes the one payload accepted by the Community
 * endpoint. The invariants are explicit so editing cannot re-enable an
 * Enterprise engine or suppress the constrained heuristic round.
 */
export function buildCommunitySupplyExecutionProfileSaveRequest(
  draft: CommunitySupplyExecutionProfileDraft,
): CommunitySupplyExecutionProfileSaveRequest {

  const id = requireText(draft.id, 'Supply Planning execution profile ID');
  const description = requireText(draft.description, 'Supply Planning execution profile description');
  const inventoryPolicyIdSet = parseInventoryPolicyIds(draft.inventoryPolicyIds);

  return {
    id,
    description,
    executionModel: 'HEURISTICO',
    planHorizonInDays: parseOptionalPositiveInteger(draft.planHorizonInDays, 'Plan horizon'),
    generatePlannedInboundOrders: draft.generatePlannedInboundOrders,
    generatePlannedProductionOrders: draft.generatePlannedProductionOrders,
    generatePlannedInboundOrdersWhenProductionIsViable:
      draft.generatePlannedInboundOrdersWhenProductionIsViable,
    alwaysUseDrp: draft.alwaysUseDrp,
    considerForecastForMto: true,
    automaticallyRunConstrainedPlan: true,
    roundRequisitionsByMoqAndLotSize: draft.roundRequisitionsByMoqAndLotSize,
    roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods:
      draft.roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods,
    expeditionPeriodsToRoundRequisitionsByMoqAndLotSize: parseOptionalPositiveInteger(
      draft.expeditionPeriodsToRoundRequisitionsByMoqAndLotSize,
      'Requisition rounding periods',
    ),
    roundProductionByMoqAndLotSize: draft.roundProductionByMoqAndLotSize,
    roundProductionByMoqAndLotSizeForAllPeriods: draft.roundProductionByMoqAndLotSizeForAllPeriods,
    periodsToRoundProductionByMoqAndLotSize: parseOptionalPositiveInteger(
      draft.periodsToRoundProductionByMoqAndLotSize,
      'Production rounding periods',
    ),
    considerInitialStock: draft.considerInitialStock,
    saveInventoryPlan: draft.saveInventoryPlan,
    considerProductionConstraints: draft.considerProductionConstraints,
    productiveCapacityType: 'HORAS_POR_DIA',
    targetStockModel: toOptionalText(draft.targetStockModel),
    generateUnconstrainedPlan: draft.generateUnconstrainedPlan,
    heuristicUnconstrainedPlanCapacityLeveling: draft.heuristicUnconstrainedPlanCapacityLeveling,
    ignoreProductionConstraintsForUnconstrainedPlan:
      draft.ignoreProductionConstraintsForUnconstrainedPlan,
    directDemandFairShare: true,
    consolidateClientDemand: draft.consolidateClientDemand,
    demandConsolidationMode: toOptionalText(draft.demandConsolidationMode),
    planTypeForWorkVersion: draft.planTypeForWorkVersion,
    inventoryPolicyIdSet,
  };

}

/** Makes the server Set stable for comparison without mutating its response. */
export function sortSupplyExecutionProfiles(
  profiles: CommunitySupplyExecutionProfile[],
): CommunitySupplyExecutionProfile[] {

  return [...profiles].sort((firstProfile, secondProfile) => {
    const firstId = firstProfile.id ?? '';
    const secondId = secondProfile.id ?? '';
    const idComparison = compareText(firstId, secondId);

    if (idComparison !== 0) {
      return idComparison;
    }

    return compareText(firstProfile.description ?? '', secondProfile.description ?? '');
  });

}

/** Uses normalized text followed by its original value as deterministic tie-breaker. */
function compareText(firstValue: string, secondValue: string): number {

  const normalizedFirstValue = firstValue.toLocaleLowerCase('en-US');
  const normalizedSecondValue = secondValue.toLocaleLowerCase('en-US');

  if (normalizedFirstValue < normalizedSecondValue) return -1;
  if (normalizedFirstValue > normalizedSecondValue) return 1;
  if (firstValue < secondValue) return -1;
  if (firstValue > secondValue) return 1;
  return 0;

}

function formatDraftNumber(value: number | null | undefined): string {

  return value === null || value === undefined ? '' : String(value);

}

function requireText(value: string, fieldName: string): string {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;

}

function toOptionalText(value: string): string | undefined {

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? undefined : normalizedValue;

}

function parseOptionalPositiveInteger(value: string, fieldName: string): number | undefined {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer when informed.`);
  }

  return parsedValue;

}

function parseInventoryPolicyIds(value: string): string[] {

  const policyIds = value
    .split(/[,\n]/)
    .map((policyId) => policyId.trim())
    .filter((policyId) => policyId.length > 0);
  const uniquePolicyIds = new Set(policyIds);

  if (uniquePolicyIds.size !== policyIds.length) {
    throw new Error('Inventory Policy IDs cannot be duplicated.');
  }

  return policyIds;

}
