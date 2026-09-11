/**
 * Creates the standard authenticated-route guard used by both editions.
 *
 * A host supplies its session store and route naming policy, while the redirect
 * semantics remain one Community-owned implementation.
 */
export function createFrontendAuthGuard(dependencies) {
    return function frontendAuthGuard(to, _from, next) {
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
            if (dependencies.redirectToLogin) {
                next(false);
                dependencies.redirectToLogin(to.fullPath);
                return;
            }
            next({
                name: dependencies.loginRouteName,
                query: {
                    redirect: to.fullPath,
                },
            });
            return;
        }
        const requiredRole = typeof to.meta.requiredRole === 'string'
            ? to.meta.requiredRole
            : undefined;
        if (!sessionStore.hasRole(requiredRole)) {
            next({ path: '/' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.guard.js.map