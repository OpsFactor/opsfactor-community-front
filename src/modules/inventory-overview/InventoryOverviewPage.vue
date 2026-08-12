<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  OfxEmptyState,
  OfxEntityMultiSelect,
  OfxContextSummary,
  OfxPageHeader,
  OfxSectionCard,
  OfxSelectField,
} from '@opsfactor/front-shell';
import OfxPivotTable from '@/components/ofx/data-display/OfxPivotTable.vue';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import MaterialLocationScopeFilters from '@/features/material-location-scope/MaterialLocationScopeFilters.vue';
import {
  createEmptyMaterialLocationScope,
  type MaterialLocationScope,
  type MaterialLocationScopeCatalog,
} from '@/features/material-location-scope/material-location-scope.types';
import { getInventoryOverview, getInventoryOverviewSelectors } from './inventory-overview.service';
import type {
  InventoryOverview,
  InventoryOverviewCharacteristic,
  InventoryOverviewMaterialLocationDetail,
  PostHorizonPolicy,
  SupplyPlanOption,
} from './inventory-overview.types';

type PlanSeries = { stock: number[]; consumption: number[] };

const supplyPlans = ref<SupplyPlanOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const materialCharacteristics = ref<InventoryOverviewCharacteristic[]>([]);
const locationCharacteristics = ref<InventoryOverviewCharacteristic[]>([]);
const materialLocationCatalog = ref<MaterialLocationScopeCatalog>({
  materials: [],
  locations: [],
  materialCharacteristics: [],
  locationCharacteristics: [],
});
const supplyPlanId = ref<number | null>(null);
const unitOfMeasureId = ref('');
const initialScope = ref<MaterialLocationScope>(createEmptyMaterialLocationScope());
const analysisMaterialIds = ref<string[]>([]);
const analysisLocationIds = ref<string[]>([]);
const analysisMaterialCharacteristicValues = ref<Record<string, string[]>>({});
const analysisLocationCharacteristicValues = ref<Record<string, string[]>>({});
const postHorizonPolicy = ref<PostHorizonPolicy>('LIMIT_TO_PLANNING_HORIZON');
const inventoryOverview = ref<InventoryOverview | null>(null);
const isEditingInitialSelection = ref(true);
const isLoadingSelectors = ref(true);
const isLoadingOverview = ref(false);
const errorMessage = ref<string | null>(null);

const canLoadOverview = computed(() => supplyPlanId.value !== null && unitOfMeasureId.value.length > 0);
const periodLabels = computed(() => inventoryOverview.value?.periods.map((period) => formatDate(period.periodEnd)) ?? []);
const supplyPlanOptions = computed(() => supplyPlans.value.map((supplyPlan) => ({ value: String(supplyPlan.supplyPlanId), label: supplyPlanLabel(supplyPlan) })));
const unitOfMeasureOptions = computed(() => unitOfMeasureIds.value.map((id) => ({ value: id, label: id })));
const postHorizonOptions = [
  { value: 'LIMIT_TO_PLANNING_HORIZON', label: 'Limit coverage to planning horizon' },
  { value: 'AVERAGE_ALL_PERIODS', label: 'Continue using average daily consumption' },
];

const loadedDetails = computed(() => inventoryOverview.value?.materialLocationDetails ?? []);
/** Distinguishes an old running backend (field absent) from a valid empty physical scope. */
const isDetailedSnapshotUnavailable = computed(() => (
  inventoryOverview.value !== null && !Array.isArray(inventoryOverview.value.materialLocationDetails)
));
const analysisMaterialOptions = computed(() => distinctEntityOptions(loadedDetails.value, 'material'));
const analysisLocationOptions = computed(() => distinctEntityOptions(loadedDetails.value, 'location'));
const analysisMaterialCharacteristics = computed(() => characteristicOptionsFromSnapshot(
  materialCharacteristics.value,
  loadedDetails.value,
  'material',
));
const analysisLocationCharacteristics = computed(() => characteristicOptionsFromSnapshot(
  locationCharacteristics.value,
  loadedDetails.value,
  'location',
));

const filteredDetails = computed(() => loadedDetails.value.filter((detail) => (
  includesWhenSelected(analysisMaterialIds.value, detail.materialId)
  && includesWhenSelected(analysisLocationIds.value, detail.locationId)
  && hasCharacteristicValues(detail.valuesByMaterialCharacteristicId, analysisMaterialCharacteristicValues.value)
  && hasCharacteristicValues(detail.valuesByLocationCharacteristicId, analysisLocationCharacteristicValues.value)
)));

const constrainedSeries = computed(() => aggregateSeries(filteredDetails.value, 'constrained'));
const unconstrainedSeries = computed(() => aggregateSeries(filteredDetails.value, 'unconstrained'));
const constrainedCoverage = computed(() => calculateCoverageDays(constrainedSeries.value));
const unconstrainedCoverage = computed(() => calculateCoverageDays(unconstrainedSeries.value));

const pivotRows = computed(() => {
  const rows: Record<string, unknown>[] = [];
  filteredDetails.value.forEach((detail) => {
    const seriesByPlan = [
      { plan: 'Constrained', stock: detail.constrainedProjectedStock },
      { plan: 'Unconstrained', stock: detail.unconstrainedProjectedStock },
    ];
    seriesByPlan.forEach((series) => series.stock.forEach((value, periodIndex) => rows.push({
      location: selectorLabel({ id: detail.locationId, description: detail.locationDescription }),
      material: selectorLabel({ id: detail.materialId, description: detail.materialDescription }),
      plan: series.plan,
      period: inventoryOverview.value?.periods[periodIndex]?.periodEnd ?? '',
      value,
    })));
  });
  return rows;
});

const selectedSupplyPlanLabel = computed(() => {
  const supplyPlan = supplyPlans.value.find((candidate) => candidate.supplyPlanId === supplyPlanId.value);
  return supplyPlan ? supplyPlanLabel(supplyPlan) : 'Not selected';
});
const initialSelectionSummary = computed(() => [
  { label: 'Supply plan', value: selectedSupplyPlanLabel.value },
  { label: 'Unit of measure', value: unitOfMeasureId.value || 'Not selected' },
  { label: 'Materials', value: selectedScopeLabel(initialScope.value.materialIds, 'all active materials') },
  { label: 'Locations', value: selectedScopeLabel(initialScope.value.locationIds, 'all active locations') },
  { label: 'Material characteristics', value: selectedCharacteristicSummary(initialScope.value.valuesByMaterialCharacteristicId) },
  { label: 'Location characteristics', value: selectedCharacteristicSummary(initialScope.value.valuesByLocationCharacteristicId) },
]);

function distinctEntityOptions(details: InventoryOverviewMaterialLocationDetail[], dimension: 'material' | 'location') {

  const entries = new Map<string, string>();
  details.forEach((detail) => {
    const id = dimension === 'material' ? detail.materialId : detail.locationId;
    const description = dimension === 'material' ? detail.materialDescription : detail.locationDescription;
    entries.set(id, selectorLabel({ id, description }));
  });
  return [...entries].map(([value, label]) => ({ value, label }));
}

function characteristicOptionsFromSnapshot(
  characteristics: InventoryOverviewCharacteristic[],
  details: InventoryOverviewMaterialLocationDetail[],
  dimension: 'material' | 'location',
) {

  return characteristics.map((characteristic) => {
    const values = new Set<string>();
    details.forEach((detail) => {
      const detailValues = dimension === 'material'
        ? detail.valuesByMaterialCharacteristicId
        : detail.valuesByLocationCharacteristicId;
      const value = detailValues[characteristic.caracteristicaId];
      if (value) values.add(value);
    });
    return {
      ...characteristic,
      options: [...values].sort().map((value) => ({ value, label: value })),
    };
  }).filter((characteristic) => characteristic.options.length > 0);
}

function selectorLabel(option: { id: string; description: string | null }): string {

  return option.description?.trim() ? `${option.id} — ${option.description}` : option.id;
}

function supplyPlanLabel(supplyPlan: SupplyPlanOption): string {

  return supplyPlan.description?.trim()
    ? `#${supplyPlan.supplyPlanId} — ${supplyPlan.description}`
    : `Supply Plan #${supplyPlan.supplyPlanId}`;
}

function formatDate(value: string): string {

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function includesWhenSelected(selectedValues: string[], candidate: string): boolean {

  return !selectedValues.length || selectedValues.includes(candidate);
}

/** Applies AND across characteristics and OR across values in one characteristic. */
function hasCharacteristicValues(valuesByCharacteristicId: Record<string, string>, selectedValuesByCharacteristicId: Record<string, string[]>): boolean {

  return Object.entries(selectedValuesByCharacteristicId).every(([characteristicId, selectedValues]) => (
    !selectedValues.length || selectedValues.includes(valuesByCharacteristicId[characteristicId] ?? '')
  ));
}

function aggregateSeries(details: InventoryOverviewMaterialLocationDetail[], plan: 'constrained' | 'unconstrained'): PlanSeries {

  const numberOfPeriods = inventoryOverview.value?.periods.length ?? 0;
  const aggregate: PlanSeries = { stock: new Array(numberOfPeriods).fill(0), consumption: new Array(numberOfPeriods).fill(0) };
  details.forEach((detail) => {
    const stock = plan === 'constrained' ? detail.constrainedProjectedStock : detail.unconstrainedProjectedStock;
    const consumption = plan === 'constrained' ? detail.constrainedConsumption : detail.unconstrainedConsumption;
    stock.forEach((value, index) => { aggregate.stock[index] += Number(value ?? 0); });
    consumption.forEach((value, index) => { aggregate.consumption[index] += Number(value ?? 0); });
  });
  return aggregate;
}

/** Reapplies the physical depletion rule after local analysis filters aggregate the snapshot. */
function calculateCoverageDays(series: PlanSeries): number[] {

  const periodDays = inventoryOverview.value?.daysInPeriod ?? [];
  const totalDays = periodDays.reduce((total, days) => total + days, 0);
  const averageDailyConsumption = totalDays > 0
    ? series.consumption.reduce((total, value) => total + value, 0) / totalDays
    : 0;
  return series.stock.map((stockAtPeriodEnd, periodIndex) => {
    let remainingStock = stockAtPeriodEnd;
    let coverageDays = 0;
    for (let futurePeriodIndex = periodIndex + 1; futurePeriodIndex < series.consumption.length && remainingStock > 0; futurePeriodIndex += 1) {
      const consumption = series.consumption[futurePeriodIndex] ?? 0;
      const days = periodDays[futurePeriodIndex] ?? 0;
      if (consumption <= 0) coverageDays += days;
      else if (remainingStock > consumption) { coverageDays += days; remainingStock -= consumption; }
      else { coverageDays += days * remainingStock / consumption; remainingStock = 0; }
    }
    if (remainingStock > 0 && postHorizonPolicy.value === 'AVERAGE_ALL_PERIODS' && averageDailyConsumption > 0) coverageDays += remainingStock / averageDailyConsumption;
    return coverageDays;
  });
}

function buildInventoryChartOption(plan: 'constrained' | 'unconstrained') {

  const series = plan === 'constrained' ? constrainedSeries.value : unconstrainedSeries.value;
  const coverage = plan === 'constrained' ? constrainedCoverage.value : unconstrainedCoverage.value;
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 42, left: 52, right: 52, bottom: 42 },
    xAxis: { type: 'category', data: periodLabels.value, axisLabel: { rotate: 25 } },
    yAxis: [
      { type: 'value', name: 'Days of supply' },
      { type: 'value', name: inventoryOverview.value?.unitOfMeasureId ?? '', position: 'right', splitLine: { show: false } },
    ],
    series: [
      { name: 'Days of supply', type: 'line', data: coverage, smooth: false, lineStyle: { color: '#d88717', width: 2 }, itemStyle: { color: '#d88717' } },
      { name: 'Projected stock', type: 'line', yAxisIndex: 1, data: series.stock, smooth: false, lineStyle: { color: '#2563eb', width: 2 }, itemStyle: { color: '#2563eb' } },
    ],
  };
}

const constrainedChartOption = computed(() => buildInventoryChartOption('constrained'));
const unconstrainedChartOption = computed(() => buildInventoryChartOption('unconstrained'));

function selectedScopeLabel(selectedValues: string[], allLabel: string): string {

  return selectedValues.length ? `${selectedValues.length} selected` : allLabel;
}

function selectedCharacteristicSummary(valuesByCharacteristicId: Record<string, string[]>): string {

  const selectedValues = Object.values(valuesByCharacteristicId).flat();
  return selectedValues.length ? `${selectedValues.length} value${selectedValues.length === 1 ? '' : 's'} selected` : 'No restriction';
}

function createCharacteristicSelections(characteristics: InventoryOverviewCharacteristic[]): Record<string, string[]> {

  return Object.fromEntries(characteristics.map((characteristic) => [characteristic.caracteristicaId, []]));
}

function resetAnalysisFilters(): void {

  analysisMaterialIds.value = [];
  analysisLocationIds.value = [];
  analysisMaterialCharacteristicValues.value = createCharacteristicSelections(materialCharacteristics.value);
  analysisLocationCharacteristicValues.value = createCharacteristicSelections(locationCharacteristics.value);
}

function editInitialSelection(): void {

  isEditingInitialSelection.value = true;
  errorMessage.value = null;
}

async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;
  try {
    const selectors = await getInventoryOverviewSelectors();
    supplyPlans.value = selectors.supplyPlans;
    unitOfMeasureIds.value = selectors.unitOfMeasureIds;
    materialCharacteristics.value = selectors.materialCharacteristics;
    locationCharacteristics.value = selectors.locationCharacteristics;
    materialLocationCatalog.value = {
      materials: selectors.materials,
      locations: selectors.locations,
      materialCharacteristics: selectors.materialCharacteristics,
      locationCharacteristics: selectors.locationCharacteristics,
    };
    initialScope.value = createEmptyMaterialLocationScope(materialLocationCatalog.value);
    resetAnalysisFilters();
    supplyPlanId.value ??= selectors.supplyPlans[0]?.supplyPlanId ?? null;
    unitOfMeasureId.value ||= selectors.unitOfMeasureIds[0] ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Inventory Overview selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }
}

async function loadOverview(): Promise<void> {

  if (!canLoadOverview.value || supplyPlanId.value === null) return;
  isLoadingOverview.value = true;
  errorMessage.value = null;
  try {
    inventoryOverview.value = await getInventoryOverview({
      supplyPlanId: supplyPlanId.value,
      unitOfMeasureId: unitOfMeasureId.value,
      ...initialScope.value,
      postHorizonPolicy: postHorizonPolicy.value,
    });
    resetAnalysisFilters();
    isEditingInitialSelection.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the Inventory Overview.';
  } finally {
    isLoadingOverview.value = false;
  }
}

onMounted(loadSelectors);
</script>

<template>
  <DashboardPageLayout class="inventory-overview-page">
    <OfxPageHeader eyebrow="Visibility" title="Inventory Overview" description="Open one physical snapshot, then refine its material and location scope locally." />

    <p v-if="errorMessage && inventoryOverview" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="isEditingInitialSelection || !inventoryOverview" title="Initial selection" description="Choose the plan, physical unit and complete starting scope. Characteristics are applied before the snapshot is loaded.">
      <div class="grid gap-4 xl:grid-cols-4">
        <OfxSelectField label="Supply plan version" :model-value="supplyPlanId === null ? '' : String(supplyPlanId)" :options="supplyPlanOptions" :disabled="isLoadingSelectors" @update:model-value="supplyPlanId = $event ? Number($event) : null" />
        <OfxSelectField v-model="unitOfMeasureId" label="Unit of measure" :options="unitOfMeasureOptions" :disabled="isLoadingSelectors" />
        <OfxSelectField v-model="postHorizonPolicy" label="Demand after planning horizon" :options="postHorizonOptions" :show-placeholder-option="false" :disabled="isLoadingSelectors" />
      </div>
      <MaterialLocationScopeFilters
        v-model="initialScope"
        class="mt-5"
        :catalog="materialLocationCatalog"
        description="Choose materials, locations or their public characteristics before loading the physical snapshot."
      />
      <template #actions><button class="primary-button" :disabled="!canLoadOverview || isLoadingOverview" @click="loadOverview">{{ isLoadingOverview ? 'Loading...' : inventoryOverview ? 'Reload snapshot' : 'Open inventory overview' }}</button></template>
    </OfxSectionCard>

    <OfxEmptyState v-if="!isLoadingSelectors && errorMessage && !inventoryOverview" class="mt-6" title="Inventory Overview unavailable" :description="errorMessage" />
    <OfxEmptyState v-else-if="!isLoadingSelectors && !inventoryOverview" class="mt-6" title="Select the initial scope to open the report" description="The report starts with one detailed material-location snapshot; later filters never expand it." />

    <template v-else-if="inventoryOverview">
      <OfxContextSummary v-if="!isEditingInitialSelection" class="mt-6" title="Loaded selection" description="This is the starting scope of the open snapshot. Change it only when a new backend selection is needed." :metrics="initialSelectionSummary">
        <template #actions><button class="secondary-button" :disabled="isLoadingOverview" @click="editInitialSelection">Change initial selection</button></template>
      </OfxContextSummary>

      <OfxSectionCard class="mt-6" title="Analysis filters" description="Refine only the material-location combinations already returned in the snapshot. Charts and the pivot update locally.">
        <div class="grid gap-4 xl:grid-cols-2">
          <OfxEntityMultiSelect v-model="analysisLocationIds" label="Locations" :options="analysisLocationOptions" placeholder="All loaded locations" />
          <OfxEntityMultiSelect v-model="analysisMaterialIds" label="Materials" :options="analysisMaterialOptions" placeholder="All loaded materials" />
          <OfxEntityMultiSelect v-for="characteristic in analysisLocationCharacteristics" :key="`location-${characteristic.caracteristicaId}`" v-model="analysisLocationCharacteristicValues[characteristic.caracteristicaId]" :label="characteristic.descricao" :options="characteristic.options" placeholder="All values" />
          <OfxEntityMultiSelect v-for="characteristic in analysisMaterialCharacteristics" :key="`material-${characteristic.caracteristicaId}`" v-model="analysisMaterialCharacteristicValues[characteristic.caracteristicaId]" :label="characteristic.descricao" :options="characteristic.options" placeholder="All values" />
        </div>
        <template #actions><button class="secondary-button" @click="resetAnalysisFilters">Clear analysis filters</button></template>
      </OfxSectionCard>

      <OfxEmptyState v-if="isDetailedSnapshotUnavailable" class="mt-6" title="Detailed snapshot is unavailable" description="The active Community backend is still returning the previous aggregate-only Inventory Overview response. Restart it with the updated backend, then open the snapshot again." />
      <OfxEmptyState v-else-if="!filteredDetails.length" class="mt-6" title="No material-location rows match this analysis" description="Adjust the local filters or change the initial selection to load a broader snapshot." />
      <template v-else>
        <div v-if="inventoryOverview.periods.length" class="mt-6 grid gap-6 xl:grid-cols-2">
          <OfxSectionCard :title="`Inventory and days of supply - Constrained (${inventoryOverview.unitOfMeasureId})`" description="Projected physical stock and calendar coverage for the constrained plan."><EChartAdapter :option="constrainedChartOption" :height="340" /></OfxSectionCard>
          <OfxSectionCard :title="`Inventory and days of supply - Unconstrained (${inventoryOverview.unitOfMeasureId})`" description="Projected physical stock and calendar coverage without supply constraints."><EChartAdapter :option="unconstrainedChartOption" :height="340" /></OfxSectionCard>
        </div>
        <OfxSectionCard class="mt-6" title="Inventory analysis" description="Projected stock by loaded location, material and plan.">
          <OfxPivotTable :data="pivotRows" :rows="['location', 'material', 'plan']" :columns="['period']" :measures="[{ field: 'value', label: 'Projected stock', aggregation: 'sum', allowAggregationChange: false, allowedAggregations: ['sum'] }]" :height="500" base-name="inventory-overview-analysis" :allow-measure-selection="false" :allow-aggregation-selection="false" :show-measure-controls="false" :show-totals-controls="false" :open-settings-by-default="false" :allow-split-by-selection="false" :show-datagrid-toolbar="false" :show-reset-control="false" :show-plugin-selector="false" :show-plugin-settings-control="false" :show-all-columns-section="false" :show-expressions-section="false" :show-status-metrics="false" :show-title-field="false" :show-actions="false" group-rollup-mode="flat" :allow-group-rollup-mode-selection="true" :hide-grand-totals="true" temporal-bucket-size="monthly" />
        </OfxSectionCard>
      </template>
    </template>
  </DashboardPageLayout>
</template>

<style scoped>
.primary-button, .secondary-button { display: inline-flex; min-height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 0 .95rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }
.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }
.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }
.message { border-radius: 14px; padding: .85rem 1rem; font-size: .875rem; }
.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }
</style>
