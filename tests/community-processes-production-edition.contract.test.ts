import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const policy = readFileSync(new URL('../packages/front-shell/src/edition-navigation-policy.ts', import.meta.url), 'utf8');
const communityNavigation = readFileSync(new URL('../src/app/navigation.config.ts', import.meta.url), 'utf8');

test('Community exposes Process Execution and Production Overview while reserving sequencing for Enterprise', () => {

  assert.doesNotMatch(policy, /'process-execution'/);
  assert.doesNotMatch(policy, /'production-production-overview'/);
  assert.match(policy, /'production-line-scheduling'/);

  assert.match(
    communityNavigation,
    /'process-execution': \(\) => import\('\@\/modules\/processes\/pages\/ProcessExecutionPage\.vue'\)/,
  );
  assert.match(
    communityNavigation,
    /'production-production-overview': \(\) => import\('\@\/modules\/production-overview\/ProductionOverviewPage\.vue'\)/,
  );
  assert.doesNotMatch(communityNavigation, /'production-line-scheduling':/);

});
