/** Exact operational profile shape published by the Community Demand Planning catalog. */
export interface CommunityDemandExecutionProfile {
  id: string;
  description: string | null;
  historicalSalesDocumentType: string | null;
  bucketSize: string | null;
  planningHorizonInPeriods: number | null;
  constrainPlanEditPeriods: boolean | null;
  initialPlanEditPeriod: number | null;
  finalPlanEditPeriod: number | null;
  defaultDemandPlanningUomId: string | null;
}

/** Editable clone of one persisted Demand profile returned by the Community GET. */
export interface CommunityDemandExecutionProfileDraft {
  id: string;
  description: string;
  bucketSize: string;
  planningHorizonInPeriods: string;
  constrainPlanEditPeriods: boolean;
  initialPlanEditPeriod: string;
  finalPlanEditPeriod: string;
  defaultDemandPlanningUomId: string;
}

/** Minimal write contract accepted by the Community Demand profile endpoint. */
export interface CommunityDemandExecutionProfileSaveRequest {
  id: string;
  description: string;
  historicalSalesDocumentType: 'SELLOUT';
  bucketSize?: string;
  planningHorizonInPeriods?: number;
  constrainPlanEditPeriods: boolean;
  initialPlanEditPeriod?: number;
  finalPlanEditPeriod?: number;
  defaultDemandPlanningUomId?: string;
}

/** Canonical Community read and write endpoint for Demand execution profiles. */
export const DEMAND_EXECUTION_PROFILE_ENDPOINT = '/api/secured/demandplanexecutionprofile';

/** Builds an editable draft without changing the captured server catalog. */
export function buildCommunityDemandExecutionProfileDraft(
  profile: CommunityDemandExecutionProfile,
): CommunityDemandExecutionProfileDraft {

  return {
    id: profile.id,
    description: profile.description ?? '',
    bucketSize: profile.bucketSize ?? '',
    planningHorizonInPeriods: formatDraftNumber(profile.planningHorizonInPeriods),
    constrainPlanEditPeriods: profile.constrainPlanEditPeriods ?? false,
    initialPlanEditPeriod: formatDraftNumber(profile.initialPlanEditPeriod),
    finalPlanEditPeriod: formatDraftNumber(profile.finalPlanEditPeriod),
    defaultDemandPlanningUomId: profile.defaultDemandPlanningUomId ?? '',
  };

}

/**
 * Produces the single safe Community write payload. Historical sales are
 * deliberately fixed to sell-out and no advanced Demand capability can enter
 * this representation.
 */
export function buildCommunityDemandExecutionProfileSaveRequest(
  draft: CommunityDemandExecutionProfileDraft,
): CommunityDemandExecutionProfileSaveRequest {

  const id = requireText(draft.id, 'Demand Planning execution profile ID');
  const planningHorizonInPeriods = parseOptionalInteger(
    draft.planningHorizonInPeriods,
    'Planning horizon',
    true,
  );

  return {
    id,
    description: draft.description.trim(),
    historicalSalesDocumentType: 'SELLOUT',
    bucketSize: toOptionalText(draft.bucketSize),
    planningHorizonInPeriods,
    constrainPlanEditPeriods: draft.constrainPlanEditPeriods,
    initialPlanEditPeriod: parseOptionalInteger(draft.initialPlanEditPeriod, 'Initial edit period'),
    finalPlanEditPeriod: parseOptionalInteger(draft.finalPlanEditPeriod, 'Final edit period'),
    defaultDemandPlanningUomId: toOptionalText(draft.defaultDemandPlanningUomId),
  };

}

function formatDraftNumber(value: number | null): string {

  return value === null ? '' : String(value);

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

function parseOptionalInteger(
  value: string,
  fieldName: string,
  requirePositive = false,
): number | undefined {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || (requirePositive && parsedValue <= 0)) {
    const constraint = requirePositive ? 'a positive integer' : 'an integer';
    throw new Error(`${fieldName} must be ${constraint} when informed.`);
  }

  return parsedValue;

}
