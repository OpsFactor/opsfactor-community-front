import { defineStore } from 'pinia';
/** Provides the common non-theme preference state used by both SPA editions. */
export const useFrontendPreferencesStore = defineStore('preferences', {
    state: () => ({
        denseTables: false,
        reducedMotion: false,
    }),
    actions: {
        setDenseTables(value) {
            this.denseTables = value;
        },
        setReducedMotion(value) {
            this.reducedMotion = value;
        },
    },
});
//# sourceMappingURL=preferences.store.js.map