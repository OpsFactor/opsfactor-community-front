import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Community Vite development proxy loads its isolated target from the local environment file', () => {

  const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const localEnvironmentExample = readFileSync(
    new URL('../.env.development.local.example', import.meta.url),
    'utf8',
  );
  const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');

  assert.match(source, /import \{ defineConfig, loadEnv \} from 'vite'/);
  assert.match(source, /const environment = loadEnv\(mode, process\.cwd\(\), ''\)/);
  assert.match(source, /command === 'serve' \? getRequiredApiProxyTarget\(environment\) : undefined/);
  assert.match(source, /server: apiProxyTarget === undefined \? undefined : \{/);
  assert.match(source, /proxy:\s*\{\s*'\/api': apiProxyTarget,\s*'\/login': apiProxyTarget,\s*'\/logout': apiProxyTarget,\s*\}/s);
  assert.match(source, /const rawTarget = environment\.VITE_API_PROXY_TARGET/);
  assert.match(source, /base: environment\.VITE_PUBLIC_BASE \|\| '\/app\/'/);
  assert.match(source, /VITE_API_PROXY_TARGET is required when starting the Community development server/);
  assert.match(source, /new URL\(rawTarget\)/);
  assert.match(source, /VITE_API_PROXY_TARGET must be an HTTP\(S\) URL/);
  assert.match(localEnvironmentExample, /^VITE_API_PROXY_TARGET=http:\/\/127\.0\.0\.1:5010$/m);
  assert.match(localEnvironmentExample, /^VITE_PUBLIC_BASE=\/app\/$/m);
  assert.match(gitignore, /^!\.env\.development\.local\.example$/m);
  assert.doesNotMatch(source, /localhost:5000/);
  assert.doesNotMatch(source, /process\.env\.VITE_API_PROXY_TARGET/);
  assert.doesNotMatch(source, /VITE_API_PROXY_TARGET \?\?/);
  assert.doesNotMatch(source, /server:\s*\{/);

});
