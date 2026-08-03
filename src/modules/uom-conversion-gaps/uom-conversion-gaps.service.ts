import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import {
  buildDemandPlanningUomConversionGapsEndpoint,
  buildDeploymentUomConversionGapsEndpoint,
  buildMaterialUomConversionDetailEndpoint,
  buildSupplyPlanningUomConversionGapsEndpoint,
  UOM_CONVERSION_GAP_ENDPOINTS,
  type DemandPlanOption,
  type ExecutionProfileOption,
  type SupplyNetworkVersionOption,
  type SupplyPlanOption,
  type UomConversionDetail,
  type UomConversionGap,
} from './uom-conversion-gaps.types';

/** Keeps backend validation explanations visible instead of replacing them with a generic browser failure. */
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

/** Loads only the existing catalogs used to identify an explicit diagnostic input. */
export async function getUomConversionGapSelectors(): Promise<{
  demandPlanningProfiles: ExecutionProfileOption[];
  supplyPlanningProfiles: ExecutionProfileOption[];
  supplyNetworkVersions: SupplyNetworkVersionOption[];
  demandPlans: DemandPlanOption[];
  supplyPlans: SupplyPlanOption[];
}> {

  try {
    const [demandPlanningProfiles, supplyPlanningProfiles, supplyNetworkVersions, demandPlans, supplyPlans] = await Promise.all([
      httpClient.request<ExecutionProfileOption[]>(UOM_CONVERSION_GAP_ENDPOINTS.demandPlanningProfiles),
      httpClient.request<ExecutionProfileOption[]>(UOM_CONVERSION_GAP_ENDPOINTS.supplyPlanningProfiles),
      httpClient.request<SupplyNetworkVersionOption[]>(UOM_CONVERSION_GAP_ENDPOINTS.supplyNetworkVersions),
      httpClient.request<DemandPlanOption[]>(UOM_CONVERSION_GAP_ENDPOINTS.demandPlans),
      httpClient.request<SupplyPlanOption[]>(UOM_CONVERSION_GAP_ENDPOINTS.supplyPlans),
    ]);
    return { demandPlanningProfiles, supplyPlanningProfiles, supplyNetworkVersions, demandPlans, supplyPlans };
  } catch (error) {
    throw toBackendError(error, 'Unable to load UOM conversion diagnostic selectors.');
  }

}

/** Reads a DP gap list only after the user selected a profile and explicitly requested it. */
export async function getDemandPlanningUomConversionGaps(
  demandPlanningExecutionProfileId: string,
  referencePeriod: string,
): Promise<UomConversionGap[]> {

  try {
    return await httpClient.request<UomConversionGap[]>(
      buildDemandPlanningUomConversionGapsEndpoint(demandPlanningExecutionProfileId, referencePeriod),
    );
  } catch (error) {
    throw toBackendError(error, 'Unable to diagnose Demand Planning UOM conversion gaps.');
  }

}

/** Reads an SNP gap list only from all five explicit scalar inputs. */
export async function getSupplyPlanningUomConversionGaps(input: {
  referencePeriod: string;
  bucketSize: string;
  supplyNetworkVersionId: string;
  supplyPlanningExecutionProfileId: string;
  demandPlanId: number;
}): Promise<UomConversionGap[]> {

  try {
    return await httpClient.request<UomConversionGap[]>(buildSupplyPlanningUomConversionGapsEndpoint(input));
  } catch (error) {
    throw toBackendError(error, 'Unable to diagnose Supply Planning UOM conversion gaps.');
  }

}

/** Reads a Deployment gap list only after one Supply Plan has been selected. */
export async function getDeploymentUomConversionGaps(supplyPlanId: number): Promise<UomConversionGap[]> {

  try {
    return await httpClient.request<UomConversionGap[]>(buildDeploymentUomConversionGapsEndpoint(supplyPlanId));
  } catch (error) {
    throw toBackendError(error, 'Unable to diagnose Deployment UOM conversion gaps.');
  }

}

/** Opens a single material-specific conversion explanation after a row action. */
export async function getMaterialUomConversionDetail(gap: UomConversionGap): Promise<UomConversionDetail> {

  try {
    return await httpClient.request<UomConversionDetail>(buildMaterialUomConversionDetailEndpoint(gap));
  } catch (error) {
    throw toBackendError(error, 'Unable to load material-specific UOM conversion detail.');
  }

}
