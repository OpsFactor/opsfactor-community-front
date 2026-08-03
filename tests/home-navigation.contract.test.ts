import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navigationSource = readFileSync(new URL('../src/app/navigation.config.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/app/pages/HomePage.vue', import.meta.url), 'utf8');
const sharedNavigationSource = readFileSync(
  new URL('../packages/front-shell/src/legacy-navigation.ts', import.meta.url),
  'utf8',
);
const sharedHomeSource = readFileSync(
  new URL('../packages/front-shell/src/OpsFactorWorkspaceHome.vue', import.meta.url),
  'utf8',
);

test('Community delegates its executable navigation to the Community-owned legacy catalog', () => {

  assert.match(navigationSource, /createLegacyNavigation/);
  assert.match(navigationSource, /edition: APPLICATION_EDITION/);
  assert.doesNotMatch(navigationSource, /const legacyNavigationModules:/);
  assert.match(sharedNavigationSource, /key: 'demand-sales-demand-overview'/);
  assert.match(sharedNavigationSource, /path: '\/demand-planning\/sales-demand-overview'/);
  assert.match(sharedNavigationSource, /filter\(\(page\) => page\.availableInCurrentRuntime !== false\)/);
});

test('Community keeps Enterprise workspaces discoverable without supplying their executable loaders', () => {

  assert.match(sharedNavigationSource, /key: 'distribution'/);
  assert.match(sharedNavigationSource, /key: 'visibility'/);
  assert.match(sharedNavigationSource, /key: 'pricing'/);
  assert.match(sharedNavigationSource, /key: 'planning-agent'/);
  assert.doesNotMatch(navigationSource, /'distribution-deployment':/);
  assert.doesNotMatch(navigationSource, /'supply-network-explorer':/);
  assert.doesNotMatch(navigationSource, /'process-execution':/);
});

test('Community Home uses the same legacy workspace shape and renders blocked entries as Enterprise', () => {

  assert.match(homeSource, /OpsFactorWorkspaceHome/);
  assert.match(homeSource, /APP_MODULES/);
  assert.match(sharedHomeSource, /availableInCurrentRuntime === false/);
  assert.match(sharedHomeSource, />Enterprise<\/span>/);
  assert.doesNotMatch(sharedHomeSource, /Use light theme/);
});
