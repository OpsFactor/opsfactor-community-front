import { defineStore } from 'pinia';

/** User identity displayed by the neutral shell after host authentication succeeds. */
export interface FrontendSessionUser {
  id: string;
  displayName: string;
  email: string;
}

/** Session shape returned by a host-specific authentication policy. */
export interface FrontendSessionBootstrapResponse {
  authenticated: boolean;
  user?: FrontendSessionUser;
}

/**
 * Host seams for authentication and post-session policy.
 *
 * Community may validate in-memory Basic credentials; Enterprise may restore a
 * form-login session. Appearance remains a callback so Community never gains
 * a persisted preference while Enterprise keeps its per-user setting.
 */
export interface FrontendSessionStoreDependencies {
  fetchSessionBootstrap: () => Promise<FrontendSessionBootstrapResponse>;
  logoutSession: () => void | Promise<void>;
  afterAuthenticated?: () => void | Promise<void>;
  afterLogout?: () => void;
}

interface FrontendSessionState {
  user: FrontendSessionUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
}

/**
 * Creates the Community-owned Pinia session lifecycle.
 *
 * The store intentionally owns no request URL, credential or visual state;
 * hosts provide those policies and receive explicit authenticated/logout hooks.
 */
export function createFrontendSessionStore(dependencies: FrontendSessionStoreDependencies) {

  return defineStore('session', {
    state: (): FrontendSessionState => ({
      user: null,
      isAuthenticated: false,
      isBootstrapping: true,
    }),
    actions: {
      async bootstrap() {

        this.isBootstrapping = true;

        try {
          const session = await dependencies.fetchSessionBootstrap();
          this.user = session.user ?? null;
          this.isAuthenticated = session.authenticated;

          if (session.authenticated) {
            await dependencies.afterAuthenticated?.();
          }
        } finally {
          this.isBootstrapping = false;
        }

      },
      async logout() {

        try {
          await dependencies.logoutSession();
        } finally {
          this.user = null;
          this.isAuthenticated = false;
          this.isBootstrapping = false;
          dependencies.afterLogout?.();
        }

      },
    },
  });

}
