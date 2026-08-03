import { createFrontendSessionStore } from '@opsfactor/front-core';
import { fetchSessionBootstrap, logoutSession } from '@/services/auth/auth.service';
import { useThemeStore } from '@/stores/app/theme.store';

export type { FrontendSessionUser as SessionUser } from '@opsfactor/front-core';

/** Keeps Community appearance fixed after its Basic credential is validated. */
async function retainCommunityTheme() {

  const themeStore = useThemeStore();

  try {
    await themeStore.loadRemotePreference();
  } catch (error) {
    console.warn('Unable to load user interface preferences; keeping local theme.', error);
  }

}

/** Resets only local light-mode state after clearing in-memory Basic credentials. */
function resetCommunityTheme() {

  useThemeStore().resetRemotePreferenceState();

}

export const useSessionStore = createFrontendSessionStore({
  fetchSessionBootstrap,
  logoutSession,
  afterAuthenticated: retainCommunityTheme,
  afterLogout: resetCommunityTheme,
});
