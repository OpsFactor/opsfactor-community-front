import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type { CommunityUser, CommunityUserSaveRequest } from './user-administration.types';

/** Preserves a useful backend validation or lifecycle explanation without screen-specific fallbacks. */
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

/** Bounded transport for the simple Community user lifecycle. */
export class CommunityUserAdministrationService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  /** Lists administrative users; the response must not contain password material. */
  public async getUsers(): Promise<CommunityUser[]> {

    try {
      return await this.httpClient.request<CommunityUser[]>('/api/secured/user');
    } catch (error) {
      throw toBackendError(error, 'Unable to load Community users.');
    }
  }

  /** Reads the backend-published role allowlist instead of mirroring a legacy role catalog. */
  public async getRoleList(): Promise<string[]> {

    try {
      return await this.httpClient.request<string[]>('/api/secured/user/rolelist');
    } catch (error) {
      throw toBackendError(error, 'Unable to load the Community user role.');
    }
  }

  /** Saves one simple user; the caller owns the explicit null-password preserve contract. */
  public async saveUser(request: CommunityUserSaveRequest): Promise<string> {

    try {
      return await this.httpClient.request<string>('/api/secured/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save the Community user.');
    }
  }
}
