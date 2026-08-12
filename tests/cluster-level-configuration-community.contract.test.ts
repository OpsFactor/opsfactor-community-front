import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(
  new URL('../src/modules/demand-planning/ClusterLevelConfigurationCommunityPage.vue', import.meta.url),
  'utf8',
);
const serviceSource = readFileSync(
  new URL('../src/modules/demand-planning/services/cluster-level-configuration.service.ts', import.meta.url),
  'utf8',
);
const referenceSource = readFileSync(
  new URL('../../../VsCodeProjects/planning-front/src/modules/demand-planning/pages/ClusterLevelConfigurationPage.vue', import.meta.url),
  'utf8',
);
const navigationSource = readFileSync(
  new URL('../src/app/navigation.config.ts', import.meta.url),
  'utf8',
);
const navigationPolicySource = readFileSync(
  new URL('../packages/front-shell/src/edition-navigation-policy.ts', import.meta.url),
  'utf8',
);

test('Community exposes the bounded clustering editor required by Demand Planning', () => {
  assert.match(navigationSource, /'configuration-clustering'/);
  assert.match(navigationSource, /ClusterScopeInspectorPage\.vue/);
  assert.doesNotMatch(navigationPolicySource, /'configuration-clustering'/);
});

test('Community uses only its material-cluster catalog and public forecast endpoints', () => {
  assert.match(serviceSource, /\/api\/secured\/material\/cluster/);
  assert.match(serviceSource, /\/api\/secured\/demandPlanConfiguration\/get/);
  assert.match(serviceSource, /\/api\/secured\/demandPlanConfiguration\/save/);
  assert.match(serviceSource, /\/api\/secured\/demandPlanConfiguration\/simulate/);
  assert.doesNotMatch(serviceSource, /\/api\/secured\/product\/cluster|\/DTO\/clusterprodutos/);

  assert.doesNotMatch(pageSource, /budget\/|uplift\/|stockout\/|autofit\/|forecastpreview/);
});

test('Community preserves the canonical Planning Front section order', () => {
  const orderedSections = [
    'Execution Profile Selection',
    'Cluster Selection',
    'Outlier Smoothing',
    'DFU Split',
    'Forecast Model Parametrization',
    'Sales History and Coverage',
    'Simulation Parameters',
    'Forecast Accuracy',
    'Detailed View Filters',
    'Forecast Preview',
  ];

  for (const source of [referenceSource, pageSource]) {
    let previousIndex = -1;
    for (const section of orderedSections) {
      const sectionIndex = source.indexOf(`title="${section}"`);
      assert.ok(sectionIndex > previousIndex, `${section} must preserve the Planning Front order`);
      previousIndex = sectionIndex;
    }
  }
});

test('Community restores canonical fields and model-driven manual configuration', () => {
  for (const field of [
    'Bucket Size',
    'Default Auto-Fit',
    'Execute Demand Plan',
    'Outlier Smoothing Model',
    'Days for Outlier Smoothing',
    'Split Model',
    'Days for Top-Down Split',
    'Event Uplift',
    'Product Aggregation',
    'Location Aggregation',
    'Unit of Measure',
    'Stockout Treatment',
    'Round to sales UOM',
    'Days of Historical Sales',
    'Consider historical sales of inactive DFUs',
    'Generate forecast for out-of-line products',
    'Support Regressors',
    'Generate Forecast Preview',
  ]) {
    assert.match(pageSource, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const model of [
    'Moving Average',
    'Rolling Moving Average',
    'ARIMA',
    'Holt-Winters',
    'Exponential Smoothing',
  ]) {
    assert.match(pageSource, new RegExp(model));
  }

  assert.match(pageSource, /OfxSelectField/);
  assert.match(pageSource, /OfxPeriodPicker/);
  assert.match(pageSource, /EChartAdapter/);
  assert.match(pageSource, /OfxDataTable/);
  assert.doesNotMatch(pageSource, /<select\b/);
  assert.doesNotMatch(pageSource, /Save Configuration/);
  assert.doesNotMatch(pageSource, /Not available in the current edition/);
});

test('Community preview keeps observed and forecast series in their valid time ranges', () => {
  for (const implementationDetail of [
    'posicaoPeriodoUltimaVenda',
    'hideSalesAfterHistory',
    'showForecastOnly',
    'showHistoricalStlOnly',
    'Seasonality Comparison',
    'Aggregated Error at Lag',
    'Material / Location Error',
    'Automatic selection',
    'type="range"',
  ]) {
    assert.match(pageSource, new RegExp(implementationDetail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(pageSource, /aggregatedDataAtMapeLevel/);
});

test('Community charts prioritize readable quantities and keep decomposition from flattening the preview', () => {
  assert.doesNotMatch(pageSource, /selected: \{ Seasonality: false \}/);
  assert.match(pageSource, /scale: true/);
  assert.match(pageSource, /valueFormatter: \(value: unknown\) => formatTooltipQuantity/);
  assert.match(pageSource, /value == null \|\| value === '' \|\| value === '-'/);
  assert.match(pageSource, /formatter: \(params: unknown\) => formatSeasonalityTooltip\(params\)/);
  assert.match(pageSource, /Smoothed Historical Sales/);
  assert.match(pageSource, /hasVisibleValues\(smoothedHistoricalSales\)/);
  assert.match(pageSource, /hasMeaningfulDifference\(smoothedHistoricalSales, historicalSales\)/);
  assert.match(pageSource, /emphasis: \{[\s\S]*?focus: 'series'/);
  assert.equal((pageSource.match(/:height="360"/g) ?? []).length, 2);
});

test('Community mirrors the canonical lag metrics and never invents a table-level lag selector', () => {
  for (const label of [
    'Forecast Lag (# periods) for Error Calculation',
    'Total Sales at Lag',
    'Total Bias at Lag',
    '% Bias at Lag',
    '% MAPE at Lag',
    'No Sales Reference',
  ]) {
    assert.match(pageSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.equal((pageSource.match(/v-model="forecastLag"/g) ?? []).length, 1);
  assert.doesNotMatch(
    pageSource,
    /label="Periods"|label="Material \/ Location Series"|label="Historical Quantity"|label="Forecast Quantity"|Absolute residual across/,
  );
});

test('Community keeps Pro general settings visible, locked, and fixed to their effective values', () => {
  assert.match(pageSource, /label="Use Auto-fitted Model"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /label="Product Aggregation"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /label="Location Aggregation"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /label="Round to sales UOM"[\s\S]*?locked-label="Pro \/ Enterprise"/);
  assert.match(pageSource, /materialAggregationType: 'Top-Down'/);
  assert.match(pageSource, /locationAggregationType: 'Top-Down'/);
  assert.match(pageSource, /roundToSalesUnit: false/);
  assert.doesNotMatch(pageSource, /value: 'Bottom-Up'/);
});

test('Community fixes the DFU split model as Pro while keeping only its day window editable', () => {
  assert.match(
    pageSource,
    /label="Split Model"[^>]*:options="splitModelOptions"[^>]*locked[^>]*locked-label="Pro"/,
  );
  assert.match(
    pageSource,
    /label="Days for Top-Down Split"[^>]*type="number"/,
  );
  assert.doesNotMatch(
    pageSource,
    /label="Days for Top-Down Split"[^>]*locked/,
  );
});

test('Community preserves the selected statistical model while generating a preview', () => {
  const simulationStart = pageSource.indexOf('async function generateForecastPreview');
  const simulationEnd = pageSource.indexOf('onMounted(', simulationStart);
  const simulationSource = pageSource.slice(simulationStart, simulationEnd);

  assert.match(simulationSource, /simulateClusterLevelConfiguration\(buildConfigurationPayload\(\), referenceDate\.value\)/);
  assert.doesNotMatch(simulationSource, /configuration\.value\s*=/);
});

test('Community save and simulation payloads drop Enterprise transition fields', () => {
  const normalizerStart = pageSource.indexOf('function normalizeConfiguration');
  const normalizerEnd = pageSource.indexOf('function parseNullableNumber');
  const normalizerSource = pageSource.slice(normalizerStart, normalizerEnd);

  for (const publicField of [
    'materialAggregationType',
    'locationAggregationType',
    'generateForecastForDiscontinuedMaterials',
    'daysSalesHistory',
    'daysTopDownSplit',
    'alpha',
    'beta',
    'gamma',
  ]) {
    assert.match(normalizerSource, new RegExp(publicField));
  }

  for (const privateField of [
    'budgetId',
    'regressionTimeSeries',
    'useExecutionProfileAutofitModel',
    'includeWorkingDaysRegressor',
    'chronosForceAggregatedForecast',
  ]) {
    assert.doesNotMatch(normalizerSource, new RegExp(privateField));
  }
});
