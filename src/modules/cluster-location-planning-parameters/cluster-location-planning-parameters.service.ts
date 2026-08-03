import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT,
  type CommunityClusterLocationPlanningParameter,
} from './cluster-location-planning-parameters.types';

/** Keeps the backend explanation intact when the administrative snapshot cannot be read. */
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

/** Reads only the Community administrative cluster planning-parameter snapshot. */
export class ClusterLocationPlanningParametersInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getParameters(): Promise<CommunityClusterLocationPlanningParameter[]> {

    try {
      return await this.httpClient.request<CommunityClusterLocationPlanningParameter[]>(
        CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT,
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load Location Cluster planning parameters.');
    }
  }
}
