import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspaceFile = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('pivot tables stay contained in the visible dashboard width', () => {
  const dashboardLayout = workspaceFile('../packages/front-shell/src/OpsFactorDashboardPageLayout.vue');
  const sectionCard = workspaceFile('../packages/front-shell/src/OfxSectionCard.vue');
  const perspectiveStyles = workspaceFile('../src/styles/perspective-overrides.css');

  assert.match(dashboardLayout, /min-w-0/);
  assert.match(sectionCard, /ofx-section-card flex h-full min-h-0 min-w-0/);
  assert.match(sectionCard, /ofx-section-card__body flex min-h-0 min-w-0/);
  assert.match(perspectiveStyles, /\.ofx-perspective-native \{[\s\S]*min-width: 0;[\s\S]*max-width: 100%;/);
  assert.match(perspectiveStyles, /\.ofx-perspective-host \{[\s\S]*width: 100%;[\s\S]*min-width: 0;[\s\S]*max-width: 100%;/);
  assert.match(perspectiveStyles, /\.ofx-perspective-viewer \{[\s\S]*min-width: 0;[\s\S]*max-width: 100%;/);
});

test('pivot scrolling reapplies presentation only and never redraws the virtual viewport', () => {
  const adapter = workspaceFile('../packages/front-perspective/src/PerspectivePivotAdapter.vue');
  const scrollHandlerStart = adapter.indexOf('datagridScrollHandler = () => {');
  const scrollHandlerEnd = adapter.indexOf('};', scrollHandlerStart);

  assert.ok(scrollHandlerStart >= 0, 'the virtualized datagrid must have a scroll handler');
  assert.ok(scrollHandlerEnd > scrollHandlerStart, 'the scroll handler must be complete');

  const scrollHandler = adapter.slice(scrollHandlerStart, scrollHandlerEnd);
  assert.match(scrollHandler, /queueRenderedTemporalHeaderLabelsPolicy\(\)/);
  assert.doesNotMatch(scrollHandler, /\.draw\(/);
  assert.match(adapter, /datagridScrollElement = regularTableElement/);
  assert.match(adapter, /addEventListener\('regular-table-scroll', datagridScrollHandler\)/);
  assert.doesNotMatch(adapter, /addEventListener\('scroll', datagridScrollHandler\)/);

  const viewerShadowObserverStart = adapter.indexOf('viewerShadowObserver = new MutationObserver(() => {');
  const viewerShadowObserverEnd = adapter.indexOf('});', viewerShadowObserverStart);
  const viewerShadowObserver = adapter.slice(viewerShadowObserverStart, viewerShadowObserverEnd);
  assert.ok(viewerShadowObserverStart >= 0, 'the viewer shadow root must be observed after mounting');
  assert.match(viewerShadowObserver, /queuePolicySync\(\)/);
  assert.doesNotMatch(adapter, /viewerShadowObserver\.observe\(viewerRoot, \{[\s\S]*subtree: true/);
});

test('pivot measures natural columns before preserving their responsive layout', () => {
  const adapter = workspaceFile('../packages/front-perspective/src/PerspectivePivotAdapter.vue');

  assert.doesNotMatch(adapter, /function queueViewportDraw\(\)/);
  assert.match(adapter, /function ensureRegularTableScrollbarStyle/);
  assert.match(adapter, /::-webkit-scrollbar/);
  assert.match(adapter, /Perspective viewer custom element was not registered/);
  assert.match(adapter, /Perspective datagrid plugin was not registered/);
  assert.match(adapter, /let naturalColumnMeasurementPassesRemaining = 0/);
  assert.match(adapter, /naturalColumnMeasurementPassesRemaining = 3/);
  assert.match(adapter, /const shouldMeasureNaturalColumns = naturalColumnMeasurementPassesRemaining > 0/);
  assert.match(adapter, /if \(shouldMeasureNaturalColumns\) \{[\s\S]*preserve_width: false/);
  assert.match(adapter, /lastMeasuredHostWidth = 0/);
  assert.doesNotMatch(adapter, /function recoverViewportSizing\(/);
  assert.doesNotMatch(adapter, /await datagrid\.update\(view\)/);
  assert.doesNotMatch(adapter, /style\.minWidth\s*=\s*getTemporalHeaderMinimumWidth/);
});
