import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Keeps a development SPA from silently attaching to whatever application
 * happens to occupy a conventional local port. Production builds do not use
 * the Vite proxy, so this requirement applies only to `vite` serve mode.
 */
function getRequiredApiProxyTarget(environment: Record<string, string>): string {

  const rawTarget = environment.VITE_API_PROXY_TARGET;
  if (rawTarget === undefined || rawTarget.trim().length === 0) {
    throw new Error('VITE_API_PROXY_TARGET is required when starting the Community development server.');
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(rawTarget);
  } catch {
    throw new Error('VITE_API_PROXY_TARGET must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    throw new Error('VITE_API_PROXY_TARGET must be an HTTP(S) URL.');
  }

  return parsedTarget.toString();

}

/**
 * Development must follow the shared package sources directly.  The published
 * package entries deliberately target dist/ for releases, but relying on them
 * while Vite serves would otherwise require a manual package rebuild after
 * every edit to the shared Community foundation.
 */
function getSharedPackageSourceAliases(command: string) {

  if (command !== 'serve') {
    return [];
  }

  return [
    // Keep the generated Tailwind stylesheet as the package's public style entry.
    { find: '@opsfactor/front-shell/styles.css', replacement: fileURLToPath(new URL('./packages/front-shell/dist/index.css', import.meta.url)) },
    { find: '@opsfactor/front-core', replacement: fileURLToPath(new URL('./packages/front-core/src', import.meta.url)) },
    { find: '@opsfactor/front-plan-history', replacement: fileURLToPath(new URL('./packages/front-plan-history/src', import.meta.url)) },
    { find: '@opsfactor/front-planning-book', replacement: fileURLToPath(new URL('./packages/front-planning-book/src', import.meta.url)) },
    { find: '@opsfactor/front-processes', replacement: fileURLToPath(new URL('./packages/front-processes/src', import.meta.url)) },
    { find: '@opsfactor/front-perspective', replacement: fileURLToPath(new URL('./packages/front-perspective/src', import.meta.url)) },
    { find: '@opsfactor/front-shell', replacement: fileURLToPath(new URL('./packages/front-shell/src', import.meta.url)) },
  ];

}

export default defineConfig(({ command, mode }) => {

  /*
   * Vite does not inject .env files into process.env while vite.config is
   * evaluated. Loading explicitly makes the checked-in local example useful
   * while still allowing a shell environment variable to override it.
   */
  const environment = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = command === 'serve' ? getRequiredApiProxyTarget(environment) : undefined;

  return {
    plugins: [vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'perspective-viewer',
        },
      },
    })],
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        ...getSharedPackageSourceAliases(command),
      ],
      // The edition foundation is linked as a local package. Without
      // deduplication Rollup may retain one Vue / Vue Router runtime for the
      // foundation and another for the Community application. Router
      // injections then appear undefined inside routed pages in the packaged
      // build, although the router itself has been installed on the app.
      dedupe: ['vue', 'vue-router', 'pinia'],
    },
    base: environment.VITE_PUBLIC_BASE || '/app/',
    server: apiProxyTarget === undefined ? undefined : {
      proxy: {
        '/api': apiProxyTarget,
        '/login': apiProxyTarget,
        '/logout': apiProxyTarget,
      },
    },
  };

});
