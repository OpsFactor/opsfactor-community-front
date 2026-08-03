import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  LOCATION_CLUSTER_CRITERIA_CATALOG_ENDPOINT,
  type CommunityLocationClusterCriterion,
} from './location-cluster-criteria.types';

/** Preserves the backend explanation instead of creating an allowed-value fallback in the browser. */
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

/** Reads the raw allowed Location Cluster criterion enum once from the Community server. */
export class LocationClusterCriteriaCatalogService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getCriteria(): Promise<CommunityLocationClusterCriterion[]> {

    try {
      return await this.httpClient.request<CommunityLocationClusterCriterion[]>(LOCATION_CLUSTER_CRITERIA_CATALOG_ENDPOINT);
    } catch (error) {
      throw toBackendError(error, 'Unable to load the Location Cluster criteria catalog.');
    }
  }
}
