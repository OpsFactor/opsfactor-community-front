import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  buildLowLevelCodeMaterialEndpoint,
  type CommunityLowLevelCodeSnapshot,
} from './low-level-code.types';

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

/** Read-only transport for a single explicit Low Level Code material diagnostic. */
export class LowLevelCodeInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getMaterialSnapshot(
    supplyNetworkVersionId: string,
    materialId: string,
  ): Promise<CommunityLowLevelCodeSnapshot> {

    try {
      return await this.httpClient.request<CommunityLowLevelCodeSnapshot>(
        buildLowLevelCodeMaterialEndpoint(supplyNetworkVersionId, materialId),
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load the Low Level Code material diagnostic.');
    }
  }
}
