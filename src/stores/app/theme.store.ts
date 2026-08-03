import { defineStore } from 'pinia';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  preference: ThemeMode;
  availableThemeModes: ThemeMode[];
  isRemotePreferenceLoaded: boolean;
}

const COMMUNITY_THEME_MODE: ThemeMode = 'light';

/**
 * Community has one product-level appearance. The store stays available to
 * shared legacy views, but never reads or persists a user preference.
 */
export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: COMMUNITY_THEME_MODE,
    preference: COMMUNITY_THEME_MODE,
    availableThemeModes: [COMMUNITY_THEME_MODE],
    isRemotePreferenceLoaded: true,
  }),
  actions: {
    initialize() {
      this.preference = COMMUNITY_THEME_MODE;
      this.mode = COMMUNITY_THEME_MODE;
      this.apply();
    },

    async loadRemotePreference() {
      this.preference = COMMUNITY_THEME_MODE;
      this.mode = COMMUNITY_THEME_MODE;
      this.isRemotePreferenceLoaded = true;
      this.apply();
    },

    async setPreference(_preference: ThemeMode) {
      this.preference = COMMUNITY_THEME_MODE;
      this.mode = COMMUNITY_THEME_MODE;
      this.apply();
    },

    resetRemotePreferenceState() {
      this.preference = COMMUNITY_THEME_MODE;
      this.mode = COMMUNITY_THEME_MODE;
      this.availableThemeModes = [COMMUNITY_THEME_MODE];
      this.isRemotePreferenceLoaded = true;
      this.apply();
    },

    apply() {
      if (typeof document === 'undefined') {
        return;
      }

      document.documentElement.dataset.theme = COMMUNITY_THEME_MODE;
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = COMMUNITY_THEME_MODE;
    },
  },
});
