import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import type { SupplyPlan } from '../supply-planning/supply-plan.types';
import { SUPPLY_PLAN_ENDPOINTS } from '../supply-planning/supply-plan.types';
import { buildMaterialFlowsEndpoint, type MaterialFlows } from './material-flows.types';

/** Keeps a functional backend explanation visible instead of replacing it with a generic error. */
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

/** Loads only the existing authoritative Community Supply Plan catalog. */
export async function getMaterialFlowsSupplyPlans(): Promise<SupplyPlan[]> {

  try {
    return await httpClient.request<SupplyPlan[]>(SUPPLY_PLAN_ENDPOINTS.list);
  } catch (error) {
    throw toBackendError(error, 'Unable to load Supply Plans for Material Flows.');
  }

}

/** Reads one backend-materialized origin-destination matrix without a browser-side filter or aggregation. */
export async function getMaterialFlows(supplyPlanId: number): Promise<MaterialFlows> {

  try {
    return await httpClient.request<MaterialFlows>(buildMaterialFlowsEndpoint(supplyPlanId));
  } catch (error) {
    throw toBackendError(error, 'Unable to load Material Flows.');
  }

}
