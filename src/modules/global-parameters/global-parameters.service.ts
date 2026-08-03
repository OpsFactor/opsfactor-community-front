import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type {
  CommunityGlobalParametersSaveRequest,
  CommunityGlobalParametersSnapshot,
} from './global-parameters.types';

export const GLOBAL_PARAMETERS_ENDPOINT = '/api/secured/configs/parameters';

/** Preserves the backend explanation instead of creating a local configuration fallback. */
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

/** Reads and replaces the one server-owned Community Global Parameters snapshot. */
export class GlobalParametersService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;

  }

  public async getSnapshot(): Promise<CommunityGlobalParametersSnapshot> {

    try {
      return await this.httpClient.request<CommunityGlobalParametersSnapshot>(GLOBAL_PARAMETERS_ENDPOINT);
    } catch (error) {
      throw toBackendError(error, 'Unable to load the Global Parameters snapshot.');
    }

  }

  /** Sends only a reviewed Community payload; callers must reload after success. */
  public async saveSnapshot(
    request: CommunityGlobalParametersSaveRequest,
  ): Promise<CommunityGlobalParametersSnapshot> {

    try {
      return await this.httpClient.request<CommunityGlobalParametersSnapshot>(GLOBAL_PARAMETERS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save the Global Parameters snapshot.');
    }

  }
}
