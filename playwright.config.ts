import { defineConfig } from '@playwright/test';

/**
 * Requires an explicit isolated Community SPA URL instead of silently using a
 * developer's current Vite port, which could point to another application.
 */
function getRequiredCommunityFrontUrl(): string {

  const rawUrl = process.env.PLAYWRIGHT_COMMUNITY_FRONT_URL;
  if (rawUrl === undefined || rawUrl.trim().length === 0) {
    throw new Error('PLAYWRIGHT_COMMUNITY_FRONT_URL is required and must end with /app/.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('PLAYWRIGHT_COMMUNITY_FRONT_URL must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.pathname.endsWith('/app/')) {
    throw new Error('PLAYWRIGHT_COMMUNITY_FRONT_URL must be an HTTP(S) URL ending with /app/.');
  }

  return parsedUrl.toString();

}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'community-public-smoke.spec.ts',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: getRequiredCommunityFrontUrl(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
