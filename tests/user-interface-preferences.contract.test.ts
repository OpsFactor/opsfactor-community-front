import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Community fixes its appearance to light and has no visual-preference client surface', () => {

  const themeStoreSource = readFileSync(new URL('../src/stores/app/theme.store.ts', import.meta.url), 'utf8');
  const executableLoginSource = readFileSync(new URL('../src/modules/auth/pages/LoginPage.vue', import.meta.url), 'utf8');
  const homeSource = readFileSync(new URL('../src/app/pages/HomePage.vue', import.meta.url), 'utf8');
  const authenticationSource = readFileSync(new URL('../src/services/community-authentication.service.ts', import.meta.url), 'utf8');

  assert.match(themeStoreSource, /const COMMUNITY_THEME_MODE: ThemeMode = 'light'/);
  assert.match(themeStoreSource, /dataset\.theme = COMMUNITY_THEME_MODE/);
  assert.match(themeStoreSource, /colorScheme = COMMUNITY_THEME_MODE/);
  assert.match(executableLoginSource, /brand\/opsfactor-horizontal-on-light\.svg/);
  assert.match(executableLoginSource, /rgb\(239_246_255\)/);
  assert.doesNotMatch(executableLoginSource, /useThemeStore|isLightTheme|opsfactor-light\.png|opsfactor-dark\.png|text-white/);
  assert.doesNotMatch(homeSource, /toggleTheme|Use .* theme|User settings/);
  assert.match(authenticationSource, /\/api\/secured\/user\/rolelist/);
  assert.doesNotMatch(authenticationSource, /userconfigs|user-interface|interface\/preferences/);

});
