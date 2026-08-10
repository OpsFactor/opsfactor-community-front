import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

test('Community Process Execution exposes only backend-published synchronous planning jobs', () => {

  const page = readSource('../src/modules/processes/pages/ProcessExecutionPage.vue');
  const service = readSource('../src/modules/processes/services/process-execution.service.ts');
  const catalogLoader = service.match(/export async function fetchProcessExecutionCatalog[\s\S]*?\n}\n\nexport function executeDemandPlan/)?.[0] ?? '';

  assert.match(page, /new Set<JobId>\(\['execute-demand-plan', 'execute-supply-plan'\]\)/);
  assert.match(page, /jobs\.filter|\.filter\(\(job\) => communityJobIds\.has\(job\.id\)\)/);
  assert.match(page, /const demandModeOptions[\s\S]*Run statistical plan[\s\S]*?\];/);
  assert.doesNotMatch(page.match(/const demandModeOptions[\s\S]*?\];/)?.[0] ?? '', /trend|file/i);

  assert.match(catalogLoader, /planning\/demand\/demandplan/);
  assert.match(catalogLoader, /planning\/supply/);
  assert.match(catalogLoader, /supplynetwork\/version/);
  assert.match(catalogLoader, /demandplanexecutionprofile/);
  assert.match(catalogLoader, /supplyplanexecutionprofile/);
  assert.doesNotMatch(catalogLoader, /\/api\/secured\/(?:pricing|dataupload\/json\/(?:presetconstraintgroup|temporalsplitcurve|inventoryoptimizationmodel)|geographic)/);
});
