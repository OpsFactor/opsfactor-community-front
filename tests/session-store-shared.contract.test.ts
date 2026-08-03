import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const communityRoot = new URL('../', import.meta.url);
const enterpriseRoot = new URL('../../opsfactor-enterprise-front/', import.meta.url);

function readSource(root: URL, relativePath: string) {

  return readFileSync(new URL(relativePath, root), 'utf8');

}

test('Community owns the Pinia session lifecycle while editions retain only authentication and appearance hooks', () => {

  const sharedStore = readSource(communityRoot, 'packages/front-core/src/stores/session.store.ts');
  const communityAdapter = readSource(communityRoot, 'src/stores/app/session.store.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/stores/app/session.store.ts');

  assert.match(sharedStore, /export function createFrontendSessionStore/);
  assert.match(sharedStore, /await dependencies\.fetchSessionBootstrap\(\)/);
  assert.match(sharedStore, /await dependencies\.afterAuthenticated\?\.\(\)/);
  assert.match(sharedStore, /await dependencies\.logoutSession\(\)/);
  assert.doesNotMatch(sharedStore, /@\/services|visual-theme-mode|loadRemotePreference/);

  assert.match(communityAdapter, /createFrontendSessionStore.*@opsfactor\/front-core/);
  assert.match(communityAdapter, /retainCommunityTheme/);
  assert.match(communityAdapter, /fetchSessionBootstrap,/);
  assert.match(communityAdapter, /logoutSession,/);
  assert.doesNotMatch(communityAdapter, /defineStore\(/);

  assert.match(enterpriseAdapter, /createFrontendSessionStore.*@opsfactor\/front-core/);
  assert.match(enterpriseAdapter, /loadEnterpriseThemePreference/);
  assert.match(enterpriseAdapter, /fetchSessionBootstrap,/);
  assert.match(enterpriseAdapter, /logoutSession,/);
  assert.doesNotMatch(enterpriseAdapter, /defineStore\(/);
});

test('Community owns the authenticated-route decision while hosts inject session and login naming policy', () => {

  const sharedGuard = readSource(communityRoot, 'packages/front-core/src/router/auth.guard.ts');
  const communityAdapter = readSource(communityRoot, 'src/app/guards/auth.guard.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/app/guards/auth.guard.ts');

  assert.match(sharedGuard, /export function createFrontendAuthGuard/);
  assert.match(sharedGuard, /redirect: to\.fullPath/);
  assert.match(sharedGuard, /to\.meta\.requiresAuth === false/);
  assert.doesNotMatch(sharedGuard, /@\/stores|ROUTE_NAMES/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /createFrontendAuthGuard.*@opsfactor\/front-core/);
    assert.match(adapter, /getSession: useSessionStore/);
    assert.match(adapter, /loginRouteName: ROUTE_NAMES\.login/);
    assert.doesNotMatch(adapter, /function authGuard/);
  }

});

test('Community owns public asset-path resolution while both hosts retain compatibility paths', () => {

  const sharedPathResolver = readSource(communityRoot, 'packages/front-core/src/runtime/public-path.ts');
  const communityAdapter = readSource(communityRoot, 'src/app/runtime/public-path.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/app/runtime/public-path.ts');

  assert.match(sharedPathResolver, /buildAppAssetPath\(relativePath: string, baseUrl: string\)/);
  assert.match(sharedPathResolver, /relativePath\.replace\(/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /buildAppAssetPath.*@opsfactor\/front-core/);
    assert.match(adapter, /buildCommunityAssetPath\(relativePath, import\.meta\.env\.BASE_URL\)/);
  }

});

test('Community owns the shared legacy route names while hosts retain their route import path', () => {

  const sharedRouteNames = readSource(communityRoot, 'packages/front-core/src/router/route-names.ts');
  const communityAdapter = readSource(communityRoot, 'src/router/route-names.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/router/route-names.ts');

  assert.match(sharedRouteNames, /export const FRONTEND_ROUTE_NAMES/);
  assert.match(sharedRouteNames, /login: 'login'/);
  assert.match(sharedRouteNames, /dataDownloadUpload: 'data-download-upload'/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /FRONTEND_ROUTE_NAMES as ROUTE_NAMES.*@opsfactor\/front-core/);
    assert.doesNotMatch(adapter, /dataDownloadUpload: 'data-download-upload'/);
  }

});

test('Community owns the edition-neutral Pinia navigation state while hosts retain compatibility exports', () => {

  const sharedStore = readSource(communityRoot, 'packages/front-core/src/stores/navigation.store.ts');
  const communityAdapter = readSource(communityRoot, 'src/stores/app/navigation.store.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/stores/app/navigation.store.ts');

  assert.match(sharedStore, /export const useFrontendNavigationStore = defineStore\('navigation'/);
  assert.match(sharedStore, /setFromRoute\(route: RouteLocationNormalizedLoaded\)/);
  assert.match(sharedStore, /setImmersiveWorkspace\(value: boolean\)/);
  assert.match(communityAdapter, /useFrontendNavigationStore as useNavigationStore.*@opsfactor\/front-core/);
  assert.match(enterpriseAdapter, /useFrontendNavigationStore as useNavigationStore.*@opsfactor\/front-core/);
  assert.doesNotMatch(communityAdapter, /defineStore\(/);
  assert.doesNotMatch(enterpriseAdapter, /defineStore\(/);
});

test('Community owns the edition-neutral notification queue while hosts retain compatibility exports', () => {

  const sharedStore = readSource(communityRoot, 'packages/front-core/src/stores/notifications.store.ts');
  const communityAdapter = readSource(communityRoot, 'src/stores/app/notifications.store.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/stores/app/notifications.store.ts');

  assert.match(sharedStore, /export const useFrontendNotificationsStore = defineStore\('notifications'/);
  assert.match(sharedStore, /push\(notification: Omit<FrontendNotification, 'id'>\)/);
  assert.match(sharedStore, /dismiss\(id: string\)/);
  assert.match(communityAdapter, /useFrontendNotificationsStore as useNotificationsStore.*@opsfactor\/front-core/);
  assert.match(enterpriseAdapter, /useFrontendNotificationsStore as useNotificationsStore.*@opsfactor\/front-core/);
  assert.doesNotMatch(communityAdapter, /defineStore\(/);
  assert.doesNotMatch(enterpriseAdapter, /defineStore\(/);
});

test('Community owns non-theme interface preferences while visual policy remains edition-specific', () => {

  const sharedStore = readSource(communityRoot, 'packages/front-core/src/stores/preferences.store.ts');
  const communityAdapter = readSource(communityRoot, 'src/stores/app/preferences.store.ts');
  const enterpriseAdapter = readSource(enterpriseRoot, 'src/stores/app/preferences.store.ts');

  assert.match(sharedStore, /useFrontendPreferencesStore = defineStore\('preferences'/);
  assert.match(sharedStore, /denseTables: false/);
  assert.match(sharedStore, /reducedMotion: false/);
  assert.doesNotMatch(sharedStore, /useThemeStore|data-theme|setPreference|loadRemotePreference/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /useFrontendPreferencesStore as usePreferencesStore.*@opsfactor\/front-core/);
    assert.doesNotMatch(adapter, /defineStore\(/);
  }
});
