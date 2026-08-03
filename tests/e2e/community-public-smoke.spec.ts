import { expect, test } from '@playwright/test';

interface CommunityRuntimeInfo {
  edition: string;
}

interface CommunityHealth {
  status: string;
}

interface ObservedBrowserApiRequest {
  method: string;
  pathname: string;
}

/**
 * Reads the isolated backend URL explicitly. There is no fallback because this
 * smoke must never discover a Community runtime through an implicit local port.
 */
function getRequiredCommunityBackendUrl(): string {

  const rawUrl = process.env.PLAYWRIGHT_COMMUNITY_BACKEND_URL;
  if (rawUrl === undefined || rawUrl.trim().length === 0) {
    throw new Error('PLAYWRIGHT_COMMUNITY_BACKEND_URL is required.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('PLAYWRIGHT_COMMUNITY_BACKEND_URL must be an absolute HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('PLAYWRIGHT_COMMUNITY_BACKEND_URL must be an HTTP(S) URL.');
  }

  parsedUrl.pathname = '/';
  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString();

}

test('boots the public Community login without credentials or mutation', async ({ page, request }) => {

  const communityBackendUrl = getRequiredCommunityBackendUrl();
  const observedBrowserApiRequests: ObservedBrowserApiRequest[] = [];

  page.on('request', (browserRequest) => {
    const requestUrl = new URL(browserRequest.url());
    if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/logout') {
      observedBrowserApiRequests.push({
        method: browserRequest.method(),
        pathname: requestUrl.pathname,
      });
    }
  });

  const healthResponse = await request.get(new URL('health-status', communityBackendUrl).toString());
  expect(healthResponse.status()).toBe(200);
  expect((await healthResponse.json()) as CommunityHealth).toMatchObject({ status: 'UP' });

  const directRuntimeInfoResponse = await request.get(
    new URL('api/open/runtime-info', communityBackendUrl).toString(),
  );
  expect(directRuntimeInfoResponse.status()).toBe(200);
  expect((await directRuntimeInfoResponse.json()) as CommunityRuntimeInfo).toMatchObject({ edition: 'community' });

  const proxiedRuntimeInfoResponse = page.waitForResponse((response) => {
    const responseUrl = new URL(response.url());
    return responseUrl.pathname === '/api/open/runtime-info'
      && response.request().method() === 'GET';
  });

  await page.goto('login');

  const runtimeInfoResponse = await proxiedRuntimeInfoResponse;
  expect(runtimeInfoResponse.status()).toBe(200);
  expect((await runtimeInfoResponse.json()) as CommunityRuntimeInfo).toMatchObject({ edition: 'community' });

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'OpsFactor' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('Use light theme', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Community could not start' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Incompatible runtime' })).toHaveCount(0);

  expect(observedBrowserApiRequests).toEqual(expect.arrayContaining([
    { method: 'GET', pathname: '/api/open/runtime-info' },
  ]));
  expect(observedBrowserApiRequests.every(({ method }) => method === 'GET' || method === 'OPTIONS')).toBe(true);

});

/**
 * Exercises the authenticated shell without requiring a mutable local account.
 *
 * The browser receives the same successful role read that the Community login
 * uses to validate its in-memory Basic credential. Runtime Info remains live,
 * so this test still catches a wrong edition or a broken Vite proxy instead of
 * replacing the backend with a broad mock.
 */
test('mounts the authenticated Community shell and keeps Enterprise discovery locked', async ({ page }) => {

  await page.route('**/api/secured/user/rolelist', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '["ROLE_ADMIN"]',
    });
  });

  await page.goto('login');
  await page.getByRole('textbox', { name: 'Username' }).fill('community-smoke');
  await page.getByRole('textbox', { name: 'Password' }).fill('community-smoke');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.getByRole('heading', { name: 'Select a module' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('Use light theme', { exact: true })).toHaveCount(0);

  await page.locator('a[title="Demand Planning"]').first().hover();

  const lockedEnterpriseEntry = page.locator(
    'a[aria-disabled="true"][href$="/demand-planning/demand-plan-change-log"]',
  );
  await expect(lockedEnterpriseEntry).toBeVisible();
  await expect(lockedEnterpriseEntry).toBeDisabled();
  await expect(lockedEnterpriseEntry.getByText('Enterprise', { exact: true })).toBeVisible();

  const urlBeforeBlockedNavigation = page.url();
  await lockedEnterpriseEntry.click({ force: true });
  await expect(page).toHaveURL(urlBeforeBlockedNavigation);

});
