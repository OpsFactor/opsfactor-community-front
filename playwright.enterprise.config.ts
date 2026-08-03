import { defineConfig } from '@playwright/test';

/**
 * Requires a deliberately selected Enterprise SPA.  The smoke uses a fully
 * intercepted browser backend because the workspace has no Enterprise runtime
 * running locally; it must never fall back to the legacy server by port.
 */
function getRequiredEnterpriseFrontUrl(): string {

  const rawUrl = process.env.PLAYWRIGHT_ENTERPRISE_FRONT_URL;
  if (rawUrl === undefined || rawUrl.trim().length === 0) {
    throw new Error('PLAYWRIGHT_ENTERPRISE_FRONT_URL is required and must end with /app/.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('PLAYWRIGHT_ENTERPRISE_FRONT_URL must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.pathname.endsWith('/app/')) {
    throw new Error('PLAYWRIGHT_ENTERPRISE_FRONT_URL must be an HTTP(S) URL ending with /app/.');
  }

  return parsedUrl.toString();

}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'enterprise-appearance-smoke.spec.ts',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: getRequiredEnterpriseFrontUrl(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
