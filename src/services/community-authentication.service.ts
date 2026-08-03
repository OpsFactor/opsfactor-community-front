import {
  HttpClient,
  InMemoryBasicAuthenticationStrategy,
  type BasicCredentials,
} from '@opsfactor/front-core';

const basicAuthenticationStrategy = new InMemoryBasicAuthenticationStrategy();
export const httpClient = new HttpClient(basicAuthenticationStrategy.getAuthorizationHeader);

/** Provides the active in-memory credential to Community's fetch-based API facade. */
export function getCommunityAuthorizationHeader(): string | null {

  return basicAuthenticationStrategy.getAuthorizationHeader();

}

/**
 * Community's real authentication flow.
 *
 * The backend is stateless HTTP Basic. Community validates credentials through
 * its lightweight Community role read; it intentionally has no user-selectable
 * visual-preference API.
 */
export const authenticationService = {
  async authenticate(credentials: BasicCredentials): Promise<void> {
    basicAuthenticationStrategy.setCredentials(credentials);

    try {
      await httpClient.request('/api/secured/user/rolelist');
    } catch (error) {
      basicAuthenticationStrategy.clear();
      throw error;
    }
  },
  logout(): void {
    basicAuthenticationStrategy.clear();
  },
  isAuthenticated(): boolean {
    return basicAuthenticationStrategy.isAuthenticated();
  },
  getUsername(): string | null {
    return basicAuthenticationStrategy.getUsername();
  },
};
