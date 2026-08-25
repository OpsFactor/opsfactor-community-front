import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

test('Process Execution reuses the application notification center for its scheduler feedback', () => {

  const page = readSource('../src/modules/processes/pages/ProcessExecutionPage.vue');
  const service = readSource('../src/modules/processes/services/process-execution.service.ts');

  assert.match(service, /ProcessExecutionOutcome = 'COMPLETED' \| 'ACCEPTED_FOR_BACKGROUND_PROCESSING'/);
  assert.match(service, /processExecutionOutcome\?: ProcessExecutionOutcome/);
  assert.match(page, /useNotificationsStore/);
  assert.match(page, /notifications\.push/);
  assert.match(page, /\$\{selectedJob\.value\.title\} submitted/);
  assert.doesNotMatch(page, /<OfxModalDialog/);

});
