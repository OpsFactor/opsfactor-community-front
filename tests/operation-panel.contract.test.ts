import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('operation choices retain their labels and expose the active operation description', () => {
  const panel = readFileSync(new URL('../packages/front-shell/src/OfxOperationPanel.vue', import.meta.url), 'utf8');

  assert.match(panel, /operation\.description/);
  assert.match(panel, /selectedOperation\?\.description/);
});
