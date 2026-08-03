import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  buildInventoryPolicyDetailEndpoint,
  type CommunityInventoryPolicySaveRequest,
  type CommunityInventoryPolicy,
} from './inventory-policies.types';

/** Preserves the concrete response returned by the Community backend. */
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

/** Reads one explicitly identified operational inventory policy and nothing else. */
export class InventoryPoliciesInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getPolicy(inventoryPolicyId: string): Promise<CommunityInventoryPolicy> {

    try {
      return await this.httpClient.request<CommunityInventoryPolicy>(
        buildInventoryPolicyDetailEndpoint(inventoryPolicyId),
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load the inventory policy.');
    }
  }

  /**
   * Replaces one already loaded Community policy snapshot. The endpoint owns
   * the transactional validation, removal and batch persistence of its rules.
   */
  public async savePolicy(snapshot: CommunityInventoryPolicySaveRequest): Promise<string> {

    try {
      return await this.httpClient.request<string>('/api/secured/configs/inventorypolicy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save the inventory policy.');
    }
  }
}
