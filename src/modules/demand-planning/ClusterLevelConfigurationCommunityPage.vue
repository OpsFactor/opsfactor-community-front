<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxPeriodPicker from '@/components/ofx/forms/OfxPeriodPicker.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import OfxDataTable from '@/components/ofx/data-display/OfxDataTable.vue';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import type { OfxSelectOption, OfxTableColumn } from '@/types/ui';
import {
  OfxEmptyState,
  OfxKpiCard,
  OfxLoadingState,
  OfxPageHeader,
  OfxSectionCard,
} from '@opsfactor/front-shell';
import {
  fetchClusterLevelConfiguration,
  fetchDemandExecutionProfiles,
  fetchDemandLocationClusters,
  fetchDemandProductClusters,
  fetchUomIds,
  saveClusterLevelConfiguration,
  simulateClusterLevelConfiguration,
  type DemandClusterLevelConfiguration,
  type DemandExecutionProfileOption,
  type DemandLocationClusterOption,
  type DemandProductClusterOption,
  type DemandSimulationSeriesRow,
  type SimulatedDemandPlanMaterialLocationDto,
  type SimulatedDemandPlanResponse,
} from './services/cluster-level-configuration.service';

const CLUSTER_LEVEL_VALUE = 'Cluster Level';

type SimulationPreviewSeriesRow = SimulatedDemandPlanMaterialLocationDto;

type AggregatedErrorRow = {
  rowKey: string;
  locationDimension: string;
  materialDimension: string;
  salesQty: number;
  forecastQty: number;
  error: number;
  errorPercent: number | null;
};

type MaterialLocationErrorRow = {
  rowKey: string;
  locationId: string;
  materialId: string;
  salesQty: number;
  forecastQty: number;
  error: number;
  errorPercent: number | null;
};

const isBootstrapping = ref(true);
const isLoadingConfiguration = ref(false);
const isSavingConfiguration = ref(false);
const isRunningSimulation = ref(false);
const failure = ref('');
const feedback = ref('');

const executionProfiles = ref<DemandExecutionProfileOption[]>([]);
const locationClusters = ref<DemandLocationClusterOption[]>([]);
const productClusters = ref<DemandProductClusterOption[]>([]);
const uomIds = ref<string[]>([]);

const selectedExecutionProfileId = ref('');
const selectedLocationClusterId = ref('');
const selectedProductClusterId = ref('');
const selectedMaterial = ref(CLUSTER_LEVEL_VALUE);
const selectedLocation = ref(CLUSTER_LEVEL_VALUE);
const forecastLag = ref('0');
const referenceDate = ref(toLocalDateInputValue(new Date()));

const configuration = ref<DemandClusterLevelConfiguration>(createEmptyConfiguration());
const simulation = ref<SimulatedDemandPlanResponse | null>(null);

const aggregatedColumns: OfxTableColumn[] = [
  { field: 'locationDimension', header: 'Location (Selected)', dataType: 'text' },
  { field: 'materialDimension', header: 'Material (Selected)', dataType: 'text' },
  { field: 'salesQty', header: 'Sales Quantity', dataType: 'number-1', align: 'right' },
  { field: 'forecastQty', header: 'Forecast Quantity', dataType: 'number-1', align: 'right' },
  { field: 'error', header: 'Error', dataType: 'number-1', align: 'right' },
  { field: 'errorPercent', header: '% Error', dataType: 'fraction-percent-2', emptyValueLabel: 'No Sales Reference', align: 'right' },
];
const materialLocationColumns: OfxTableColumn[] = [
  { field: 'locationId', header: 'Location', dataType: 'text' },
  { field: 'materialId', header: 'Material', dataType: 'text' },
  { field: 'salesQty', header: 'Sales Quantity', dataType: 'number-1', align: 'right' },
  { field: 'forecastQty', header: 'Forecast Quantity', dataType: 'number-1', align: 'right' },
  { field: 'error', header: 'Error', dataType: 'number-1', align: 'right' },
  { field: 'errorPercent', header: '% Error', dataType: 'fraction-percent-2', emptyValueLabel: 'No Sales Reference', align: 'right' },
];

const statisticalModelOptions: OfxSelectOption[] = [
  { value: 'Moving Average', label: 'Moving Average' },
  { value: 'Rolling Moving Average', label: 'Rolling Moving Average' },
  { value: 'ARIMA', label: 'ARIMA' },
  { value: 'Holt-Winters', label: 'Holt-Winters' },
  { value: 'Exponential Smoothing', label: 'Exponential Smoothing' },
];
const aggregationOptions: OfxSelectOption[] = [
  { value: 'Top-Down', label: 'Top-Down' },
];
const splitModelOptions: OfxSelectOption[] = [
  { value: 'Historical Sales', label: 'Historical Sales' },
];
const disabledOutlierOptions: OfxSelectOption[] = [
  { value: 'Inactive', label: 'Inactive' },
];
const disabledUpliftOptions: OfxSelectOption[] = [
  { value: 'No Uplift Calculation', label: 'No Uplift Calculation' },
];
const disabledStockoutOptions: OfxSelectOption[] = [
  { value: 'Disabled', label: 'Disabled' },
];
const disabledRegressorOptions: OfxSelectOption[] = [
  { value: 'None', label: 'None' },
];

const canLoadConfiguration = computed(() => Boolean(
  selectedExecutionProfileId.value
  && selectedLocationClusterId.value
  && selectedProductClusterId.value,
));
const selectedExecutionProfile = computed(() => executionProfiles.value.find(
  (profile) => profile.id === selectedExecutionProfileId.value,
) ?? null);
const executeDemandPlanEnabled = computed(() => (
  configuration.value.demandPlanningGeneralParameters.executeDemandPlan !== false
));
const statisticalModel = computed(() => normalizeStatisticalModel(
  configuration.value.demandPlanningForecastParameters.statisticalModel,
));
const showMovingAverageWindow = computed(() => (
  statisticalModel.value === 'Moving Average'
  || statisticalModel.value === 'Rolling Moving Average'
));
const showAlpha = computed(() => (
  statisticalModel.value === 'Exponential Smoothing'
  || statisticalModel.value === 'Holt-Winters'
));
const showBetaGamma = computed(() => statisticalModel.value === 'Holt-Winters');
const autoAlpha = computed({
  get: () => configuration.value.demandPlanningForecastParameters.alpha == null,
  set: (automatic: boolean) => {
    configuration.value.demandPlanningForecastParameters.alpha = automatic
      ? null
      : configuration.value.demandPlanningForecastParameters.alpha ?? 0;
  },
});
const autoBeta = computed({
  get: () => configuration.value.demandPlanningForecastParameters.beta == null,
  set: (automatic: boolean) => {
    configuration.value.demandPlanningForecastParameters.beta = automatic
      ? null
      : configuration.value.demandPlanningForecastParameters.beta ?? 0;
  },
});
const autoGamma = computed({
  get: () => configuration.value.demandPlanningForecastParameters.gamma == null,
  set: (automatic: boolean) => {
    configuration.value.demandPlanningForecastParameters.gamma = automatic
      ? null
      : configuration.value.demandPlanningForecastParameters.gamma ?? 0;
  },
});
const forecastStartIndex = computed(() => {
  const index = Number(simulation.value?.posicaoPeriodoInicioForecast);
  return Number.isInteger(index) && index >= 0 ? index : simulation.value?.periodos.length ?? 0;
});
const lastHistoricalSalesIndex = computed(() => {
  const index = Number(simulation.value?.posicaoPeriodoUltimaVenda);
  if (Number.isInteger(index) && index >= 0) return index;

  return findLastMeaningfulIndex(aggregateSeries(filteredSimulationRows.value, 'historicalSales'));
});
const currentLagIndex = computed(() => {
  const lag = Number(forecastLag.value);
  if (!Number.isInteger(lag) || lag < 0) return forecastStartIndex.value;
  return Math.min(forecastStartIndex.value + lag, Math.max((simulation.value?.periodos.length ?? 1) - 1, 0));
});

const executionProfileOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a Demand Planning Execution Profile' },
  ...executionProfiles.value.map((profile) => ({
    value: profile.id,
    label: profile.description?.trim()
      ? `${profile.id} - ${profile.bucketSize ?? 'No bucket'} - ${profile.description}`
      : profile.id,
  })),
]);
const locationClusterOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a location cluster' },
  ...locationClusters.value.map((cluster) => ({
    value: String(cluster.id),
    label: cluster.description?.trim() || String(cluster.id),
  })),
]);
const productClusterOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a product cluster' },
  ...productClusters.value.map((cluster) => ({
    value: String(cluster.id ?? cluster.codigo ?? ''),
    label: cluster.description?.trim() || cluster.descricao?.trim() || String(cluster.id ?? cluster.codigo ?? ''),
  })),
]);
const uomOptions = computed<OfxSelectOption[]>(() => uomIds.value.map((uomId) => ({
  value: uomId,
  label: uomId,
})));
const materialFilterOptions = computed<OfxSelectOption[]>(() => [
  { value: CLUSTER_LEVEL_VALUE, label: CLUSTER_LEVEL_VALUE },
  ...uniqueSeriesValues('material').map((materialId) => ({ value: materialId, label: materialId })),
]);
const locationFilterOptions = computed<OfxSelectOption[]>(() => [
  { value: CLUSTER_LEVEL_VALUE, label: CLUSTER_LEVEL_VALUE },
  ...uniqueSeriesValues('location').map((locationId) => ({ value: locationId, label: locationId })),
]);
const filteredSimulationRows = computed(() => (simulation.value?.materialLocationData ?? []).filter((row) => (
  (selectedMaterial.value === CLUSTER_LEVEL_VALUE || simulationMaterialId(row) === selectedMaterial.value)
  && (selectedLocation.value === CLUSTER_LEVEL_VALUE || row.locationId === selectedLocation.value)
)));
const aggregatedHistoricalSales = computed(() => aggregateSeries(
  filteredSimulationRows.value,
  'historicalSales',
));
const aggregatedBaselineForecast = computed(() => aggregateSeries(
  filteredSimulationRows.value,
  'baselineForecast',
));
const aggregatedResidual = computed(() => aggregateSeries(
  filteredSimulationRows.value,
  'residual',
));
const forecastLagOptions = computed<OfxSelectOption[]>(() => {
  const periods = simulation.value?.periodos ?? [];
  if (!periods.length || forecastStartIndex.value >= periods.length) return [{ value: '0', label: 'Lag 0' }];

  return periods.slice(forecastStartIndex.value).map((period, index) => ({
    value: String(index),
    label: `Lag ${index} - ${period}`,
  }));
});
const aggregatedErrorRows = computed<AggregatedErrorRow[]>(() => {
  if (!simulation.value || !filteredSimulationRows.value.length) return [];

  const lagIndex = currentLagIndex.value;
  const salesQty = aggregatedHistoricalSales.value[lagIndex] ?? 0;
  const forecastQty = aggregatedBaselineForecast.value[lagIndex] ?? 0;
  const error = aggregatedResidual.value[lagIndex] ?? 0;
  return [{
    rowKey: `aggregate-${lagIndex}`,
    locationDimension: selectedLocation.value,
    materialDimension: selectedMaterial.value,
    salesQty,
    forecastQty,
    error,
    errorPercent: salesQty === 0 ? null : error / salesQty,
  }];
});
const materialLocationErrorRows = computed<MaterialLocationErrorRow[]>(() => filteredSimulationRows.value.map((row, index) => {
  const lagIndex = currentLagIndex.value;
  const salesQty = numberAt(row.historicalSales, lagIndex);
  const forecastQty = numberAt(row.baselineForecast, lagIndex);
  const error = numberAt(row.residual, lagIndex);
  return {
    rowKey: `${simulationMaterialId(row)}-${row.locationId ?? '-'}-${index}`,
    locationId: row.locationId ?? '-',
    materialId: simulationMaterialId(row),
    salesQty,
    forecastQty,
    error,
    errorPercent: salesQty === 0 ? null : error / salesQty,
  };
}));
const currentLagMetrics = computed(() => {
  const lagIndex = currentLagIndex.value;
  const metrics = filteredSimulationRows.value.reduce(
    (result, row) => {
      result.salesQty += numberAt(row.historicalSales, lagIndex);
      result.error += numberAt(row.residual, lagIndex);
      result.absoluteError += numberAt(row.absoluteResidual, lagIndex);
      return result;
    },
    { salesQty: 0, error: 0, absoluteError: 0 },
  );

  return {
    salesQty: metrics.salesQty,
    error: metrics.error,
    bias: metrics.salesQty === 0 ? null : metrics.error / metrics.salesQty,
    mape: metrics.salesQty === 0 ? null : metrics.absoluteError / metrics.salesQty,
  };
});
const previewMetricCards = computed(() => [
  { label: 'Total Sales at Lag', value: formatQuantity(currentLagMetrics.value.salesQty), tone: 'success' as const },
  { label: 'Total Bias at Lag', value: formatQuantity(currentLagMetrics.value.error) },
  { label: '% Bias at Lag', value: formatPercent(currentLagMetrics.value.bias) },
  { label: '% MAPE at Lag', value: formatPercent(currentLagMetrics.value.mape) },
]);
const previewChartOption = computed(() => ({
  animation: false,
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'line',
      snap: true,
      lineStyle: { color: 'rgba(233,238,251,0.28)', width: 1 },
    },
    backgroundColor: 'rgba(10,16,29,0.96)',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: '#e9eefb' },
    valueFormatter: (value: unknown) => formatTooltipQuantity(value),
  },
  legend: {
    type: 'scroll',
    top: 0,
    left: 'center',
    right: 16,
    textStyle: { color: 'rgba(233,238,251,0.72)' },
    pageTextStyle: { color: 'rgba(233,238,251,0.72)' },
    pageIconColor: '#0d8ecf',
    pageIconInactiveColor: 'rgba(201,213,241,0.54)',
    itemWidth: 14,
    itemHeight: 8,
    itemGap: 16,
  },
  grid: { left: 54, right: 22, top: 54, bottom: 38 },
  xAxis: {
    type: 'category',
    data: simulation.value?.periodos ?? [],
    boundaryGap: false,
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(201,213,241,0.54)', hideOverlap: true, margin: 12 },
  },
  yAxis: {
    type: 'value',
    scale: true,
    splitNumber: 5,
    axisLabel: {
      color: 'rgba(201,213,241,0.54)',
      formatter: (value: unknown) => formatQuantity(Number(value ?? 0)),
    },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
  },
  series: buildPreviewLineSeries(),
}));
const seasonalityChartOption = computed(() => buildSeasonalityChartOption());

/** Keeps the new Community API labels canonical while accepting older enum-shaped payloads. */
function normalizeStatisticalModel(value: unknown): string {
  const aliases: Record<string, string> = {
    MM: 'Moving Average',
    RMM: 'Rolling Moving Average',
    HOLT_WINTERS: 'Holt-Winters',
    ES: 'Exponential Smoothing',
  };
  const normalized = String(value ?? 'Moving Average');
  return aliases[normalized] ?? normalized;
}

function normalizeAggregation(_value: unknown): string {
  return 'Top-Down';
}

function normalizeSplitModel(_value: unknown): string {
  return 'Historical Sales';
}

function toLocalDateInputValue(date: Date): string {
  const offsetMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
}

function createEmptyConfiguration(options: {
  executionProfileId?: string;
  locationClusterId?: string;
  productClusterId?: string;
  defaultUomId?: string;
} = {}): DemandClusterLevelConfiguration {
  return {
    demandPlanExecutionProfileId: options.executionProfileId || null,
    materialClusterId: options.productClusterId ? Number(options.productClusterId) : null,
    locationClusterId: options.locationClusterId ? Number(options.locationClusterId) : null,
    demandPlanningGeneralParameters: {
      executeDemandPlan: true,
      uomId: options.defaultUomId ?? '',
      roundToSalesUnit: false,
      considerHistoricalSalesOfInactiveDfus: false,
      generateForecastForDiscontinuedMaterials: false,
      materialAggregationType: 'Top-Down',
      locationAggregationType: 'Top-Down',
      daysSalesHistory: 365,
    },
    demandPlanningForecastParameters: {
      statisticalModel: 'Moving Average',
      daysMovingAverageModel: 90,
      splitModel: 'Historical Sales',
      daysTopDownSplit: 90,
      alpha: null,
      beta: null,
      gamma: null,
    },
  };
}

/** Normalizes only public Community fields and deliberately drops every private transition field. */
function normalizeConfiguration(
  source: DemandClusterLevelConfiguration,
  options: {
    executionProfileId: string;
    locationClusterId: string;
    productClusterId: string;
    defaultUomId: string;
  },
): DemandClusterLevelConfiguration {
  const defaults = createEmptyConfiguration(options);
  const general = source.demandPlanningGeneralParameters ?? {};
  const forecast = source.demandPlanningForecastParameters ?? {};

  return {
    demandPlanExecutionProfileId: options.executionProfileId,
    locationClusterId: Number(options.locationClusterId),
    materialClusterId: Number(options.productClusterId),
    demandPlanningGeneralParameters: {
      executeDemandPlan: general.executeDemandPlan ?? true,
      uomId: String(general.uomId ?? options.defaultUomId),
      roundToSalesUnit: false,
      considerHistoricalSalesOfInactiveDfus: general.considerHistoricalSalesOfInactiveDfus ?? false,
      generateForecastForDiscontinuedMaterials: general.generateForecastForDiscontinuedMaterials ?? false,
      materialAggregationType: normalizeAggregation(general.materialAggregationType),
      locationAggregationType: normalizeAggregation(general.locationAggregationType),
      daysSalesHistory: parseNullableNumber(general.daysSalesHistory)
        ?? defaults.demandPlanningGeneralParameters.daysSalesHistory,
    },
    demandPlanningForecastParameters: {
      statisticalModel: normalizeStatisticalModel(forecast.statisticalModel),
      daysMovingAverageModel: parseNullableNumber(forecast.daysMovingAverageModel)
        ?? defaults.demandPlanningForecastParameters.daysMovingAverageModel,
      splitModel: normalizeSplitModel(forecast.splitModel),
      daysTopDownSplit: parseNullableNumber(forecast.daysTopDownSplit)
        ?? defaults.demandPlanningForecastParameters.daysTopDownSplit,
      alpha: parseNullableNumber(forecast.alpha),
      beta: parseNullableNumber(forecast.beta),
      gamma: parseNullableNumber(forecast.gamma),
    },
  };
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPositiveInteger(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function configurationIsValid(): boolean {
  const general = configuration.value.demandPlanningGeneralParameters;
  const forecast = configuration.value.demandPlanningForecastParameters;
  return Boolean(general.uomId)
    && isPositiveInteger(general.daysSalesHistory)
    && isPositiveInteger(forecast.daysMovingAverageModel)
    && isPositiveInteger(forecast.daysTopDownSplit)
    && [forecast.alpha, forecast.beta, forecast.gamma]
      .every((value) => value == null || Number.isFinite(Number(value)));
}

function buildConfigurationPayload(): DemandClusterLevelConfiguration {
  return normalizeConfiguration(configuration.value, {
    executionProfileId: selectedExecutionProfileId.value,
    locationClusterId: selectedLocationClusterId.value,
    productClusterId: selectedProductClusterId.value,
    defaultUomId: selectedExecutionProfile.value?.defaultDemandPlanningUomId ?? uomIds.value[0] ?? '',
  });
}

function simulationMaterialId(row: SimulatedDemandPlanMaterialLocationDto): string {
  return row.materialId ?? row.productId ?? '-';
}

function numberAt(values: number[] | undefined, index: number): number {
  const value = Number(values?.[index] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function findLastMeaningfulIndex(values: number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== 0) return index;
  }
  return -1;
}

function hasVisibleValues(values: Array<number | null>): boolean {
  return values.some((value) => value != null && value !== 0);
}

/** Keeps a historical series empty after the last period with observed sales. */
function hideSalesAfterHistory(values: number[]): Array<number | null> {

  return values.map((value, index) => index <= lastHistoricalSalesIndex.value ? value : null);

}

/** Shows baseline only from the forecast boundary and suppresses zero placeholders. */
function showForecastOnly(values: number[]): Array<number | null> {

  return values.map((value, index) => index >= forecastStartIndex.value && value !== 0 ? value : null);

}

/** STL is calculated over observed history, never over forecast periods. */
function showHistoricalStlOnly(values: number[]): Array<number | null> {

  return values.map((value, index) => index < forecastStartIndex.value ? value : null);

}

function hasMeaningfulDifference(values: Array<number | null>, baseline: Array<number | null>): boolean {

  return values.some((value, index) => value != null && Math.abs(value - (baseline[index] ?? 0)) > 0.0001);

}

function createLineSeries(
  name: string,
  values: Array<number | null>,
  color: string,
  options: { dashed?: boolean; opacity?: number; width?: number; z?: number } = {},
) {

  return {
    name,
    type: 'line',
    smooth: false,
    symbol: 'circle',
    symbolSize: 5,
    showSymbol: false,
    connectNulls: false,
    data: values,
    lineStyle: {
      width: options.width ?? 2,
      color,
      type: options.dashed ? 'dashed' : 'solid',
      opacity: options.opacity ?? 1,
    },
    itemStyle: { color },
    emphasis: {
      focus: 'series',
      lineStyle: { width: (options.width ?? 2) + 1 },
    },
    z: options.z ?? 2,
  };

}

function buildPreviewLineSeries() {

  const historicalSales = hideSalesAfterHistory(aggregatedHistoricalSales.value);
  const baselineForecast = showForecastOnly(aggregatedBaselineForecast.value);
  const rows: SimulationPreviewSeriesRow[] = filteredSimulationRows.value;
  const smoothedHistoricalSales = hideSalesAfterHistory(aggregateSeries(rows, 'cleansedHistoricalSales'));
  const trend = aggregateSeries(rows, 'trend');
  const seasonal = aggregateSeries(rows, 'seasonal');
  const historicalStlTrend = showHistoricalStlOnly(aggregateSeries(rows, 'stlTrend'));

  return [
    createLineSeries('Historical Sales', historicalSales, '#0d8ecf', { width: 2.6, z: 6 }),
    ...(hasVisibleValues(smoothedHistoricalSales)
      && hasMeaningfulDifference(smoothedHistoricalSales, historicalSales)
      ? [createLineSeries('Smoothed Historical Sales', smoothedHistoricalSales, '#5b6cff', { width: 2.2, z: 5 })]
      : []),
    createLineSeries('Baseline Forecast', baselineForecast, '#ff6f61', { width: 2.8, z: 7 }),
    ...(hasVisibleValues(historicalStlTrend)
      ? [createLineSeries('Historical STL Trend', historicalStlTrend, '#24bfa9', { width: 2.2, z: 4 })]
      : []),
    ...(hasVisibleValues(trend)
      ? [createLineSeries('Forecast Model Trend', trend, '#6f7f99', { dashed: true, width: 1.8, z: 3 })]
      : []),
    ...(hasVisibleValues(seasonal)
      ? [createLineSeries('Seasonality', seasonal, '#a9b6ca', { dashed: true, opacity: 0.9, width: 1.6, z: 2 })]
      : []),
  ];

}

function buildSeasonalityChartOption() {

  const currentSimulation = simulation.value;
  if (!currentSimulation?.periodos.length) {
    return {
      title: { text: 'Generate a forecast preview to compare seasonality.', left: 'center', top: 'middle', textStyle: { color: '#64748b', fontSize: 14 } },
    };
  }

  const periodGroups = [...new Set(currentSimulation.agrupadoresPeriodoAgregado ?? [])];
  const seasonalGroups = [...new Set(currentSimulation.agrupadoresPeriodoDesagregado ?? [])];
  if (!periodGroups.length || !seasonalGroups.length) {
    return {
      title: { text: 'The returned calendar does not contain seasonal groupings.', left: 'center', top: 'middle', textStyle: { color: '#64748b', fontSize: 14 } },
    };
  }

  const historicalSales = hideSalesAfterHistory(aggregatedHistoricalSales.value);
  const baselineForecast = showForecastOnly(aggregatedBaselineForecast.value);
  const groupIndex = new Map(seasonalGroups.map((group, index) => [group, index]));
  const seriesByPeriod = new Map<number, { sales: Array<number | null>; forecast: Array<number | null> }>();

  currentSimulation.periodos.forEach((_, index) => {
    const periodGroup = currentSimulation.agrupadoresPeriodoAgregado?.[index];
    const seasonalGroup = currentSimulation.agrupadoresPeriodoDesagregado?.[index];
    const indexInGroup = groupIndex.get(seasonalGroup ?? Number.NaN);
    if (periodGroup == null || indexInGroup == null) return;

    const values = seriesByPeriod.get(periodGroup) ?? {
      sales: new Array<number | null>(seasonalGroups.length).fill(null),
      forecast: new Array<number | null>(seasonalGroups.length).fill(null),
    };
    values.sales[indexInGroup] = historicalSales[index];
    values.forecast[indexInGroup] = baselineForecast[index];
    seriesByPeriod.set(periodGroup, values);
  });

  const historicalColors = ['#0d8ecf', '#1aa0e3', '#43b4ee', '#6ec8f4', '#97daf9', '#c0ebfd'];
  const forecastColors = ['#ff5f87', '#ff7294', '#ff86a2', '#ff99b1'];
  const series = periodGroups.flatMap((periodGroup, index) => {
    const values = seriesByPeriod.get(periodGroup);
    if (!values) return [];
    return [
      ...(hasVisibleValues(values.sales) ? [{
        name: String(periodGroup), type: 'bar', barMaxWidth: 16,
        itemStyle: { color: historicalColors[index % historicalColors.length], borderRadius: [4, 4, 0, 0] },
        data: values.sales,
      }] : []),
      ...(hasVisibleValues(values.forecast) ? [{
        name: `${periodGroup} - Baseline Forecast`, type: 'bar', barMaxWidth: 16,
        itemStyle: { color: forecastColors[index % forecastColors.length], borderRadius: [4, 4, 0, 0] },
        data: values.forecast,
      }] : []),
    ];
  });

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.10)' } },
      backgroundColor: 'rgba(10,16,29,0.96)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#e9eefb' },
      formatter: (params: unknown) => formatSeasonalityTooltip(params),
    },
    legend: {
      type: 'scroll',
      top: 0,
      left: 'center',
      right: 16,
      textStyle: { color: 'rgba(233,238,251,0.72)' },
      pageTextStyle: { color: 'rgba(233,238,251,0.72)' },
      pageIconColor: '#0d8ecf',
      pageIconInactiveColor: 'rgba(201,213,241,0.54)',
      itemWidth: 12,
      itemHeight: 10,
      itemGap: 14,
    },
    grid: { left: 54, right: 22, top: 54, bottom: 38 },
    xAxis: {
      type: 'category',
      data: seasonalGroups.map(String),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(201,213,241,0.54)', margin: 12 },
    },
    yAxis: {
      type: 'value',
      splitNumber: 5,
      axisLabel: {
        color: 'rgba(201,213,241,0.54)',
        formatter: (value: unknown) => formatQuantity(Number(value ?? 0)),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series,
  };

}

function uniqueSeriesValues(dimension: 'material' | 'location'): string[] {
  const values = (simulation.value?.materialLocationData ?? []).map((row) => (
    dimension === 'material' ? simulationMaterialId(row) : row.locationId ?? '-'
  ));
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function aggregateSeries(
  rows: SimulationPreviewSeriesRow[],
  field: keyof DemandSimulationSeriesRow,
): number[] {
  const periodCount = simulation.value?.periodos.length ?? 0;
  return Array.from({ length: periodCount }, (_, index) => rows.reduce(
    (total, row) => total + numberAt(row[field] as number[] | undefined, index),
    0,
  ));
}

function formatQuantity(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString('en-US', { maximumFractionDigits: 1 })
    : '0';
}

/** Keeps an absent point distinct from a real zero in the shared axis tooltip. */
function formatTooltipQuantity(value: unknown): string {

  if (value == null || value === '' || value === '-') return '—';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? formatQuantity(numericValue) : '—';

}

/** Removes empty seasonal placeholders and keeps operational quantities human-readable. */
function formatSeasonalityTooltip(params: unknown): string {

  if (!Array.isArray(params)) return '';

  const visibleEntries = params
    .filter((entry): entry is {
      seriesName?: string;
      value?: number;
      marker?: string;
      axisValueLabel?: string;
    } => Boolean(entry))
    .map((entry) => ({
      label: entry.seriesName ?? '',
      marker: entry.marker ?? '',
      value: Number(entry.value),
      axisValueLabel: entry.axisValueLabel ?? '',
    }))
    .filter((entry) => Number.isFinite(entry.value) && Math.abs(entry.value) > 0.0001);

  const axisValueLabel = params[0] && typeof params[0] === 'object' && 'axisValueLabel' in params[0]
    ? String(params[0].axisValueLabel ?? '')
    : '';
  if (!visibleEntries.length) return axisValueLabel;

  return [
    axisValueLabel,
    ...visibleEntries.map((entry) => `${entry.marker}${entry.label} <strong>${formatQuantity(entry.value)}</strong>`),
  ].join('<br/>');

}

function formatPercent(value: number | null): string {
  return value == null ? 'No Sales Reference' : `${(value * 100).toFixed(1)}%`;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

watch(
  [selectedExecutionProfileId, selectedLocationClusterId, selectedProductClusterId],
  async () => {
    simulation.value = null;
    selectedMaterial.value = CLUSTER_LEVEL_VALUE;
    selectedLocation.value = CLUSTER_LEVEL_VALUE;
    forecastLag.value = '0';
    feedback.value = '';

    if (!canLoadConfiguration.value) {
      configuration.value = createEmptyConfiguration({
        executionProfileId: selectedExecutionProfileId.value,
        locationClusterId: selectedLocationClusterId.value,
        productClusterId: selectedProductClusterId.value,
        defaultUomId: selectedExecutionProfile.value?.defaultDemandPlanningUomId ?? uomIds.value[0] ?? '',
      });
      return;
    }

    await loadConfiguration();
  },
);

async function bootstrapPage(): Promise<void> {
  isBootstrapping.value = true;
  failure.value = '';

  try {
    const [profiles, locations, products, units] = await Promise.all([
      fetchDemandExecutionProfiles(),
      fetchDemandLocationClusters(),
      fetchDemandProductClusters(),
      fetchUomIds(),
    ]);
    executionProfiles.value = [...profiles].sort((left, right) => left.id.localeCompare(right.id));
    locationClusters.value = [...locations].sort((left, right) => String(left.description ?? left.id).localeCompare(String(right.description ?? right.id)));
    productClusters.value = [...products].sort((left, right) => String(left.description ?? left.descricao ?? left.id).localeCompare(String(right.description ?? right.descricao ?? right.id)));
    uomIds.value = [...units].sort((left, right) => left.localeCompare(right));
  } catch (error) {
    failure.value = toErrorMessage(error, 'Unable to load the selector catalogs.');
  } finally {
    isBootstrapping.value = false;
  }
}

async function loadConfiguration(): Promise<void> {
  if (!canLoadConfiguration.value) return;
  isLoadingConfiguration.value = true;
  failure.value = '';

  try {
    const loaded = await fetchClusterLevelConfiguration(
      selectedExecutionProfileId.value,
      selectedLocationClusterId.value,
      selectedProductClusterId.value,
    );
    configuration.value = normalizeConfiguration(loaded, {
      executionProfileId: selectedExecutionProfileId.value,
      locationClusterId: selectedLocationClusterId.value,
      productClusterId: selectedProductClusterId.value,
      defaultUomId: selectedExecutionProfile.value?.defaultDemandPlanningUomId ?? uomIds.value[0] ?? '',
    });
  } catch (error) {
    failure.value = toErrorMessage(error, 'Unable to load the saved parameters.');
  } finally {
    isLoadingConfiguration.value = false;
  }
}

async function saveConfiguration(): Promise<void> {
  if (!canLoadConfiguration.value || !configurationIsValid()) {
    failure.value = 'UOM and positive historical windows are required before saving.';
    return;
  }

  isSavingConfiguration.value = true;
  failure.value = '';
  feedback.value = '';
  try {
    await saveClusterLevelConfiguration(buildConfigurationPayload());
    feedback.value = 'The cluster-level parameters were saved successfully.';
  } catch (error) {
    failure.value = toErrorMessage(error, 'Unable to save the parameters.');
  } finally {
    isSavingConfiguration.value = false;
  }
}

async function generateForecastPreview(): Promise<void> {
  if (!canLoadConfiguration.value || !executeDemandPlanEnabled.value || !configurationIsValid()) {
    failure.value = 'Complete the Community parameters before generating the forecast preview.';
    return;
  }

  isRunningSimulation.value = true;
  simulation.value = null;
  failure.value = '';
  feedback.value = '';
  try {
    simulation.value = await simulateClusterLevelConfiguration(buildConfigurationPayload(), referenceDate.value);
    selectedMaterial.value = CLUSTER_LEVEL_VALUE;
    selectedLocation.value = CLUSTER_LEVEL_VALUE;
    forecastLag.value = '0';
    feedback.value = `Forecast preview generated for ${simulation.value.materialLocationData?.length ?? 0} material-location series.`;
  } catch (error) {
    failure.value = toErrorMessage(error, 'Unable to generate the forecast preview.');
  } finally {
    isRunningSimulation.value = false;
  }
}

onMounted(() => {
  void bootstrapPage();
});
</script>

<template>
  <DashboardPageLayout class="cluster-level-configuration-page">
    <OfxPageHeader eyebrow="Demand Planning" title="Demand Planning Cluster-Level Configuration">
      <template #actions>
        <button
          class="primary-action"
          type="button"
          :disabled="!canLoadConfiguration || isSavingConfiguration || isLoadingConfiguration"
          @click="saveConfiguration"
        >
          {{ isSavingConfiguration ? 'Saving Parameters…' : 'Save Parameters' }}
        </button>
      </template>
    </OfxPageHeader>

    <p v-if="failure" class="message message-error" role="alert">{{ failure }}</p>
    <p v-if="feedback" class="message message-success" role="status">{{ feedback }}</p>

    <div class="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <OfxSectionCard title="Execution Profile Selection">
        <div class="grid gap-4">
          <OfxSelectField
            v-model="selectedExecutionProfileId"
            label="Execution Profile"
            :options="executionProfileOptions"
            :loading="isBootstrapping"
            loading-label="Loading execution profiles…"
          />
          <div class="grid gap-3 md:grid-cols-2">
            <div class="ofx-detail-panel">
              <div class="detail-label">Bucket Size</div>
              <div class="detail-value">{{ selectedExecutionProfile?.bucketSize ?? 'Select a profile' }}</div>
            </div>
            <div class="ofx-detail-panel">
              <div class="detail-label">Default Auto-Fit</div>
              <div class="detail-value">Not linked</div>
            </div>
          </div>
        </div>
      </OfxSectionCard>

      <OfxSectionCard title="Cluster Selection">
        <div class="grid gap-4 md:grid-cols-2">
          <OfxSelectField
            v-model="selectedLocationClusterId"
            label="Location Cluster"
            :options="locationClusterOptions"
            :loading="isBootstrapping"
            loading-label="Loading location clusters…"
          />
          <OfxSelectField
            v-model="selectedProductClusterId"
            label="Product Cluster"
            :options="productClusterOptions"
            :loading="isBootstrapping"
            loading-label="Loading product clusters…"
          />
        </div>
        <div v-if="canLoadConfiguration" class="mt-4 grid gap-3 md:grid-cols-2">
          <OfxToggleField
            v-model="configuration.demandPlanningGeneralParameters.executeDemandPlan"
            label="Execute Demand Plan"
          />
          <OfxToggleField
            :model-value="false"
            label="Use Auto-fitted Model"
            locked
            locked-label="Pro / Enterprise"
          />
        </div>
      </OfxSectionCard>
    </div>

    <OfxLoadingState v-if="isLoadingConfiguration" label="Loading the saved cluster-level parameters…" />

    <template v-else-if="canLoadConfiguration">
      <div class="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <OfxSectionCard
          title="Outlier Smoothing"
          description="Historical cleansing stays visible in the canonical position; advanced treatments require Pro / Enterprise."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField
              model-value="Inactive"
              label="Outlier Smoothing Model"
              :options="disabledOutlierOptions"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxTextField
              :model-value="365"
              label="Days for Outlier Smoothing"
              type="number"
              locked
              locked-label="Pro / Enterprise"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          title="Forecast Split"
          description="Community always splits directly to material/location with Historical Sales. Only this historical window is configurable."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField
              v-model="configuration.demandPlanningForecastParameters.splitModel"
              label="Split Model"
              :options="splitModelOptions"
              locked
              locked-label="Historical Sales"
              locked-tone="neutral"
              help-tooltip="Community uses one fixed top-down split from the aggregate forecast directly to material/location."
            />
            <OfxTextField
              v-model="configuration.demandPlanningForecastParameters.daysTopDownSplit"
              label="Days for Top-Down Split"
              type="number"
              help-text="Number of historical days used to calculate the direct DFU proportion."
            />
          </div>
        </OfxSectionCard>
      </div>

      <OfxSectionCard
        title="Forecast Model Parametrization"
        description="Choose and manually configure one of the statistical models available in Community."
      >
        <div class="grid gap-4 xl:grid-cols-4">
          <OfxSelectField
            v-model="configuration.demandPlanningForecastParameters.statisticalModel"
            label="Forecast Model"
            :options="statisticalModelOptions"
          />
          <OfxSelectField
            model-value="No Uplift Calculation"
            label="Event Uplift"
            :options="disabledUpliftOptions"
            locked
            locked-label="Pro / Enterprise"
          />
          <OfxSelectField
            v-model="configuration.demandPlanningGeneralParameters.materialAggregationType"
            label="Product Aggregation"
            :options="aggregationOptions"
            locked
            locked-label="Pro / Enterprise"
          />
          <OfxSelectField
            v-model="configuration.demandPlanningGeneralParameters.locationAggregationType"
            label="Location Aggregation"
            :options="aggregationOptions"
            locked
            locked-label="Pro / Enterprise"
          />
          <OfxSelectField
            v-model="configuration.demandPlanningGeneralParameters.uomId"
            label="Unit of Measure"
            :options="uomOptions"
          />
          <OfxTextField
            v-if="showMovingAverageWindow"
            v-model="configuration.demandPlanningForecastParameters.daysMovingAverageModel"
            label="Moving Average Days"
            type="number"
          />
          <OfxSelectField
            model-value="Disabled"
            label="Stockout Treatment"
            :options="disabledStockoutOptions"
            locked
            locked-label="Pro / Enterprise"
          />
        </div>

        <div v-if="showAlpha" class="mt-4 grid gap-4" :class="showBetaGamma ? 'md:grid-cols-3' : 'md:grid-cols-1'">
          <div class="statistical-parameter-card">
            <div class="text-sm font-semibold text-[color:var(--ofx-text)]">Alpha</div>
            <p class="parameter-description">Smooths the level update for Exponential Smoothing and Holt-Winters.</p>
            <OfxToggleField v-model="autoAlpha" label="Automatic selection" />
            <div v-if="!autoAlpha" class="parameter-slider">
              <input v-model.number="configuration.demandPlanningForecastParameters.alpha" type="range" min="0" max="1" step="0.01" class="ofx-range">
              <output>{{ Number(configuration.demandPlanningForecastParameters.alpha ?? 0).toFixed(2) }}</output>
            </div>
          </div>
          <div v-if="showBetaGamma" class="statistical-parameter-card">
            <div class="text-sm font-semibold text-[color:var(--ofx-text)]">Beta</div>
            <p class="parameter-description">Controls trend adaptation for Holt-Winters.</p>
            <OfxToggleField v-model="autoBeta" label="Automatic selection" />
            <div v-if="!autoBeta" class="parameter-slider">
              <input v-model.number="configuration.demandPlanningForecastParameters.beta" type="range" min="0" max="1" step="0.01" class="ofx-range">
              <output>{{ Number(configuration.demandPlanningForecastParameters.beta ?? 0).toFixed(2) }}</output>
            </div>
          </div>
          <div v-if="showBetaGamma" class="statistical-parameter-card">
            <div class="text-sm font-semibold text-[color:var(--ofx-text)]">Gamma</div>
            <p class="parameter-description">Tunes the seasonal update for Holt-Winters.</p>
            <OfxToggleField v-model="autoGamma" label="Automatic selection" />
            <div v-if="!autoGamma" class="parameter-slider">
              <input v-model.number="configuration.demandPlanningForecastParameters.gamma" type="range" min="0" max="1" step="0.01" class="ofx-range">
              <output>{{ Number(configuration.demandPlanningForecastParameters.gamma ?? 0).toFixed(2) }}</output>
            </div>
          </div>
        </div>

        <p v-if="statisticalModel === 'ARIMA'" class="model-note">
          ARIMA runs without Enterprise support regressors in Community.
        </p>

        <div v-if="statisticalModel === 'ARIMA'" class="mt-4">
          <OfxSelectField
            model-value="None"
            label="Support Regressors"
            :options="disabledRegressorOptions"
            locked
            locked-label="Pro / Enterprise"
          />
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
          <OfxToggleField
            :model-value="false"
            label="Round to sales UOM"
            locked
            locked-label="Pro / Enterprise"
          />
        </div>
      </OfxSectionCard>

      <div class="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <OfxSectionCard
          title="Sales History and Coverage"
          description="Configure the historical window and which DFUs remain eligible for statistical forecasting."
        >
          <div class="grid gap-4">
            <OfxTextField
              v-model="configuration.demandPlanningGeneralParameters.daysSalesHistory"
              label="Days of Historical Sales"
              type="number"
            />
            <OfxToggleField
              v-model="configuration.demandPlanningGeneralParameters.considerHistoricalSalesOfInactiveDfus"
              label="Consider historical sales of inactive DFUs"
            />
            <OfxToggleField
              v-model="configuration.demandPlanningGeneralParameters.generateForecastForDiscontinuedMaterials"
              label="Generate forecast for out-of-line products"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Simulation Parameters">
          <div class="grid gap-4">
            <OfxPeriodPicker
              v-model="referenceDate"
              label="Reference Period"
              :bucket-size="selectedExecutionProfile?.bucketSize"
            />
            <button
              type="button"
              class="primary-action"
              :disabled="!executeDemandPlanEnabled || isRunningSimulation"
              @click="generateForecastPreview"
            >
              {{ isRunningSimulation ? 'Generating Forecast Preview…' : 'Generate Forecast Preview' }}
            </button>
          </div>
        </OfxSectionCard>
      </div>

      <OfxLoadingState
        v-if="isRunningSimulation"
        label="Running the Community statistical forecast and preparing the preview…"
      />

      <template v-else-if="simulation">
        <OfxSectionCard
          title="Forecast Accuracy"
          description="Choose the lag used for error evaluation. KPI cards, charts, and tables update using the same simulated backend payload."
        >
          <div class="grid gap-3 xl:grid-cols-[248px_1fr]">
            <OfxSelectField
              v-model="forecastLag"
              label="Forecast Lag (# periods) for Error Calculation"
              :options="forecastLagOptions"
            />
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OfxKpiCard
                v-for="card in previewMetricCards"
                :key="card.label"
                :label="card.label"
                :value="card.value"
                :tone="card.tone"
              />
            </div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          title="Detailed View Filters"
          description="Filter the returned cluster simulation locally; no additional backend calculation is triggered."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField v-model="selectedMaterial" label="Material Filter" :options="materialFilterOptions" />
            <OfxSelectField v-model="selectedLocation" label="Location Filter" :options="locationFilterOptions" />
          </div>
        </OfxSectionCard>

        <div class="grid gap-5 xl:grid-cols-2">
          <OfxSectionCard title="Forecast Preview">
            <EChartAdapter :option="previewChartOption" :height="360" />
          </OfxSectionCard>
          <OfxSectionCard title="Seasonality Comparison">
            <EChartAdapter :option="seasonalityChartOption" :height="360" />
          </OfxSectionCard>
        </div>

        <OfxSectionCard :title="`Aggregated Error at Lag ${forecastLag}`">
          <OfxDataTable
            :rows="aggregatedErrorRows"
            :columns="aggregatedColumns"
            row-key="rowKey"
            :page-size="10"
            :height="220"
            export-base-name="community-cluster-level-forecast-error"
          />
        </OfxSectionCard>

        <OfxSectionCard :title="`Material / Location Error at ${forecastLagOptions.find((option) => option.value === forecastLag)?.label ?? 'Lag 0'}`">
          <OfxDataTable
            :rows="materialLocationErrorRows"
            :columns="materialLocationColumns"
            row-key="rowKey"
            :page-size="12"
            :height="420"
            export-base-name="community-cluster-level-material-location-error"
          />
        </OfxSectionCard>
      </template>

      <OfxEmptyState
        v-else-if="executeDemandPlanEnabled"
        title="Generate a forecast preview"
        description="The cluster-level configuration is loaded. Use Generate Forecast Preview to inspect the statistical result before saving or executing a Demand Plan."
      />
    </template>

    <OfxEmptyState
      v-else
      title="Choose profile and clusters to start"
      description="Select a Demand Planning execution profile, a location cluster, and a product cluster to load the saved cluster-level parameters."
    />
  </DashboardPageLayout>
</template>

<style scoped>
.cluster-level-configuration-page {
  position: relative;
}

.primary-action {
  min-height: 2.75rem;
  border: 1px solid var(--ofx-primary);
  border-radius: 12px;
  background: var(--ofx-primary);
  color: var(--ofx-primary-foreground);
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition: 160ms ease;
}

.primary-action:disabled {
  cursor: not-allowed;
  border-color: var(--ofx-border-strong);
  background: var(--ofx-surface-strong);
  color: var(--ofx-text-muted);
}

.ofx-detail-panel {
  border: 1px solid var(--ofx-border);
  border-radius: 14px;
  background: var(--ofx-surface);
  box-shadow: var(--ofx-shadow-sm);
  padding: 0.95rem 1rem;
}

.detail-label {
  color: var(--ofx-text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.detail-value {
  margin-top: 0.4rem;
  color: var(--ofx-text);
  font-size: 1rem;
  font-weight: 700;
}

.message {
  border: 1px solid;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  font-size: 0.875rem;
}

.message-error {
  border-color: rgb(248 113 113 / 0.55);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.message-success {
  border-color: rgb(52 211 153 / 0.55);
  background: rgb(236 253 245);
  color: rgb(6 95 70);
}

.model-note {
  margin-top: 1rem;
  color: var(--ofx-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.statistical-parameter-card {
  border: 1px solid var(--ofx-border);
  border-radius: 14px;
  background: var(--ofx-surface);
  box-shadow: var(--ofx-shadow-sm);
  padding: 1rem;
}

.parameter-description {
  min-height: 2.5rem;
  margin: 0.3rem 0 0.9rem;
  color: var(--ofx-text-muted);
  font-size: 0.78rem;
  line-height: 1.35;
}

.parameter-slider {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.95rem;
}

.ofx-range {
  width: 100%;
  accent-color: var(--ofx-primary);
}

.parameter-slider output {
  color: var(--ofx-text);
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
