import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

/**
 * Minimal session state required by the edition-neutral route guard.
 *
 * Authentication transport and visual policies remain host concerns; the shared
 * guard only decides whether a route may be entered after bootstrap.
 */
export interface FrontendAuthSession {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
}

/** Defines the host-owned dependencies injected into the shared route guard. */
export interface FrontendAuthGuardDependencies {
  getSession: () => FrontendAuthSession;
  loginRouteName: string;
}

/**
 * Creates the standard authenticated-route guard used by both editions.
 *
 * A host supplies its session store and route naming policy, while the redirect
 * semantics remain one Community-owned implementation.
 */
export function createFrontendAuthGuard(dependencies: FrontendAuthGuardDependencies) {

  return function frontendAuthGuard(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) {

    const sessionStore = dependencies.getSession();

    if (to.meta.requiresAuth === false) {
      if (to.name === dependencies.loginRouteName && sessionStore.isAuthenticated) {
        next({ path: '/' });
        return;
      }

      next();
      return;
    }

    if (sessionStore.isBootstrapping) {
      next();
      return;
    }

    if (!sessionStore.isAuthenticated) {
      next({
        name: dependencies.loginRouteName,
        query: {
          redirect: to.fullPath,
        },
      });
      return;
    }

    next();
  };
}
