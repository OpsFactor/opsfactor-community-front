import { defineStore } from 'pinia';

/**
 * Edition-neutral local presentation preferences.
 *
 * Theme selection deliberately does not belong here: Community fixes its
 * appearance while Enterprise persists a user-level visual preference.
 */
interface FrontendPreferencesState {
  denseTables: boolean;
  reducedMotion: boolean;
}

/** Provides the common non-theme preference state used by both SPA editions. */
export const useFrontendPreferencesStore = defineStore('preferences', {
  state: (): FrontendPreferencesState => ({
    denseTables: false,
    reducedMotion: false,
  }),
  actions: {
    setDenseTables(value: boolean) {

      this.denseTables = value;

    },
    setReducedMotion(value: boolean) {

      this.reducedMotion = value;

    },
  },
});
