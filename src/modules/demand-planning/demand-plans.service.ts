import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import type {
  CommunityDemandPlanGenerationRequest,
  CommunityDemandPlanGenerationResponse,
  DemandPlan,
  DemandPlanDeleteResponse,
  DemandPlanPeriod,
  DemandPlanningExecutionProfile,
} from './demand-plan.types';

/**
 * Preserves a backend message when the server provided one, as the API already
 * owns the functional explanation for a failed planning operation.
 */
function toBackendError(error: unknown, fallback: string): Error {
  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(fallback);
  }

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }
}

export async function getDemandPlans(): Promise<DemandPlan[]> {
  try {
    return await httpClient.request<DemandPlan[]>('/api/secured/planning/demand/demandplan');
  } catch (error) {
    throw toBackendError(error, 'Unable to load demand plans.');
  }
}

/**
 * Reads the persisted calendar of one Demand Plan only after an explicit
 * request from the history catalog. This is intentionally not the planning
 * book or any demand-plan detail projection.
 */
export async function getDemandPlanPeriods(demandPlanId: number): Promise<DemandPlanPeriod[]> {
  try {
    return await httpClient.request<DemandPlanPeriod[]>(`/api/secured/planning/demand/${demandPlanId}/periods`);
  } catch (error) {
    throw toBackendError(error, 'Unable to load Demand Plan periods.');
  }
}

/**
 * Reads the existing Community profile catalog for the generation form.
 * No profile is loaded, edited or saved as part of Demand Plan generation.
 */
export async function getDemandPlanningExecutionProfiles(): Promise<DemandPlanningExecutionProfile[]> {
  try {
    return await httpClient.request<DemandPlanningExecutionProfile[]>('/api/secured/demandplanexecutionprofile');
  } catch (error) {
    throw toBackendError(error, 'Unable to load Demand Planning execution profiles.');
  }
}

/**
 * Starts the canonical Community Demand Planning command once. A successful
 * HTTP response means its synchronous execution was accepted; Process Status
 * remains the audit surface for the persisted outcome.
 */
export async function generateDemandPlan(
  request: CommunityDemandPlanGenerationRequest,
): Promise<CommunityDemandPlanGenerationResponse> {
  try {
    return await httpClient.request<CommunityDemandPlanGenerationResponse>('/api/secured/planning/demand/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to start Demand Planning generation.');
  }
}

export async function deleteDemandPlans(demandPlans: DemandPlan[]): Promise<DemandPlanDeleteResponse> {
  try {
    return await httpClient.request<DemandPlanDeleteResponse>('/api/secured/planning/demand/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demandPlans),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to delete the selected demand plans.');
  }
}
