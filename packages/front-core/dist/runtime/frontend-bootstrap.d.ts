import { type App, type Component } from 'vue';
import type { Pinia } from 'pinia';
import type { RouteRecordName, Router } from 'vue-router';
/** Session state required by the edition-neutral redirect decision. */
export interface FrontendBootstrapSession {
    isAuthenticated: boolean;
}
/**
 * Host-owned collaborators used to bootstrap the common Vue application flow.
 * Authentication, theme and backend runtime validation remain injected because
 * they are intentionally different between Community and Enterprise.
 */
export interface FrontendBootstrapDependencies {
    rootComponent: Component;
    createPinia: () => Pinia;
    createRouter: () => Router;
    installPrimeVue: (application: App) => void;
    bootstrapTheme: () => void;
    bootstrapRuntimeInfo: () => Promise<unknown>;
    ensurePerspectiveViewerRuntime: () => Promise<void>;
    bootstrapSession: () => Promise<void>;
    getSession: () => FrontendBootstrapSession;
    loginRouteName: RouteRecordName;
    mountSelector?: string;
}
/**
 * Performs the invariant SPA startup sequence shared by both product editions.
 *
 * The host supplies edition policy at the narrow seams above; this function
 * deliberately owns only Vue composition, runtime ordering and login-route
 * redirection so Enterprise extends Community instead of copying its launcher.
 */
export declare function bootstrapFrontendApplication(dependencies: FrontendBootstrapDependencies): Promise<void>;
//# sourceMappingURL=frontend-bootstrap.d.ts.map