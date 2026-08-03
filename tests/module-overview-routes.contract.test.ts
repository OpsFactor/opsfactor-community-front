import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sharedNavigationSource = readFileSync(
  new URL('../packages/front-shell/src/legacy-navigation.ts', import.meta.url),
  'utf8',
);

test('The Community-owned catalog retains the legacy workspace order and route metadata', () => {

  const moduleKeys = [...sharedNavigationSource.matchAll(/^\s+key: '([^']+)',$/gm)]
    .map((match) => match[1])
    .filter((key) => ['demand-planning', 'supply-network', 'production', 'distribution', 'visibility', 'processes', 'pricing', 'planning-agent', 'data', 'configuration', 'admin'].includes(key));

  assert.deepEqual(moduleKeys, [
    'demand-planning', 'supply-network', 'production', 'distribution', 'visibility', 'processes',
    'pricing', 'planning-agent', 'data', 'configuration', 'admin',
  ]);
  assert.match(sharedNavigationSource, /path: '\/demand-planning'/);
  assert.match(sharedNavigationSource, /path: '\/supply-network'/);
  assert.match(sharedNavigationSource, /path: '\/production'/);
  assert.match(sharedNavigationSource, /path: '\/configuration'/);
  assert.match(sharedNavigationSource, /path: '\/admin'/);
});

test('Only the Community factory decides whether a legacy page becomes an executable route', () => {

  assert.match(sharedNavigationSource, /isEnterpriseNavigationItem\(edition, moduleKey, pageKey\)/);
  assert.match(sharedNavigationSource, /filter\(\(module\) => module\.availableInCurrentRuntime !== false\)/);
  assert.match(sharedNavigationSource, /filter\(\(page\) => page\.availableInCurrentRuntime !== false\)/);
});
