<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { OfxButton, OfxEntityMultiSelect, OfxKpiCard } from '@opsfactor/front-shell';
import OfxPivotTable from '@/components/ofx/data-display/OfxPivotTable.vue';
import { OfxLoadingState } from '@opsfactor/front-shell';
import { OfxEmptyState } from '@opsfactor/front-shell';
import OfxMaterialCharacteristicsFilter from '@/components/ofx/data-operations/filters/OfxMaterialCharacteristicsFilter.vue';
import OfxLocationCharacteristicsFilter from '@/components/ofx/data-operations/filters/OfxLocationCharacteristicsFilter.vue';
import OfxOperationFilters from '@/components/ofx/data-operations/OfxOperationFilters.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import MaterialLocationScopeFilters from '@/features/material-location-scope/MaterialLocationScopeFilters.vue';
import {
  createEmptyMaterialLocationScope,
  type MaterialLocationScope,
  type MaterialLocationScopeCatalog,
} from '@/features/material-location-scope/material-location-scope.types';
import { loadCommunityMaterialLocationFilterCatalog } from '@/services/community-option-catalog.service';
import { OfxPageHeader } from '@opsfactor/front-shell';
import { OfxSectionCard } from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import type { OfxSelectOption } from '@/types/ui';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import {
  fetchDemandPlanAndSalesHistory,
  fetchDemandPlanPeriodOptions,
  fetchDemandPlanVersions,
  type DemandPlanPeriodOptionDto,
  fetchUomIds,
  type DemandPlanSalesHistoryResponse,
  type DemandPlanVersionOptionDto,
} from '@/modules/demand-planning/services/sales-demand-overview.service';

type StandardSeries = 'Sales' | 'Demand Plan';
type MetricId = 'quantity';
type FilterGroup = 'material' | 'location';

type NormalizedOverviewRow = {
  series: StandardSeries;
  periodRaw: string;
  periodLabel: string;
  quantity: number;
  gross: number;
  net: number;
  dimensions: Record<string, string>;
};

type LocalFilterDefinition = {
  key: string;
  label: string;
  group: FilterGroup;
  options: OfxSelectOption[];
};

type SeriesValueBundle = {
  sales: number[];
  demandPlan: number[];
};

/**
 * The June Community boundary admits only the Sell-out transactional family.
 * Keep the legacy workspace itself intact, but never offer Enterprise sales
 * sources as a selectable client-side request.
 */
const COMMUNITY_FIXED_HISTORY_OPTIONS = [
  { label: 'Sell-out', value: 'Sell-out' },
];

/**
 * The Community response is physically detailed by material and location.
 * Aggregation remains a local visualization choice rather than a private
 * request contract.
 */
const COMMUNITY_DETAIL_LEVEL_OPTIONS = [
  { label: 'Detailed by material and location', value: 'dfu' },
];

const isBootstrapping = ref(true);
const isLoadingOverview = ref(false);
const loadError = ref<string | null>(null);
const workspaceError = ref<string | null>(null);
const report = ref<DemandPlanSalesHistoryResponse | null>(null);
const selectionCollapsed = ref(false);

const demandPlanVersions = ref<DemandPlanVersionOptionDto[]>([]);
const uomIds = ref<string[]>([]);
const materialLocationCatalog = ref<MaterialLocationScopeCatalog>({
  materials: [],
  locations: [],
  materialCharacteristics: [],
  locationCharacteristics: [],
});
const initialScope = ref<MaterialLocationScope>(createEmptyMaterialLocationScope());
const selectedDemandPlanId = ref('');
const selectedHistoricalSalesType = ref<'Sell-out' | ''>('');
const selectedUomId = ref('');
const selectedHistoricalPeriods = ref('12');
const demandPlanPeriods = ref<DemandPlanPeriodOptionDto[]>([]);
const selectedDemandPlanPeriodReferenceDates = ref<string[]>([]);
const selectedMetricId = ref<MetricId>('quantity');

const localFilterValues = reactive<Record<string, string[]>>({});

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initializeSelectionMap(target: Record<string, string[]>, keys: string[]) {
  Object.keys(target).forEach((key) => {
    if (!keys.includes(key)) {
      delete target[key];
    }
  });

  keys.forEach((key) => {
    target[key] = target[key] ?? [];
  });
}

function inferPeriodGranularity(periods: string[]) {
  if (periods.length < 2) return 'month';

  const first = new Date(periods[0]);
  const second = new Date(periods[1]);

  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return 'month';

  const diffInDays = Math.abs(second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
  if (diffInDays >= 27) return 'month';
  if (diffInDays >= 6) return 'week';
  return 'day';
}

function formatPeriodLabel(value: string, granularity: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  if (granularity === 'month') {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(parsedDate);
  }

  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(parsedDate);
}

function mapSeriesName(value: unknown): StandardSeries | null {
  const normalizedValue = String(value ?? '');
  if (normalizedValue === 'Sales') return 'Sales';
  if (normalizedValue === 'Unconstrained Plan' || normalizedValue === 'Demand Plan') return 'Demand Plan';
  return null;
}

function formatNumber(value: number, maxFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatMetricValue(value: number, _metricId: MetricId) {
  return formatNumber(value, 0);
}

function toPivotPeriodValue(value: string) {
  return value;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferFilterGroup(key: string): FilterGroup {
  return key === 'locationId'
    || materialLocationCatalog.value.locationCharacteristics.some(
      (characteristic) => characteristic.caracteristicaId === key,
    )
    ? 'location'
    : 'material';
}

function getFilterLabel(key: string) {
  if (key === 'locationId') return 'Location';
  if (key === 'materialId') return 'Material';

  const materialCharacteristic = materialLocationCatalog.value.materialCharacteristics
    .find((characteristic) => characteristic.caracteristicaId === key);
  if (materialCharacteristic) return materialCharacteristic.descricao;

  const locationCharacteristic = materialLocationCatalog.value.locationCharacteristics
    .find((characteristic) => characteristic.caracteristicaId === key);
  if (locationCharacteristic) return locationCharacteristic.descricao;

  return key;
}

function getMetricValue(row: NormalizedOverviewRow, metricId: MetricId) {

  return row.quantity;
}

function buildSeriesValues(rows: NormalizedOverviewRow[], periods: string[], metricId: MetricId): SeriesValueBundle {
  const periodIndex = new Map(periods.map((period, index) => [period, index]));
  const sales = new Array(periods.length).fill(0);
  const demandPlan = new Array(periods.length).fill(0);

  rows.forEach((row) => {
    const index = periodIndex.get(row.periodRaw);
    if (index === undefined) return;

    if (row.series === 'Sales') {
      sales[index] += getMetricValue(row, metricId);
      return;
    }

    demandPlan[index] += getMetricValue(row, metricId);
  });

  return { sales, demandPlan };
}

function computeEffectiveAverage(values: number[]) {
  const firstIndex = values.findIndex((value) => value !== 0);
  if (firstIndex === -1) return 0;

  let lastIndex = -1;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== 0) {
      lastIndex = index;
      break;
    }
  }

  if (lastIndex === -1 || lastIndex < firstIndex) return 0;

  const slice = values.slice(firstIndex, lastIndex + 1);
  const total = slice.reduce((sum, value) => sum + value, 0);
  return total / slice.length;
}

const demandPlanOptions = computed(() => [
  { label: 'Only show historical sales', value: '' },
  ...demandPlanVersions.value.map((plan) => ({
    label: `${plan.id} - ${plan.periodoReferencia ?? 'No period'} - ${plan.descricao}`,
    value: String(plan.id),
  })),
]);

const historicalSalesTypeOptions = computed(() => [
  {
    label: selectedDemandPlanId.value
      ? 'Inferred from the selected demand plan'
      : 'Select a historical sales type',
    value: '',
  },
  ...COMMUNITY_FIXED_HISTORY_OPTIONS,
]);

const uomOptions = computed(() => [
  { label: 'Select a unit of measure', value: '' },
  ...uomIds.value.map((uomId) => ({
    label: uomId,
    value: uomId,
  })),
]);

const demandPlanPeriodOptions = computed<OfxSelectOption[]>(() =>
  demandPlanPeriods.value.map((period) => ({
    value: period.referenceDate,
    label: period.label,
  })),
);

const metricOptions = computed(() => [{
  label: selectedUomId.value ? `Quantity (${selectedUomId.value})` : 'Quantity',
  value: 'quantity',
}]);

const selectedMetricMeta = computed(() =>
  metricOptions.value.find((option) => option.value === selectedMetricId.value) ?? metricOptions.value[0],
);

const hasDemandPlanContext = computed(() => Boolean(selectedDemandPlanId.value));

const selectedDemandPlanMeta = computed(() =>
  demandPlanVersions.value.find((plan) => String(plan.id) === selectedDemandPlanId.value),
);

const pivotTemporalBucketSize = computed(() => selectedDemandPlanMeta.value?.bucketSize ?? 'Monthly');

const canOpenOverview = computed(() =>
  Boolean(selectedUomId.value && (selectedDemandPlanId.value || selectedHistoricalSalesType.value)),
);

const compactSelectionSummary = computed(() => [
  selectedDemandPlanMeta.value
    ? `${selectedDemandPlanMeta.value.id} - ${selectedDemandPlanMeta.value.descricao}`
    : 'Historical sales only',
  selectedUomId.value || 'No UOM',
  'Material/location detail',
  `${selectedHistoricalPeriods.value || '12'} periods`,
  selectedDemandPlanId.value
    ? selectedDemandPlanPeriodReferenceDates.value.length
      ? `${selectedDemandPlanPeriodReferenceDates.value.length} plan periods`
      : 'All plan periods'
    : null,
].filter((item): item is string => Boolean(item)));

const periodGranularity = computed(() => inferPeriodGranularity(report.value?.periods ?? []));

const periodLabels = computed(() =>
  (report.value?.periods ?? []).map((period) => formatPeriodLabel(period, periodGranularity.value)),
);

const normalizedRows = computed<NormalizedOverviewRow[]>(() => {
  const rows = report.value?.data ?? [];
  const granularity = periodGranularity.value;

  return rows.flatMap((row) => {
    const series = mapSeriesName(row.series);
    if (!series) return [];

    const dimensions = Object.fromEntries(
      Object.entries(row)
        .filter(([key, value]) => ![
          'series',
          'date',
          'quantity',
          'gross',
          'net',
          'cogs',
          'margin',
          'valuesByMaterialCharacteristicId',
          'valuesByLocationCharacteristicId',
        ].includes(key) && value !== null && value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)]),
    );

    Object.entries(row.valuesByMaterialCharacteristicId ?? {}).forEach(([key, value]) => {
      if (value) dimensions[key] = value;
    });
    Object.entries(row.valuesByLocationCharacteristicId ?? {}).forEach(([key, value]) => {
      if (value) dimensions[key] = value;
    });

    const periodRaw = String(row.date ?? '');

    return [{
      series,
      periodRaw,
      periodLabel: formatPeriodLabel(periodRaw, granularity),
      quantity: toNumber(row.quantity),
      gross: toNumber(row.gross),
      net: toNumber(row.net),
      dimensions,
    }];
  });
});

const pivotDimensionKeys = computed(() => {
  const keys = new Set<string>();

  normalizedRows.value.forEach((row) => {
    Object.keys(row.dimensions).forEach((key) => {
      keys.add(key);
    });
  });

  return Array.from(keys).sort((left, right) => {
    const leftRank = left === 'locationId' ? 0 : left === 'materialId' ? 1 : 2;
    const rightRank = right === 'locationId' ? 0 : right === 'materialId' ? 1 : 2;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
});

const localFilterDefinitions = computed<LocalFilterDefinition[]>(() =>
  pivotDimensionKeys.value
    .map((key) => {
      const values = Array.from(
        new Set(
          normalizedRows.value
            .map((row) => row.dimensions[key])
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right));

      return {
        key,
        label: getFilterLabel(key),
        group: inferFilterGroup(key),
        options: values.map((value) => ({
          label: value,
          value,
        })),
      };
    })
    .filter((definition) => definition.options.length > 0),
);

const materialEntityLocalFilters = computed(() =>
  localFilterDefinitions.value.filter((definition) => definition.key === 'materialId'),
);

const locationEntityLocalFilters = computed(() =>
  localFilterDefinitions.value.filter((definition) => definition.key === 'locationId'),
);

const materialCharacteristicLocalFilters = computed(() =>
  localFilterDefinitions.value.filter((definition) =>
    definition.key !== 'materialId' && definition.group === 'material'),
);

const locationCharacteristicLocalFilters = computed(() =>
  localFilterDefinitions.value.filter((definition) =>
    definition.key !== 'locationId' && definition.group === 'location'),
);

const hasActiveLocalFilters = computed(() =>
  Object.values(localFilterValues).some((values) => values.length > 0),
);

watch(
  localFilterDefinitions,
  (definitions) => {
    initializeSelectionMap(localFilterValues, definitions.map((definition) => definition.key));
  },
  { immediate: true },
);

/**
 * A period selection is meaningful only for the current Demand Plan. The
 * request token prevents a slow previous response from repopulating options
 * after the user switches plans.
 */
let demandPlanPeriodRequestToken = 0;
watch(selectedDemandPlanId, async (demandPlanId) => {
  selectedDemandPlanPeriodReferenceDates.value = [];
  demandPlanPeriods.value = [];
  const currentRequestToken = ++demandPlanPeriodRequestToken;
  if (!demandPlanId) return;

  try {
    const periods = await fetchDemandPlanPeriodOptions(demandPlanId);
    if (currentRequestToken === demandPlanPeriodRequestToken) {
      demandPlanPeriods.value = periods;
    }
  } catch {
    if (currentRequestToken === demandPlanPeriodRequestToken) {
      workspaceError.value = 'The selected Demand Plan periods could not be loaded.';
    }
  }
});

const filteredRows = computed(() =>
  normalizedRows.value.filter((row) =>
    localFilterDefinitions.value.every((definition) => {
      const selectedValues = localFilterValues[definition.key] ?? [];
      if (!selectedValues.length) return true;
      return selectedValues.includes(row.dimensions[definition.key] ?? '');
    }),
  ),
);

const quantitySeriesValues = computed(() =>
  buildSeriesValues(filteredRows.value, report.value?.periods ?? [], 'quantity'),
);

const activeSeriesValues = computed(() =>
  buildSeriesValues(filteredRows.value, report.value?.periods ?? [], selectedMetricId.value),
);

const visibleChartSeries = computed(() => {
  const series = [
    {
      name: 'Sales',
      color: '#58a6ff',
      data: activeSeriesValues.value.sales.map((value) => (value === 0 ? null : value)),
    },
  ];

  if (hasDemandPlanContext.value) {
    series.push({
      name: 'Demand Plan',
      color: '#ff8f6b',
      data: activeSeriesValues.value.demandPlan.map((value) => (value === 0 ? null : value)),
    });
  }

  return series;
});

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(10,16,29,0.96)',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: '#e9eefb' },
    valueFormatter: (value: unknown) => formatMetricValue(toNumber(value), selectedMetricId.value),
  },
  legend: {
    top: 0,
    textStyle: { color: 'rgba(233,238,251,0.72)' },
    itemWidth: 12,
    itemHeight: 12,
  },
  grid: { top: 42, left: 42, right: 18, bottom: 28 },
  xAxis: {
    type: 'category',
    data: periodLabels.value,
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    axisLabel: { color: 'rgba(201,213,241,0.54)' },
  },
  yAxis: {
    type: 'value',
    name: selectedMetricMeta.value?.label ?? 'Value',
    axisLabel: {
      color: 'rgba(201,213,241,0.54)',
      formatter: (value: unknown) => formatMetricValue(toNumber(value), selectedMetricId.value),
    },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
  },
  series: visibleChartSeries.value.map((series) => ({
    name: series.name,
    type: 'line',
    smooth: true,
    symbolSize: 7,
    connectNulls: false,
    data: series.data,
    lineStyle: { color: series.color, width: 3 },
    itemStyle: { color: series.color },
    areaStyle: { color: series.name === 'Sales' ? 'rgba(88,166,255,0.12)' : 'rgba(255,143,107,0.12)' },
  })),
}));

const pivotMeasureField = computed(() => selectedMetricMeta.value?.label ?? 'Selected Metric');

const pivotRows = computed(() =>
  filteredRows.value.map((row) => {
    const pivotRow: Record<string, unknown> = {
      Series: row.series,
      Period: toPivotPeriodValue(row.periodRaw),
      [pivotMeasureField.value]: getMetricValue(row, selectedMetricId.value),
    };

    pivotDimensionKeys.value.forEach((key) => {
      pivotRow[getFilterLabel(key)] = row.dimensions[key] ?? '—';
    });

    return pivotRow;
  }),
);

const pivotMeasures = computed(() => [
  {
    field: pivotMeasureField.value,
    label: pivotMeasureField.value,
    aggregation: 'sum' as const,
    allowAggregationChange: false,
    allowedAggregations: ['sum' as const],
  },
]);

const pivotBaseName = computed(() =>
  `sales-demand-overview-pivot-v3-${hasDemandPlanContext.value ? 'with-plan' : 'historical-only'}-${selectedUomId.value || 'no-uom'}-${toSlug(pivotMeasureField.value)}`,
);

const kpiSections = computed(() => [
  {
    key: 'quantity',
    cards: [
      {
        key: 'historical-quantity',
        label: selectedUomId.value ? `Historical Sales Avg (${selectedUomId.value})` : 'Historical Sales Avg (Quantity)',
        value: formatMetricValue(computeEffectiveAverage(quantitySeriesValues.value.sales), 'quantity'),
        requiredEdition: undefined,
        tone: 'default' as const,
      },
      ...(hasDemandPlanContext.value
        ? [{
            key: 'demand-quantity',
            label: selectedUomId.value ? `Demand Plan Avg (${selectedUomId.value})` : 'Demand Plan Avg (Quantity)',
            value: formatMetricValue(computeEffectiveAverage(quantitySeriesValues.value.demandPlan), 'quantity'),
            requiredEdition: undefined,
            tone: 'success' as const,
          }]
        : []),
    ],
  },
  {
    /**
     * Keep the financial columns visible while avoiding a misleading numeric
     * fallback when the measures are unavailable in Community.
     */
    key: 'gross',
    cards: [
      {
        key: 'historical-gross',
        label: 'Historical Sales Avg (Gross)',
        value: '—',
        requiredEdition: 'Pro / Enterprise' as const,
        tone: 'default' as const,
      },
      {
        key: 'demand-gross',
        label: 'Demand Plan Avg (Gross)',
        value: '—',
        requiredEdition: 'Pro / Enterprise' as const,
        tone: 'default' as const,
      },
    ],
  },
  {
    /** See the gross column above: Net values are not available in Community. */
    key: 'net',
    cards: [
      {
        key: 'historical-net',
        label: 'Historical Sales Avg (Net)',
        value: '—',
        requiredEdition: 'Pro / Enterprise' as const,
        tone: 'default' as const,
      },
      {
        key: 'demand-net',
        label: 'Demand Plan Avg (Net)',
        value: '—',
        requiredEdition: 'Pro / Enterprise' as const,
        tone: 'default' as const,
      },
    ],
  },
]);

const hasOverviewData = computed(() => normalizedRows.value.length > 0);
const hasFilteredData = computed(() => filteredRows.value.length > 0);

async function bootstrapPage() {
  isBootstrapping.value = true;
  loadError.value = null;

  try {
    const [plans, uoms, scopeCatalog] = await Promise.all([
      fetchDemandPlanVersions(),
      fetchUomIds(),
      loadCommunityMaterialLocationFilterCatalog(),
    ]);

    demandPlanVersions.value = plans;
    uomIds.value = uoms;
    materialLocationCatalog.value = scopeCatalog;
    initialScope.value = createEmptyMaterialLocationScope(scopeCatalog);
  } catch (error) {
    loadError.value = 'The Sales/Demand Overview selectors could not be loaded from the backend.';
  } finally {
    isBootstrapping.value = false;
  }
}

async function openOverview() {
  if (!canOpenOverview.value) return;

  isLoadingOverview.value = true;
  workspaceError.value = null;

  try {
    const nextReport = await fetchDemandPlanAndSalesHistory({
      demandPlanId: selectedDemandPlanId.value || null,
      historicalSalesDocumentType: selectedDemandPlanId.value
        ? null
        : selectedHistoricalSalesType.value || null,
      unitOfMeasureId: selectedUomId.value,
      historicalPeriods: Math.max(1, Number(selectedHistoricalPeriods.value || 1)),
      demandPlanPeriodReferenceDates: selectedDemandPlanPeriodReferenceDates.value,
      ...initialScope.value,
    });

    report.value = nextReport;
    selectionCollapsed.value = true;
    selectedMetricId.value = 'quantity';
  } catch (error) {
    report.value = null;
    workspaceError.value = 'The backend rejected the Sales/Demand Overview request.';
  } finally {
    isLoadingOverview.value = false;
  }
}

function reopenSelection() {
  selectionCollapsed.value = false;
}

function clearLocalFilters() {
  Object.keys(localFilterValues).forEach((key) => {
    localFilterValues[key] = [];
  });
}

onMounted(() => {
  void bootstrapPage();
});
</script>

<template>
  <DashboardPageLayout class="sales-demand-overview-page">
    <OfxPageHeader
      eyebrow="Demand Planning"
      title="Sales/Demand Overview"
    />

    <div v-if="isBootstrapping" class="space-y-6">
      <OfxLoadingState label="Loading Sales/Demand Overview selectors" />
      <OfxLoadingState />
    </div>

    <OfxEmptyState
      v-else-if="loadError"
      title="Sales/Demand Overview unavailable"
      :description="loadError"
    />

    <template v-else>
      <OfxSectionCard
        v-if="!selectionCollapsed || !report"
        title="Selection Workspace"
        description="Choose the initial scope once. After loading, use the workspace filters to explore the available data."
      >
        <div class="space-y-6">
          <div class="grid gap-6 xl:grid-cols-2">
            <OfxSectionCard
              title="Historical Sales"
              description="Choose the past horizon and the sales document to compare."
            >
              <div class="grid gap-4 md:grid-cols-2">
                <OfxTextField
                  :model-value="selectedHistoricalPeriods"
                  label="Historical horizon"
                  type="number"
                  placeholder="12"
                  help-text="Use daily, weekly, or monthly periods."
                  @update:model-value="selectedHistoricalPeriods = $event"
                />

                <OfxSelectField
                  :model-value="selectedHistoricalSalesType"
                  label="Sales document type"
                  :options="historicalSalesTypeOptions"
                  :disabled="hasDemandPlanContext"
                  :help-text="hasDemandPlanContext
                    ? 'Sell-out is inferred from the selected Demand Plan in Community.'
                    : 'Required when no Demand Plan version is selected.'"
                  @update:model-value="selectedHistoricalSalesType = $event as 'Sell-out' | ''"
                />

                <OfxSelectField
                  :model-value="selectedUomId"
                  label="Unit of measure"
                  :options="uomOptions"
                  @update:model-value="selectedUomId = $event"
                />

                <OfxSelectField
                  model-value="dfu"
                  label="Detail level"
                  :options="COMMUNITY_DETAIL_LEVEL_OPTIONS"
                  help-text="This view uses the DFU detail level."
                />
              </div>
            </OfxSectionCard>

            <OfxSectionCard
              title="Demand Plan"
              description="Leave the plan empty to analyse only historical sales."
            >
              <div class="grid gap-4">
                <OfxSelectField
                  :model-value="selectedDemandPlanId"
                  label="Demand plan version"
                  :options="demandPlanOptions"
                  help-text="Leave empty to open historical sales only."
                  @update:model-value="selectedDemandPlanId = $event"
                />

                <OfxEntityMultiSelect
                  v-model="selectedDemandPlanPeriodReferenceDates"
                  label="Demand Plan periods"
                  :options="demandPlanPeriodOptions"
                  :disabled="!selectedDemandPlanId"
                  placeholder="All Periods Selected"
                  help-text="An empty selection reads the complete Demand Plan horizon."
                />
              </div>
            </OfxSectionCard>
          </div>

          <div class="space-y-3">
            <div>
              <h2 class="text-base font-semibold text-white/90">Filters</h2>
              <p class="mt-1 text-sm text-white/54">These filters restrict the dataset extracted from the backend.</p>
            </div>
            <MaterialLocationScopeFilters
              v-model="initialScope"
              :catalog="materialLocationCatalog"
              title="Material and location filters"
              description="Choose individual materials, locations or their public characteristics. Empty selections include the complete active scope."
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex h-11 items-center rounded-[10px] bg-[color:var(--ofx-primary)] px-4 text-sm font-semibold text-[color:var(--ofx-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canOpenOverview || isLoadingOverview"
              @click="openOverview"
            >
              {{ isLoadingOverview ? 'Loading overview...' : 'Open overview' }}
            </button>

            <p class="text-sm text-white/46">
              {{ hasDemandPlanContext
                ? 'Sell-out quantity is inferred from the selected plan.'
                : 'Choose Sell-out to open historical sales without a demand plan.' }}
            </p>
          </div>
        </div>
      </OfxSectionCard>

      <div
        v-if="workspaceError"
        class="rounded-[12px] border border-[color:rgb(182_76_76_/_0.28)] bg-[color:rgb(84_24_24_/_0.34)] px-4 py-4 text-sm text-[color:rgb(255_211_211_/_0.92)]"
      >
        {{ workspaceError }}
      </div>

      <div v-if="!report && !isLoadingOverview" class="space-y-6">
        <OfxEmptyState
          title="Open the overview workspace"
          description="Choose a Demand Plan or historical sales type, then select a quantity unit."
        />
      </div>

      <div v-else-if="isLoadingOverview" class="space-y-6">
        <OfxLoadingState label="Running the Sales/Demand Overview report" />
      </div>

      <template v-else-if="report && hasOverviewData">
        <OfxSectionCard
          v-if="selectionCollapsed"
          title="Loaded Selection"
          description="The initial selection is closed. Use the filters below to explore the loaded data."
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-2 text-sm text-white/68">
              <span
                v-for="item in compactSelectionSummary"
                :key="item"
                class="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5"
              >
                {{ item }}
              </span>
            </div>

            <button
              type="button"
              class="inline-flex h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/82 transition hover:border-white/16 hover:bg-white/[0.05]"
              @click="reopenSelection"
            >
              Change initial selection
            </button>
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          title="Workspace Filters"
          description="These filters run locally on the dataset already loaded, using only values that exist in the returned base."
        >
          <template #actions>
            <OfxButton variant="ghost" size="compact" :disabled="!hasActiveLocalFilters" @click="clearLocalFilters">
              Clear filters
            </OfxButton>
          </template>

          <OfxOperationFilters
            title="Filter Current Base"
            description="Only values present in the loaded dataset appear here. Changes update both chart and pivot immediately."
          >
            <template #materials>
              <OfxMaterialCharacteristicsFilter
                v-for="filter in materialEntityLocalFilters"
                :key="`local-material-${filter.key}`"
                v-model="localFilterValues[filter.key]"
                :label="filter.label"
                :options="filter.options"
                placeholder="All loaded materials"
              />
            </template>

            <template #locations>
              <OfxLocationCharacteristicsFilter
                v-for="filter in locationEntityLocalFilters"
                :key="`local-location-${filter.key}`"
                v-model="localFilterValues[filter.key]"
                :label="filter.label"
                :options="filter.options"
                placeholder="All loaded locations"
              />
            </template>

            <template #material-characteristics>
              <OfxMaterialCharacteristicsFilter
                v-for="filter in materialCharacteristicLocalFilters"
                :key="`local-material-characteristic-${filter.key}`"
                v-model="localFilterValues[filter.key]"
                :label="filter.label"
                :options="filter.options"
                placeholder="All values"
              />
            </template>

            <template #location-characteristics>
              <OfxLocationCharacteristicsFilter
                v-for="filter in locationCharacteristicLocalFilters"
                :key="`local-location-characteristic-${filter.key}`"
                v-model="localFilterValues[filter.key]"
                :label="filter.label"
                :options="filter.options"
                placeholder="All values"
              />
            </template>

            <template #custom-selectors>
              <OfxSelectField
                :model-value="selectedMetricId"
                label="Display metric"
                :options="metricOptions"
                help-text="Gross and net sales measures are not available in the current edition."
                locked
                locked-label="Pro / Enterprise"
                @update:model-value="selectedMetricId = $event as MetricId"
              />
            </template>
          </OfxOperationFilters>
        </OfxSectionCard>

        <template v-if="hasFilteredData">
          <div class="grid gap-4 xl:grid-cols-3">
            <div
              v-for="section in kpiSections"
              :key="section.key"
              class="grid gap-4"
            >
              <OfxKpiCard
                v-for="card in section.cards"
                :key="card.key"
                :label="card.label"
                :value="card.value"
                :tone="card.tone"
                :required-edition="card.requiredEdition"
              />
            </div>
          </div>

          <OfxSectionCard
            :title="selectedMetricMeta?.label ? `${hasDemandPlanContext ? 'Historical Sales vs Demand Plan' : 'Historical Sales'} - ${selectedMetricMeta.label}` : 'Sales vs Demand Plan'"
            description="Zero values are hidden from the plotted points, while the averages above still consider the full span between the first and last occurrence of each series."
          >
            <EChartAdapter :option="chartOption" :height="380" />
          </OfxSectionCard>

          <OfxSectionCard
            title="Pivot Analysis"
            description="The pivot follows the selected metric and the local filters currently applied to the loaded base."
          >
            <OfxPivotTable
              :key="`${pivotBaseName}-${selectedMetricId}`"
              :data="pivotRows"
              :rows="['Series']"
              :columns="['Period']"
              :measures="pivotMeasures"
              :temporal-bucket-size="pivotTemporalBucketSize"
              :height="460"
              :allow-measure-selection="false"
              :allow-aggregation-selection="false"
              :show-measure-controls="false"
              :show-totals-controls="false"
              :open-settings-by-default="false"
              :allow-split-by-selection="true"
              :show-datagrid-toolbar="false"
              :show-reset-control="false"
              :show-plugin-selector="false"
              :show-plugin-settings-control="false"
              :show-all-columns-section="true"
              :show-expressions-section="false"
              :show-status-metrics="false"
              :show-title-field="false"
              :show-actions="false"
              group-rollup-mode="flat"
              :allow-group-rollup-mode-selection="true"
              :hide-grand-totals="true"
              :base-name="pivotBaseName"
            />
          </OfxSectionCard>
        </template>

        <OfxEmptyState
          v-else
          title="No rows match the current local filters"
          description="Adjust or clear the workspace filters to bring Sales and Demand Plan rows back into the chart and pivot."
        />
      </template>

      <OfxEmptyState
        v-else-if="report"
        title="No Sales/Demand rows were returned"
        description="The selected initial scope did not produce any Sales or Demand Plan rows."
      />
    </template>
  </DashboardPageLayout>
</template>

<style scoped>
:global(:root[data-theme='light']) .sales-demand-overview-page [class*='border-white'] {
  border-color: var(--ofx-border);
}

:global(:root[data-theme='light']) .sales-demand-overview-page [class*='bg-white'] {
  background: var(--ofx-surface-elevated);
}

:global(:root[data-theme='light']) .sales-demand-overview-page [class*='text-white/82'],
:global(:root[data-theme='light']) .sales-demand-overview-page [class*='text-white/68'] {
  color: var(--ofx-text);
}

:global(:root[data-theme='light']) .sales-demand-overview-page [class*='text-white/46'] {
  color: var(--ofx-text-muted);
}
</style>
