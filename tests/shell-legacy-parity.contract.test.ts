import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('Shared shell keeps the legacy desktop rail and an overlay flyout instead of a permanent launcher column', () => {

  const frame = readFileSync(new URL('../packages/front-shell/src/OpsFactorLegacyAppFrame.vue', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../packages/front-shell/src/OpsFactorLegacySidebar.vue', import.meta.url), 'utf8');
  const topbar = readFileSync(new URL('../packages/front-shell/src/OpsFactorLegacyTopbar.vue', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(frame, /lg:pl-\[104px\]/);
  assert.match(frame, /overflow-x-hidden overflow-y-auto/);
  assert.match(sidebar, /v-show="flyoutVisible"/);
  assert.match(sidebar, /@mouseenter="openFlyout\(module\.key\)"/);
  assert.match(sidebar, /scheduleFlyoutClose/);
  assert.match(sidebar, /left-\[76px\]/);
  assert.match(sidebar, /getSectionIconName\(section\.label\)/);
  assert.match(sidebar, /getPageIconName\(item\.label\)/);
  assert.match(sidebar, /from '\.\/navigation-icons'/);
  assert.match(sidebar, /unavailableEditionLabel\(previewModule\.key\)/);
  assert.match(sidebar, /const shadowStrength = isLightTheme\.value \? 14 : 28/);
  assert.match(sidebar, /borderColor: `color-mix\(in srgb, \$\{module\.accent\} 24%, var\(--ofx-border\)\)`/);
  assert.match(sidebar, /:style="moduleLinkStyle\(module\)"/);
  assert.doesNotMatch(sidebar, /\? 'border-\[color:var\(--ofx-border-selected\)\] text-\[color:var\(--ofx-text\)\]'/);
  assert.match(topbar, /currentModule \?\? 'Workspace Home'/);
  assert.match(topbar, /h-9 w-auto shrink-0 opacity-100 sm:h-10/);
  assert.match(topbar, /lg:flex-row lg:items-center/);
  assert.match(index, /rel="icon" type="image\/svg\+xml" href="\/brand\/favicon\.svg"/);
  assert.equal(existsSync(new URL('../public/brand/favicon.svg', import.meta.url)), true);
  assert.doesNotMatch(sidebar, /Account⌄/);
  assert.doesNotMatch(sidebar, /userSettingsTo/);

});

test('Enterprise user settings uses the icon component supplied by the Community shell', () => {

  const sharedIcon = readFileSync(new URL('../packages/front-shell/src/OpsFactorNavigationIcon.vue', import.meta.url), 'utf8');
  const enterpriseSettings = readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/admin/pages/UserSettingsPage.vue', import.meta.url), 'utf8');

  assert.match(sharedIcon, /sun:/);
  assert.match(sharedIcon, /moon:/);
  assert.match(sharedIcon, /strokeWidth/);
  assert.match(enterpriseSettings, /OfxNavigationIcon.*@opsfactor\/front-shell/);
  assert.equal(existsSync(new URL('../src/components/ofx/navigation/OfxNavigationIcon.vue', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/navigation/OfxNavigationIcon.vue', import.meta.url)), false);

});

test('Data operation workspace is supplied by the Community shell while Enterprise injects only its visual policy', () => {

  const operationPanel = readFileSync(new URL('../packages/front-shell/src/OfxOperationPanel.vue', import.meta.url), 'utf8');
  const sharedWorkspace = readFileSync(new URL('../packages/front-shell/src/OfxDataTopicWorkspace.vue', import.meta.url), 'utf8');
  const sharedFilters = [
    'OfxDateRangeFilter.vue',
    'OfxMaterialsFilter.vue',
    'OfxLocationsFilter.vue',
    'OfxLocationCharacteristicsFilter.vue',
    'OfxMaterialCharacteristicsFilter.vue',
  ].map((fileName) => readFileSync(new URL(`../packages/front-shell/src/${fileName}`, import.meta.url), 'utf8'));
  const enterpriseWorkspace = readFileSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/data-operations/OfxDataTopicWorkspace.vue', import.meta.url), 'utf8');
  const enterprisePage = readFileSync(new URL('../../opsfactor-enterprise-front/src/modules/data/pages/DataDownloadUploadPage.vue', import.meta.url), 'utf8');

  assert.match(operationPanel, /themeMode/);
  assert.match(operationPanel, /slot name="filters"/);
  assert.doesNotMatch(operationPanel, /api\/secured|requestJson|upload/i);
  assert.match(sharedWorkspace, /OfxOperationPanel/);
  assert.match(sharedWorkspace, /OfxDownloadSplitButton/);
  assert.match(sharedWorkspace, /themeMode/);
  assert.match(sharedWorkspace, /importDescription/);
  assert.doesNotMatch(sharedWorkspace, /api\/secured|requestJson|uploadDataPackage/i);
  assert.match(enterpriseWorkspace, /OfxDataTopicWorkspace as CommunityDataTopicWorkspace/);
  assert.match(enterpriseWorkspace, /from '@opsfactor\/front-shell'/);
  assert.match(enterpriseWorkspace, /:theme-mode="themeStore\.mode"/);
  assert.match(enterprisePage, /OfxOperationPanelOption.*@opsfactor\/front-shell/);
  for (const sharedFilter of sharedFilters) {
    assert.match(sharedFilter, /OfxEntityMultiSelect|OfxDateRangePicker/);
    assert.doesNotMatch(sharedFilter, /api\/secured|requestJson|uploadDataPackage/i);
  }
  for (const hostRoot of ['../src/', '../../opsfactor-enterprise-front/src/']) {
    for (const filterName of ['OfxDateRangeFilter', 'OfxMaterialsFilter', 'OfxLocationsFilter', 'OfxLocationCharacteristicsFilter', 'OfxMaterialCharacteristicsFilter']) {
      const hostFilter = readFileSync(new URL(`${hostRoot}components/ofx/data-operations/filters/${filterName}.vue`, import.meta.url), 'utf8');
      assert.match(hostFilter, new RegExp(`${filterName} as default.*@opsfactor/front-shell`, 's'));
    }
  }
  assert.equal(existsSync(new URL('../src/components/ofx/data-operations/OfxOperationPanel.vue', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../opsfactor-enterprise-front/src/components/ofx/data-operations/OfxOperationPanel.vue', import.meta.url)), false);

});

test('FilePond presentation is supplied once by the Community shell', () => {

  const sharedAdapter = readFileSync(new URL('../packages/front-shell/src/OfxFilePondAdapter.vue', import.meta.url), 'utf8');
  const communityAdapter = readFileSync(new URL('../src/wrappers/filepond/FilePondAdapter.vue', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/wrappers/filepond/FilePondAdapter.vue', import.meta.url), 'utf8');

  assert.match(sharedAdapter, /vue-filepond/);
  assert.match(sharedAdapter, /filepond-plugin-file-validate-type/);
  assert.match(sharedAdapter, /updatefiles/);
  assert.doesNotMatch(sharedAdapter, /api\/secured|requestJson|uploadDataPackage/i);
  assert.match(communityAdapter, /OfxFilePondAdapter as default.*@opsfactor\/front-shell/s);
  assert.match(enterpriseAdapter, /OfxFilePondAdapter as default.*@opsfactor\/front-shell/s);

});

test('Community shell owns the neutral PrimeVue baseline while hosts retain bootstrap aliases', () => {

  const sharedProvider = readFileSync(new URL('../packages/front-shell/src/primevue.ts', import.meta.url), 'utf8');
  const communityAdapter = readFileSync(new URL('../src/app/providers/primevue.ts', import.meta.url), 'utf8');
  const enterpriseAdapter = readFileSync(new URL('../../opsfactor-enterprise-front/src/app/providers/primevue.ts', import.meta.url), 'utf8');

  assert.match(sharedProvider, /app\.use\(PrimeVue/);
  assert.match(sharedProvider, /unstyled: true/);
  assert.match(sharedProvider, /ripple: false/);

  for (const adapter of [communityAdapter, enterpriseAdapter]) {
    assert.match(adapter, /installOpsFactorPrimeVue as installPrimeVue.*@opsfactor\/front-shell/);
    assert.doesNotMatch(adapter, /app\.use\(PrimeVue/);
  }

});

test('Legacy route and module-landing layouts are supplied once by the Community shell', () => {

  const sharedLegacyRoute = readFileSync(new URL('../packages/front-shell/src/OpsFactorLegacyRoutePage.vue', import.meta.url), 'utf8');
  const sharedModuleLanding = readFileSync(new URL('../packages/front-shell/src/OpsFactorModuleLandingPage.vue', import.meta.url), 'utf8');
  const hostAdapters = [
    readFileSync(new URL('../src/layouts/page/LegacyRoutePage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../../opsfactor-enterprise-front/src/layouts/page/LegacyRoutePage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/layouts/page/ModuleLandingPage.vue', import.meta.url), 'utf8'),
    readFileSync(new URL('../../opsfactor-enterprise-front/src/layouts/page/ModuleLandingPage.vue', import.meta.url), 'utf8'),
  ];

  assert.match(sharedLegacyRoute, /<TaskPageLayout/);
  assert.match(sharedLegacyRoute, /<RouterLink/);
  assert.match(sharedModuleLanding, /Module overview/);
  assert.match(sharedModuleLanding, /<ReportPageLayout>/);

  for (const adapter of hostAdapters) {
    assert.match(adapter, /as default } from '@opsfactor\/front-shell'/);
    assert.doesNotMatch(adapter, /<TaskPageLayout|<ReportPageLayout|Module overview/);
  }

});
