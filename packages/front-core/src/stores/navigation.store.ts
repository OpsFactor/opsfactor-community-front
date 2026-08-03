import { defineStore } from 'pinia';
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
export const useFrontendNavigationStore = defineStore('navigation', {
  state: (): FrontendNavigationState => ({
    currentModuleKey: null,
    sidebarCollapsed: false,
    immersiveWorkspace: false,
  }),
  actions: {
    /** Synchronizes the selected module with host-provided route metadata. */
    setFromRoute(route: RouteLocationNormalizedLoaded) {

      this.currentModuleKey = typeof route.meta.moduleKey === 'string'
        ? route.meta.moduleKey
        : null;

    },
    /** Toggles the shared legacy navigation rail. */
    toggleSidebar() {

      this.sidebarCollapsed = !this.sidebarCollapsed;

    },
    /** Lets an edition route request the shared distraction-free workspace. */
    setImmersiveWorkspace(value: boolean) {

      this.immersiveWorkspace = value;

    },
  },
});
