import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import { MATERIAL_STATUS_CATALOG_ENDPOINT, type CommunityMaterialStatus } from './material-statuses.types';

/** Preserves the backend response explanation instead of replacing it with a local fallback. */
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

/** Reads the raw allowed Material Status enum from the Community server once. */
export class MaterialStatusesInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getStatuses(): Promise<CommunityMaterialStatus[]> {

    try {
      return await this.httpClient.request<CommunityMaterialStatus[]>(MATERIAL_STATUS_CATALOG_ENDPOINT);
    } catch (error) {
      throw toBackendError(error, 'Unable to load the Material Status catalog.');
    }
  }
}
