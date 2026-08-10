import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

function assertBefore(source: string, earlierFragment: string, laterFragment: string): void {

  const earlierPosition = source.indexOf(earlierFragment);
  const laterPosition = source.indexOf(laterFragment);
  assert.notEqual(earlierPosition, -1, `Expected bootstrap fragment: ${earlierFragment}`);
  assert.notEqual(laterPosition, -1, `Expected bootstrap fragment: ${laterFragment}`);
  assert.ok(
    earlierPosition < laterPosition,
    `Expected "${earlierFragment}" before "${laterFragment}".`,
  );

}

test('Community bootstrap fixes the theme and validates the Community runtime before resolving the route and mounting the SPA', () => {

  const hostSource = readSource('../src/app/main.ts');
  const viteSource = readSource('../vite.config.ts');
  const perspectiveViteSource = readSource('../packages/front-perspective/vite.config.ts');
  const sharedBootstrapSource = readSource('../packages/front-core/src/runtime/frontend-bootstrap.ts');

  assert.match(hostSource, /bootstrapFrontendApplication.*bootstrapRuntimeInfo.*renderBootstrapFailure.*@opsfactor\/front-core/);
  assert.match(hostSource, /bootstrapTheme,/);
  assert.match(hostSource, /bootstrapRuntimeInfo: \(\) => bootstrapRuntimeInfo\(APPLICATION_EDITION\)/);
  assert.match(hostSource, /ensurePerspectiveViewerRuntime: async \(\) => undefined,/);
  assert.match(hostSource, /bootstrapFrontendApplication\(\{[\s\S]*renderBootstrapFailure\(error, APPLICATION_EDITION\)/);
  assert.doesNotMatch(hostSource, /function renderBootstrapFailure/);
  assert.match(viteSource, /isCustomElement: \(tag\) => tag === 'perspective-viewer'/);
  assert.match(perspectiveViteSource, /isCustomElement: \(tag\) => tag === 'perspective-viewer'/);

  assertBefore(sharedBootstrapSource, 'dependencies.bootstrapTheme();', 'await dependencies.bootstrapRuntimeInfo();');
  assertBefore(sharedBootstrapSource, 'await dependencies.bootstrapRuntimeInfo();', 'await dependencies.ensurePerspectiveViewerRuntime();');
  assertBefore(sharedBootstrapSource, 'await dependencies.bootstrapRuntimeInfo();', 'await router.isReady();');
  assertBefore(sharedBootstrapSource, 'await router.isReady();', "application.mount(dependencies.mountSelector ?? '#app');");

});

test('Community and Enterprise share a readable bootstrap failure boundary from the Community core', () => {

  const source = readSource('../packages/front-core/src/runtime/render-bootstrap-failure.ts');

  assert.match(source, /Unable to validate the selected backend/);
  assert.match(source, /The application stopped before sign in/);
  assert.match(source, /applicationRoot\.replaceChildren\(frame\)/);

});

test('Community login remains an anonymous route in the executable router', () => {

  const source = readSource('../src/router/modules/auth.routes.ts');

  assert.match(
    source,
    /path: '\/login'/,
  );
  assert.match(source, /requiresAuth: false/);

});

test('Community root delegates rendering to the executable router and notification surface', () => {

  const source = readSource('../src/app/App.vue');

  assert.match(source, /<RouterView \/>/);
  assert.match(source, /<OfxNotificationCenter \/>/);

});
