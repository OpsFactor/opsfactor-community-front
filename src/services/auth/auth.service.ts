import { authenticationService, httpClient } from '@/services/community-authentication.service';

export interface SessionBootstrapResponse {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface IdentityOptionsResponse {
  oidcEnabled: boolean;
}

/**
 * Restores the Community session from the active tab's in-memory HTTP Basic
 * credential.
 *
 * <p>The Community backend is deliberately stateless and exposes no session
 * introspection endpoint. A tab without a restored credential must therefore
 * reach the login route normally instead of probing a protected URL during
 * bootstrap.</p>
 */
export async function fetchSessionBootstrap(): Promise<SessionBootstrapResponse> {

  const username = authenticationService.getUsername();
  if (!authenticationService.isAuthenticated() || username === null) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user: {
      id: username,
      displayName: username,
      email: '',
    },
  };

}

/** Validates the in-memory HTTP Basic credential against a secured Community endpoint. */
export async function loginWithPassword(username: string, password: string): Promise<void> {

  await authenticationService.authenticate({ username, password });

}

/** Clears browser-memory Basic credentials and invalidates an OIDC session when present. */
export async function logoutSession(): Promise<void> {

  authenticationService.logout();
  await httpClient.request<void>('/logout', { method: 'POST' });

}

export async function fetchIdentityOptions(): Promise<IdentityOptionsResponse> {

  return httpClient.request<IdentityOptionsResponse>('/api/open/identity');

}

export function beginOpsFactorLogin(): void {

  window.location.assign('/oauth2/authorization/opsfactor');

}
