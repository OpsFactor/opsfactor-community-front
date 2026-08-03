import { authenticationService } from '@/services/community-authentication.service';

export interface SessionBootstrapResponse {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string;
    email: string;
  };
}

/**
 * Community authentication is stateless HTTP Basic. Credentials live only in
 * the active tab's memory and are never translated into a form-login cookie.
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

/** Clears only browser-memory Basic credentials; no Community session cookie exists. */
export function logoutSession(): void {

  authenticationService.logout();

}
