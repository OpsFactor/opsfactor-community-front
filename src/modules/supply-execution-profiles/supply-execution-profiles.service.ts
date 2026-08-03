import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  sortSupplyExecutionProfiles,
  SUPPLY_EXECUTION_PROFILE_ENDPOINT,
} from './supply-execution-profiles.types';
import type {
  CommunitySupplyExecutionProfile,
  CommunitySupplyExecutionProfileSaveRequest,
} from './supply-execution-profiles.types';

/** Preserves a backend explanation without manufacturing a local fallback. */
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

/**
 * Reads and replaces existing Community heuristic-profile snapshots. It owns
 * no creation, deletion, Supply execution, optimizer, or Data workflow.
 */
export class SupplyExecutionProfilesInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getProfiles(): Promise<CommunitySupplyExecutionProfile[]> {

    try {
      const profiles = await this.httpClient.request<CommunitySupplyExecutionProfile[]>(
        SUPPLY_EXECUTION_PROFILE_ENDPOINT,
      );
      return sortSupplyExecutionProfiles(profiles);
    } catch (error) {
      throw toBackendError(error, 'Unable to load Supply Planning execution profiles.');
    }
  }

  /**
   * Saves exactly one existing profile snapshot. The server owns validation of
   * Inventory Policy references and the Community/Enterprise capability gate.
   */
  public async saveProfile(
    snapshot: CommunitySupplyExecutionProfileSaveRequest,
  ): Promise<string> {

    try {
      return await this.httpClient.request<string>(SUPPLY_EXECUTION_PROFILE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save Supply Planning execution profile.');
    }

  }
}
