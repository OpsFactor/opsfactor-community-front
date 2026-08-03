import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import {
  buildDeploymentOperationalQuery,
  DEPLOYMENT_OPERATIONAL_ENDPOINTS,
  type DeploymentNamedOption,
  type DeploymentOperationalInboundUpdate,
  type DeploymentOperationalLine,
  type DeploymentOperationalSelection,
  type DeploymentSupplyPlanOption,
} from './deployment-operational.types';

/** Preserves a functional backend explanation rather than replacing it with a browser generic. */
function toBackendError(error: unknown, fallback: string): Error {

  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(fallback);
  }

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || error.responseText.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }

}

/** Loads only the three existing catalogs needed to select one physical deployment route. */
export async function getDeploymentOperationalSelectors(): Promise<{
  supplyPlans: DeploymentSupplyPlanOption[];
  locations: DeploymentNamedOption[];
  materials: DeploymentNamedOption[];
}> {

  try {
    const [supplyPlans, locations, materials] = await Promise.all([
      httpClient.request<DeploymentSupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<DeploymentNamedOption[]>('/api/secured/location'),
      httpClient.request<DeploymentNamedOption[]>('/api/secured/material'),
    ]);
    return { supplyPlans, locations, materials };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Community deployment selectors.');
  }

}

/** Reads exactly one current Working Plan route. */
export async function getDeploymentOperationalLine(
  selection: DeploymentOperationalSelection,
): Promise<DeploymentOperationalLine> {

  try {
    return await httpClient.request<DeploymentOperationalLine>(
      `${DEPLOYMENT_OPERATIONAL_ENDPOINTS.line}?${buildDeploymentOperationalQuery(selection).toString()}`,
    );
  } catch (error) {
    throw toBackendError(error, 'Unable to load the Community deployment route.');
  }

}

/** Replaces the planned inbound quantity atomically; the returned line becomes the new page snapshot. */
export async function updateDeploymentOperationalInbound(
  update: DeploymentOperationalInboundUpdate,
): Promise<DeploymentOperationalLine> {

  try {
    return await httpClient.request<DeploymentOperationalLine>(DEPLOYMENT_OPERATIONAL_ENDPOINTS.update, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to update the Community deployment route.');
  }

}
