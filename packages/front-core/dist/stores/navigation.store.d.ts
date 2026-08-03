import type { RouteLocationNormalizedLoaded } from 'vue-router';
/**
 * Edition-neutral shell navigation state.
 *
 * Route catalogs remain owned by the host applications; the Community core
 * only stores the selected module and shell presentation state shared by both
 * products.
 */
export interface FrontendNavigationState {
    currentModuleKey: string | null;
    sidebarCollapsed: boolean;
    immersiveWorkspace: boolean;
}
/** Provides the single Pinia shell-navigation store consumed by both editions. */
export declare const useFrontendNavigationStore: import("pinia").StoreDefinition<"navigation", FrontendNavigationState, {}, {
    /** Synchronizes the selected module with host-provided route metadata. */
    setFromRoute(route: RouteLocationNormalizedLoaded): void;
    /** Toggles the shared legacy navigation rail. */
    toggleSidebar(): void;
    /** Lets an edition route request the shared distraction-free workspace. */
    setImmersiveWorkspace(value: boolean): void;
}>;
//# sourceMappingURL=navigation.store.d.ts.map