import { defineStore } from 'pinia';
/**
 * Creates the Community-owned Pinia session lifecycle.
 *
 * The store intentionally owns no request URL, credential or visual state;
 * hosts provide those policies and receive explicit authenticated/logout hooks.
 */
export function createFrontendSessionStore(dependencies) {
    return defineStore('session', {
        state: () => ({
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
                }
                finally {
                    this.isBootstrapping = false;
                }
            },
            async logout() {
                try {
                    await dependencies.logoutSession();
                }
                finally {
                    this.user = null;
                    this.isAuthenticated = false;
                    this.isBootstrapping = false;
                    dependencies.afterLogout?.();
                }
            },
        },
    });
}
//# sourceMappingURL=session.store.js.map