import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import { locationMasterDataEndpoint, type CommunityLocationMasterData } from './location-master-data.types';

/** Preserves backend validation failures without creating a browser-side fallback catalog. */
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

/** Read-only transport for the complete Community location master-data snapshot. */
export class LocationMasterDataCatalogService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getLocations(): Promise<CommunityLocationMasterData[]> {

    try {
      return await this.httpClient.request<CommunityLocationMasterData[]>(locationMasterDataEndpoint);
    } catch (error) {
      throw toBackendError(error, 'Unable to load locations.');
    }
  }
}
