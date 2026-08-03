import { defineStore } from 'pinia';
/** Provides the single Pinia shell-navigation store consumed by both editions. */
export const useFrontendNavigationStore = defineStore('navigation', {
    state: () => ({
        currentModuleKey: null,
        sidebarCollapsed: false,
        immersiveWorkspace: false,
    }),
    actions: {
        /** Synchronizes the selected module with host-provided route metadata. */
        setFromRoute(route) {
            this.currentModuleKey = typeof route.meta.moduleKey === 'string'
                ? route.meta.moduleKey
                : null;
        },
        /** Toggles the shared legacy navigation rail. */
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
        },
        /** Lets an edition route request the shared distraction-free workspace. */
        setImmersiveWorkspace(value) {
            this.immersiveWorkspace = value;
        },
    },
});
//# sourceMappingURL=navigation.store.js.map