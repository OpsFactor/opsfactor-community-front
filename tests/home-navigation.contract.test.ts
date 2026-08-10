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
const editionAvailabilityMarkSource = readFileSync(
  new URL('../packages/front-shell/src/OfxEditionAvailabilityMark.vue', import.meta.url),
  'utf8',
);
const topbarSearchSource = readFileSync(
  new URL('../packages/front-shell/src/OpsFactorTopbarSearch.vue', import.meta.url),
  'utf8',
);
const topbarSource = readFileSync(
  new URL('../packages/front-shell/src/OpsFactorLegacyTopbar.vue', import.meta.url),
  'utf8',
);
const appFrameSource = readFileSync(
  new URL('../packages/front-shell/src/OpsFactorLegacyAppFrame.vue', import.meta.url),
  'utf8',
);
const moduleWorkspaceSource = readFileSync(
  new URL('../packages/front-shell/src/OpsFactorModuleWorkspace.vue', import.meta.url),
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

test('Community keeps private workspaces discoverable while supplying approved Community loaders', () => {

  assert.match(sharedNavigationSource, /key: 'distribution'/);
  assert.match(sharedNavigationSource, /key: 'visibility'/);
  assert.match(sharedNavigationSource, /key: 'pricing'/);
  assert.match(sharedNavigationSource, /key: 'planning-agent'/);
  assert.doesNotMatch(navigationSource, /'distribution-deployment':/);
  assert.match(navigationSource, /'supply-network-explorer':/);
  assert.match(navigationSource, /'process-execution':/);
});

test('Community Home uses the same legacy workspace shape and distinguishes Pro / Enterprise from Enterprise-only', () => {

  assert.match(homeSource, /OpsFactorWorkspaceHome/);
  assert.match(homeSource, /APP_MODULES/);
  assert.match(sharedHomeSource, /availableInCurrentRuntime === false/);
  assert.match(sharedHomeSource, /unavailableEditionLabel\(module\.key\)/);
  assert.doesNotMatch(sharedHomeSource, /Use light theme/);
});

test('Unavailable editions use a compact accessible edition mark with an explicit hover/focus tooltip', () => {

  assert.match(sharedHomeSource, /OfxEditionAvailabilityMark/);
  assert.match(editionAvailabilityMarkSource, /badgeText/);
  assert.match(editionAvailabilityMarkSource, /'ENT' : 'PRO'/);
  assert.match(editionAvailabilityMarkSource, /role="tooltip"/);
  assert.match(editionAvailabilityMarkSource, /v-if="tooltipVisible"/);
  assert.match(editionAvailabilityMarkSource, /@mouseenter="showTooltip"/);
  assert.match(editionAvailabilityMarkSource, /@focus="showTooltip"/);
  assert.match(editionAvailabilityMarkSource, /z-index: 2147483000/);
  assert.match(editionAvailabilityMarkSource, /<Teleport to="body">/);
  assert.match(editionAvailabilityMarkSource, /Available in PRO/);
  assert.match(editionAvailabilityMarkSource, /Available in ENTERPRISE/);

});

test('Global navigation avoids dead actions, irrelevant search matches and route scroll carry-over', () => {

  assert.match(topbarSource, /emit\('quickActions'\)/);
  assert.match(topbarSearchSource, /watch\(\(\) => props\.quickActionsRequest/);
  assert.match(topbarSearchSource, /if \(score > 0 && entry\.status === 'live'\) score \+= 4/);
  assert.match(appFrameSource, /watch\(\s*\(\) => props\.scrollKey/);
  assert.match(appFrameSource, /scrollTo\(\{ top: 0, left: 0 \}\)/);
});

test('Migration metadata remains searchable without being rendered as product copy', () => {

  assert.doesNotMatch(moduleWorkspaceSource, /Legacy path|Search keywords|statusClasses/);
  assert.doesNotMatch(topbarSearchSource, /entry\.keywords\.slice/);
  assert.doesNotMatch(topbarSearchSource, /\{\{ result\.status \}\}/);
});
