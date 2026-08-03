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

export default defineConfig(({ command, mode }) => {

  /*
   * Vite does not inject .env files into process.env while vite.config is
   * evaluated. Loading explicitly makes the checked-in local example useful
   * while still allowing a shell environment variable to override it.
   */
  const environment = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = command === 'serve' ? getRequiredApiProxyTarget(environment) : undefined;

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
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
