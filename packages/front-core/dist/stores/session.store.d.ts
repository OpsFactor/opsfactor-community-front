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
export declare function createFrontendSessionStore(dependencies: FrontendSessionStoreDependencies): import("pinia").StoreDefinition<"session", FrontendSessionState, {}, {
    bootstrap(): Promise<void>;
    logout(): Promise<void>;
}>;
export {};
//# sourceMappingURL=session.store.d.ts.map