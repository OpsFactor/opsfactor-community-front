import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  DEMAND_EXECUTION_PROFILE_ENDPOINT,
  type CommunityDemandExecutionProfile,
  type CommunityDemandExecutionProfileSaveRequest,
} from './demand-execution-profiles.types';

/** Keeps the backend explanation intact rather than replacing a failed catalog with local data. */
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

/** Reads and saves Community Demand Planning profiles through the canonical root endpoint. */
export class DemandExecutionProfilesInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getProfiles(): Promise<CommunityDemandExecutionProfile[]> {

    try {
      return await this.httpClient.request<CommunityDemandExecutionProfile[]>(DEMAND_EXECUTION_PROFILE_ENDPOINT);
    } catch (error) {
      throw toBackendError(error, 'Unable to load Demand Planning execution profiles.');
    }
  }

  /** Creates, copies, or updates one Community-safe profile snapshot. */
  public async saveProfile(snapshot: CommunityDemandExecutionProfileSaveRequest): Promise<string> {

    try {
      return await this.httpClient.request<string>(DEMAND_EXECUTION_PROFILE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save Demand Planning execution profile.');
    }

  }
}
