import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const legacyFrontRoot = resolve(process.env.OPSFACTOR_LEGACY_FRONT ?? 'C:/Users/erick/VsCodeProjects/planning-front');
const referenceNavigationPath = resolve(legacyFrontRoot, 'src/app/navigation.config.ts');
const sharedNavigationPath = new URL('../packages/front-shell/src/legacy-navigation.ts', import.meta.url);
const enterpriseNavigationPath = new URL('../../opsfactor-enterprise-front/src/app/navigation.config.ts', import.meta.url);
const enterpriseSourceRoot = new URL('../../opsfactor-enterprise-front/src/', import.meta.url);
const communityNavigationPath = new URL('../src/app/navigation.config.ts', import.meta.url);
const policyPath = new URL('../packages/front-shell/src/edition-navigation-policy.ts', import.meta.url);

interface NavigationPage {
  key: string;
  label: string;
  path: string;
  legacyPath: string | null;
  status: string;
  componentKey: string | null;
}

function readNavigationPageDefinitions(source: string, componentField: 'component' | 'componentKey') {
  const matches = [...source.matchAll(/^ {12}key: '([^']+)',$/gm)];

  return matches.map<NavigationPage>((match, index) => {
    const block = source.slice(match.index, matches[index + 1]?.index);
    const field = (name: string) => new RegExp(`^ {12}${name}: '([^']+)',$`, 'm').exec(block)?.[1] ?? null;

    return {
      key: match[1],
      label: field('label') ?? '',
      path: field('path') ?? '',
      legacyPath: field('legacyPath'),
      status: field('status') ?? '',
      componentKey: componentField === 'componentKey' ? field('componentKey') : /component:\s*\(\)\s*=>/.test(block) ? match[1] : null,
    };
  });
}

function readHostComponentKeys(source: string) {
  return new Set([
    ...source.matchAll(/^\s*'([^']+)'\s*:/gm),
  ].map((match) => match[1]));
}

function readReferenceComponentPaths(source: string) {
  const componentPaths = new Map<string, string>();
  const matches = [...source.matchAll(/^ {12}key: '([^']+)',([\s\S]*?)^ {12}\},?$/gm)];

  for (const match of matches) {
    const componentPath = /component: \(\) => import\('([^']+)'\)/.exec(match[2])?.[1];
    if (componentPath) componentPaths.set(match[1], componentPath);
  }

  return componentPaths;
}

function readEnterpriseComponentPaths(source: string) {
  return new Map([
    ...source.matchAll(/^  '([^']+)': \(\) => import\('([^']+)'\),$/gm),
  ].map((match) => [match[1], match[2]]));
}

function stripImports(source: string) {
  return source.replace(/^import[\s\S]*?;\r?\n/gm, '');
}

/**
 * Lists authored Vue and TypeScript files relative to a source root.  This
 * deliberately ignores generated bundles: the contract protects the migration
 * source graph, where a parallel reconstruction would otherwise be hidden by
 * a successful production build.
 */
function collectSourceFilePaths(directory: string, relativeDirectory = ''): string[] {
  const sourceFilePaths: string[] = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = resolve(directory, entry);
    const relativePath = `${relativeDirectory}${entry}`;

    if (statSync(entryPath).isDirectory()) {
      sourceFilePaths.push(...collectSourceFilePaths(entryPath, `${relativePath}/`));
      continue;
    }

    if (relativePath.endsWith('.ts') || relativePath.endsWith('.vue')) {
      sourceFilePaths.push(relativePath);
    }
  }

  return sourceFilePaths.sort();
}

test('Community-owned navigation remains structurally identical to the current planning-front reference', () => {

  assert.equal(existsSync(referenceNavigationPath), true, `Missing planning-front reference at ${referenceNavigationPath}`);

  const referencePages = readNavigationPageDefinitions(readFileSync(referenceNavigationPath, 'utf8'), 'component');
  const sharedPages = readNavigationPageDefinitions(readFileSync(sharedNavigationPath, 'utf8'), 'componentKey');

  assert.equal(referencePages.length, 48);
  assert.deepEqual(sharedPages, referencePages);
});

test('Enterprise supplies every planning-front page loader while Community omits only explicitly Enterprise pages', () => {

  const referencePages = readNavigationPageDefinitions(readFileSync(referenceNavigationPath, 'utf8'), 'component');
  const referenceKeys = new Set(referencePages.map((page) => page.key));
  const enterpriseKeys = readHostComponentKeys(readFileSync(enterpriseNavigationPath, 'utf8'));
  const communityKeys = readHostComponentKeys(readFileSync(communityNavigationPath, 'utf8'));
  const enterprisePolicy = readFileSync(policyPath, 'utf8');
  const blockedKeys = new Set([
    ...enterprisePolicy.matchAll(/^\s*'([^']+)',$/gm),
  ].map((match) => match[1]));

  assert.deepEqual([...enterpriseKeys].sort(), [...referenceKeys].sort());
  assert.equal([...communityKeys].every((key) => referenceKeys.has(key)), true);

  for (const key of blockedKeys) {
    assert.equal(communityKeys.has(key), false, `Community must not supply the Enterprise page loader ${key}`);
  }
});

test('Enterprise preserves the current legacy module landing placeholders verbatim until those workflows are migrated', () => {

  const moduleLandingPages = [
    'modules/admin/pages/AdminPage.vue',
    'modules/configuration/pages/ConfigurationPage.vue',
    'modules/demand-planning/pages/DemandPlanningPage.vue',
    'modules/distribution/pages/DistributionPage.vue',
    'modules/pricing/pages/PricingPage.vue',
    'modules/production/pages/ProductionPage.vue',
  ];
  for (const relativePath of moduleLandingPages) {
    const referencePagePath = resolve(legacyFrontRoot, 'src', relativePath);
    const enterprisePagePath = new URL(relativePath, enterpriseSourceRoot);

    assert.equal(existsSync(referencePagePath), true, `Missing planning-front module landing reference ${relativePath}`);
    assert.equal(existsSync(enterprisePagePath), true, `Missing Enterprise module landing page ${relativePath}`);
    assert.equal(readFileSync(enterprisePagePath, 'utf8'), readFileSync(referencePagePath, 'utf8'), `Enterprise must preserve ${relativePath} from planning-front`);
  }
});

test('Enterprise loaders preserve the planning-front page component mapping except for the shared API redirect adapter', () => {

  const referenceComponents = readReferenceComponentPaths(readFileSync(referenceNavigationPath, 'utf8'));
  const enterpriseComponents = readEnterpriseComponentPaths(readFileSync(enterpriseNavigationPath, 'utf8'));
  const sharedAdapterKeys = new Set(['data-api-documentation']);

  for (const [key, referenceComponentPath] of referenceComponents) {
    if (sharedAdapterKeys.has(key)) continue;
    assert.equal(enterpriseComponents.get(key), referenceComponentPath, `Enterprise loader ${key} must retain the planning-front component path`);
  }

  const enterpriseNavigationSource = readFileSync(enterpriseNavigationPath, 'utf8');
  assert.match(enterpriseNavigationSource, /'data-api-documentation': OpsFactorApiDocumentationRedirect/);
});

test('Enterprise Data resolves only through the planning-front workspace, not an alternate private catalog', () => {

  const enterpriseComponents = readEnterpriseComponentPaths(readFileSync(enterpriseNavigationPath, 'utf8'));
  const enterpriseDataDirectory = new URL('../../opsfactor-enterprise-front/src/modules/data/', import.meta.url);
  const referenceNavigationSource = readFileSync(referenceNavigationPath, 'utf8');

  assert.match(referenceNavigationSource, /key: 'data-download-upload',[\s\S]*?component: \(\) => import\('\@\/modules\/data\/pages\/DataDownloadUploadPage\.vue'\)/);
  assert.equal(enterpriseComponents.get('data-download-upload'), '@/modules/data/pages/DataDownloadUploadPage.vue');
  assert.doesNotMatch(readFileSync(enterpriseNavigationPath, 'utf8'), /additionalDataSearchEntries|data-topic-inventory-policy/);
  for (const removedParallelModule of [
    'EnterpriseDataOperationsPage.vue',
    'enterprise-data-operations.service.ts',
    'enterprise-data-operations.types.ts',
    'pages/DataPage.vue',
    'pages/PlanningDataPage.vue',
    'components/DataContractViewer.vue',
    'components/DataHierarchyNavigator.vue',
    'components/DataInterfaceCardGrid.vue',
    'components/DataOperationPanel.vue',
    'composables/useDataWorkspaceContract.ts',
    'composables/useDataWorkspaceHierarchy.ts',
    'composables/useDataWorkspaceOperationPanel.ts',
    'services/data-operation-option-sources.service.ts',
    'services/data-operation-ui-contract.service.ts',
  ]) {
    assert.equal(existsSync(new URL(removedParallelModule, enterpriseDataDirectory)), false);
  }
});

test('Enterprise keeps every reference route page byte-for-byte equivalent outside its Community-package imports', () => {

  const referenceComponents = readReferenceComponentPaths(readFileSync(referenceNavigationPath, 'utf8'));
  const hostWrappers = new Set([
    'data-api-documentation',
    'demand-plans',
    'supply-plans',
    'process-status',
  ]);

  for (const [key, componentPath] of referenceComponents) {
    if (hostWrappers.has(key)) continue;

    const relativeComponentPath = componentPath.replace('@/', '');
    const referencePage = readFileSync(resolve(legacyFrontRoot, 'src', relativeComponentPath), 'utf8');
    const enterprisePage = readFileSync(new URL(relativeComponentPath, enterpriseSourceRoot), 'utf8');

    assert.equal(
      stripImports(enterprisePage),
      stripImports(referencePage),
      `Enterprise page ${key} may differ from planning-front only through Community-package imports`,
    );
  }
});

test('Enterprise remains a planning-front derivative with only declared Community extractions', () => {

  const referenceSourceDirectory = resolve(legacyFrontRoot, 'src');
  const enterpriseSourceDirectory = new URL('../../opsfactor-enterprise-front/src/', import.meta.url);
  const referenceSourceFiles = collectSourceFilePaths(referenceSourceDirectory);
  const enterpriseSourceFiles = collectSourceFilePaths(fileURLToPath(enterpriseSourceDirectory));
  const declaredCommunityExtractions = [
    'components/ofx/analytics/OfxKpiCard.vue',
    'components/ofx/data-display/OfxTableCellText.vue',
    'components/ofx/data-operations/OfxOperationPanel.vue',
    'components/ofx/feedback/OfxEmptyState.vue',
    'components/ofx/feedback/OfxLoadingState.vue',
    'components/ofx/forms/OfxFilterBar.vue',
    'components/ofx/layout/OfxPageHeader.vue',
    'components/ofx/navigation/OfxNavigationIcon.vue',
    'components/ofx/overlays/OfxConfirmDialog.vue',
    'components/ofx/overlays/OfxModalDialog.vue',
    'components/ofx/surfaces/OfxSectionCard.vue',
    'layouts/app-shell/AppContentFrame.vue',
    'layouts/page/ModuleWorkspacePage.vue',
    'layouts/page/TaskPageLayout.vue',
  ];
  const removedParallelDataWorkspace = [
    'modules/data/components/DataContractViewer.vue',
    'modules/data/components/DataHierarchyNavigator.vue',
    'modules/data/components/DataInterfaceCardGrid.vue',
    'modules/data/components/DataOperationPanel.vue',
    'modules/data/components/index.ts',
    'modules/data/composables/data-workspace.types.ts',
    'modules/data/composables/index.ts',
    'modules/data/composables/useDataWorkspaceContract.ts',
    'modules/data/composables/useDataWorkspaceHierarchy.ts',
    'modules/data/composables/useDataWorkspaceOperationPanel.ts',
    'modules/data/pages/ApiDocumentationRedirectPage.vue',
    'modules/data/pages/DataPage.vue',
    'modules/data/pages/PlanningDataPage.vue',
    'modules/data/services/data-operation-option-sources.service.ts',
    'modules/data/services/data-operation-ui-contract.service.ts',
  ];
  const retiredParallelRouteRegistries = [
    'router/modules/_shared.ts',
    'router/modules/admin.routes.ts',
    'router/modules/configuration.routes.ts',
    'router/modules/data.routes.ts',
    'router/modules/demand.routes.ts',
    'router/modules/distribution.routes.ts',
    'router/modules/pricing.routes.ts',
    'router/modules/processes.routes.ts',
    'router/modules/production.routes.ts',
    'router/modules/supply.routes.ts',
    'router/modules/visibility.routes.ts',
  ];
  const declaredEnterpriseHostFiles = [
    'app/edition.ts',
    'modules/runtime/RuntimeIncompatiblePage.vue',
    'services/enterprise-authentication.service.ts',
  ];

  assert.deepEqual(
    referenceSourceFiles.filter((sourceFile) => !enterpriseSourceFiles.includes(sourceFile)),
    [...declaredCommunityExtractions, ...removedParallelDataWorkspace, ...retiredParallelRouteRegistries].sort(),
    'Every planning-front source missing from Enterprise must be an explicit shared extraction or retired parallel registry.',
  );
  assert.deepEqual(
    enterpriseSourceFiles.filter((sourceFile) => !referenceSourceFiles.includes(sourceFile)),
    declaredEnterpriseHostFiles,
    'Enterprise may add only its edition identity, runtime incompatibility screen and authentication host adapter.',
  );
});
