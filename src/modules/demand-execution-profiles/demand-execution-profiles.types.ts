/** Exact operational profile shape published by the Community Demand Planning catalog. */
export interface CommunityDemandExecutionProfile {
  id: string;
  description?: string | null;
  calendarProfileId?: string | null;
  historicalSalesDocumentType?: string | null;
  bucketSize?: string | null;
  planningHorizonInPeriods?: number | null;
  constrainPlanEditPeriods?: boolean | null;
  initialPlanEditPeriod?: number | null;
  finalPlanEditPeriod?: number | null;
  defaultDemandPlanningUomId?: string | null;
}

/** Editable clone of one persisted Demand profile returned by the Community GET. */
export interface CommunityDemandExecutionProfileDraft {
  id: string;
  description: string;
  calendarProfileId: string;
  constrainPlanEditPeriods: boolean;
  initialPlanEditPeriod: string;
  finalPlanEditPeriod: string;
  defaultDemandPlanningUomId: string;
}

/** Minimal write contract accepted by the Community Demand profile endpoint. */
export interface CommunityDemandExecutionProfileSaveRequest {
  id: string;
  description: string;
  calendarProfileId: string;
  historicalSalesDocumentType: 'Sell-out';
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
    calendarProfileId: profile.calendarProfileId ?? '',
    constrainPlanEditPeriods: false,
    initialPlanEditPeriod: '',
    finalPlanEditPeriod: '',
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
  const calendarProfileId = requireText(draft.calendarProfileId, 'Calendar profile');

  return {
    id,
    description: draft.description.trim(),
    historicalSalesDocumentType: 'Sell-out',
    calendarProfileId,
    constrainPlanEditPeriods: false,
    initialPlanEditPeriod: undefined,
    finalPlanEditPeriod: undefined,
    defaultDemandPlanningUomId: toOptionalText(draft.defaultDemandPlanningUomId),
  };

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
