import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {

  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');

}

test('Runtime bootstrap uses the shared store and a credential-free public client', () => {

  const source = readSource('../src/runtime/bootstrap-runtime-info.ts');

  assert.match(source, /useRuntimeInfoStore\(\)/);
  assert.match(source, /runtimeInfoStore\.load\([\s\S]*new HttpClient\(\(\) => null\)/);
  assert.match(source, /runtimeInfo\.edition !== expectedEdition/);

});

test('Runtime bootstrap rejects an incompatible backend with both editions in the error', () => {

  const source = readSource('../src/runtime/bootstrap-runtime-info.ts');

  assert.match(source, /requires a \$\{expectedEdition\} backend, but received \$\{runtimeInfo\.edition\}/);

});

test('Runtime bootstrap aborts a public edition probe that does not respond', () => {

  const bootstrapSource = readSource('../src/runtime/bootstrap-runtime-info.ts');
  const storeSource = readSource('../src/stores/runtime-info.store.ts');
  const serviceSource = readSource('../src/runtime/runtime-info.service.ts');

  assert.match(bootstrapSource, /const RUNTIME_INFO_TIMEOUT_MILLISECONDS = 10_000/);
  assert.match(bootstrapSource, /const bootstrapAbortController = new AbortController\(\)/);
  assert.match(bootstrapSource, /bootstrapAbortController\.abort\(\)/);
  assert.match(bootstrapSource, /runtimeInfoStore\.load\([\s\S]*bootstrapAbortController\.signal/);
  assert.match(bootstrapSource, /clearTimeout\(bootstrapTimeout\)/);
  assert.match(storeSource, /async load\(httpClient: HttpClient, signal\?: AbortSignal\)/);
  assert.match(serviceSource, /request<RuntimeInfo>\('\/api\/open\/runtime-info', \{ signal \}\)/);

});
