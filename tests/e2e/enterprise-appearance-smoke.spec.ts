import { expect, test } from '@playwright/test';

interface EnterpriseRuntimeInfo {
  edition: string;
  availableDemandPlanningForecastModels: string[];
  demandPlanningForecastModelOptions: unknown[];
  availableDemandPlanningSplitModels: string[];
  demandPlanningSplitModelOptions: unknown[];
  availableDemandPlanningStockoutTreatmentModels: string[];
  demandPlanningStockoutTreatmentModelOptions: unknown[];
  availableDemandPlanningSmoothingModels: string[];
  demandPlanningSmoothingModelOptions: unknown[];
  availableDemandPlanningUpliftModels: string[];
  demandPlanningUpliftModelOptions: unknown[];
  availableDemandPlanningHistoricalDocumentTypes: string[];
  demandPlanningHistoricalDocumentTypeOptions: unknown[];
  availableSupplyPlanningExecutionModels: string[];
  supplyPlanningExecutionModelOptions: unknown[];
  visibleDemandPlanningBookKeyFigures: string[];
  selectableDemandPlanningBookKeyFigures: string[];
  editableDemandPlanningBookKeyFigures: string[];
  visibleSupplyPlanningBookKeyFigures: string[];
  selectableSupplyPlanningBookKeyFigures: string[];
  editableSupplyPlanningBookKeyFigures: string[];
}

interface UserInterfacePreferences {
  themeMode: 'dark' | 'light';
  availableThemeModes: Array<'dark' | 'light'>;
}

/** Supplies every public Runtime Info field because navigation derives options during bootstrap. */
const enterpriseRuntimeInfo: EnterpriseRuntimeInfo = {
  edition: 'enterprise',
  availableDemandPlanningForecastModels: [],
  demandPlanningForecastModelOptions: [],
  availableDemandPlanningSplitModels: [],
  demandPlanningSplitModelOptions: [],
  availableDemandPlanningStockoutTreatmentModels: [],
  demandPlanningStockoutTreatmentModelOptions: [],
  availableDemandPlanningSmoothingModels: [],
  demandPlanningSmoothingModelOptions: [],
  availableDemandPlanningUpliftModels: [],
  demandPlanningUpliftModelOptions: [],
  availableDemandPlanningHistoricalDocumentTypes: [],
  demandPlanningHistoricalDocumentTypeOptions: [],
  availableSupplyPlanningExecutionModels: [],
  supplyPlanningExecutionModelOptions: [],
  visibleDemandPlanningBookKeyFigures: [],
  selectableDemandPlanningBookKeyFigures: [],
  editableDemandPlanningBookKeyFigures: [],
  visibleSupplyPlanningBookKeyFigures: [],
  selectableSupplyPlanningBookKeyFigures: [],
  editableSupplyPlanningBookKeyFigures: [],
};

/**
 * Exercises the Enterprise-only user preference flow without calling a local
 * Enterprise backend.  Every intercepted path is a session/bootstrap concern;
 * product pages and data endpoints stay outside this smoke.
 */
test('restores and changes the Enterprise theme from the per-user settings page', async ({ page }) => {

  let authenticated = false;
  const preferenceWrites: UserInterfacePreferences[] = [];

  await page.route('**/api/open/runtime-info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(enterpriseRuntimeInfo),
    });
  });

  await page.route('**/login', async (route) => {
    // The SPA itself lives at /app/login. Intercept only the proxied backend
    // endpoint, otherwise this handler would replace the Vue application HTML.
    if (new URL(route.request().url()).pathname !== '/login') {
      await route.fallback();
      return;
    }

    if (route.request().method() === 'GET') {
      if (authenticated) {
        await route.fulfill({ status: 302, headers: { location: '/' } });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<form id="loginform"><input name="_csrf" value="enterprise-smoke-token"></form>',
      });
      return;
    }

    if (route.request().method() === 'POST') {
      authenticated = true;
      await route.fulfill({ status: 302, headers: { location: '/' } });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/secured/configuration/user/interface/preferences', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          themeMode: 'dark',
          availableThemeModes: ['dark', 'light'],
        } satisfies UserInterfacePreferences),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Pick<UserInterfacePreferences, 'themeMode'>;
      preferenceWrites.push({
        themeMode: body.themeMode,
        availableThemeModes: ['dark', 'light'],
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(preferenceWrites.at(-1)),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('login');
  await page.getByRole('textbox', { name: 'Username' }).fill('enterprise-smoke');
  await page.getByRole('textbox', { name: 'Password' }).fill('enterprise-smoke');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('admin/user-settings');
  await expect(page.getByRole('heading', { name: 'User Settings' })).toBeVisible();
  await expect(page.getByText('This preference is saved only for your user and restored after login.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Active.*Dark/ })).toBeVisible();

  await page.getByRole('button', { name: /Select.*Light/ }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /Active.*Light/ })).toBeVisible();
  await expect(page.getByText('Theme saved')).toBeVisible();
  expect(preferenceWrites).toEqual([{
    themeMode: 'light',
    availableThemeModes: ['dark', 'light'],
  }]);

});
