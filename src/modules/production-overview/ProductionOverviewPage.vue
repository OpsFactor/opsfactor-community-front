<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { OfxEmptyState, OfxKpiCard, OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxPivotTable from '@/components/ofx/data-display/OfxPivotTable.vue';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import {
  getProductionOverview,
  getProductionOverviewResourceDetail,
  getProductionOverviewSelectors,
} from './production-overview.service';
import type {
  DirectAndIndirectDemand,
  NamedOption,
  ProductionOverview,
  ProductionOverviewResourceDetail,
  ProductionResourceCapacity,
  ProductionResourceOccupation,
  StockAndProduction,
  SupplyPlanOption,
} from './production-overview.types';

interface QuantityRow {
  locationId: string;
  materialId: string;
  periodEnd: string;
  constrainedInventory: number | undefined;
  unconstrainedInventory: number | undefined;
  constrainedInbound: number | undefined;
  unconstrainedInbound: number | undefined;
  constrainedProduction: number | undefined;
  unconstrainedProduction: number | undefined;
  constrainedDirectDemand: number | undefined;
  unconstrainedDirectDemand: number | undefined;
  constrainedIndirectDemand: number | undefined;
  unconstrainedIndirectDemand: number | undefined;
}

interface ResourceRow {
  locationId: string;
  productionResourceId: string;
  periodEnd: string;
  periodIndex: number;
  constrainedOccupation: number;
  unconstrainedOccupation: number;
  capacity: number | undefined;
}

const supplyPlans = ref<SupplyPlanOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const materials = ref<NamedOption[]>([]);
const locations = ref<NamedOption[]>([]);
const supplyPlanId = ref<number | null>(null);
const uomId = ref('');
const selectedMaterialIds = ref<string[]>([]);
const selectedLocationIds = ref<string[]>([]);
const overview = ref<ProductionOverview | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingOverview = ref(false);
const errorMessage = ref<string | null>(null);
const resourceDetail = ref<ProductionOverviewResourceDetail | null>(null);
const isLoadingResourceDetail = ref(false);
const resourceDetailErrorMessage = ref<string | null>(null);

/** The Community page never expands a missing selector into the whole active scope. */
const canLoadOverview = computed(() => (
  supplyPlanId.value !== null
  && uomId.value.length > 0
  && selectedMaterialIds.value.length > 0
  && selectedLocationIds.value.length > 0
));
const activeMaterials = computed(() => materials.value.filter((option) => option.active !== false));
const activeLocations = computed(() => locations.value.filter((option) => option.active !== false));
const supplyPlanOptions = computed(() => [
  { label: 'Select a supply plan version', value: '' },
  ...supplyPlans.value.map((supplyPlan) => ({
    label: supplyPlanLabel(supplyPlan),
    value: String(supplyPlan.supplyPlanId),
  })),
]);
const unitOfMeasureOptions = computed(() => [
  { label: 'Select a unit of measure', value: '' },
  ...unitOfMeasureIds.value.map((unitOfMeasureId) => ({ label: unitOfMeasureId, value: unitOfMeasureId })),
]);
const locationOptions = computed(() => activeLocations.value.map((location) => ({
  label: selectorLabel(location),
  value: location.id,
})));
const materialOptions = computed(() => activeMaterials.value.map((material) => ({
  label: selectorLabel(material),
  value: material.id,
})));
const periodLabels = computed(() => overview.value?.finalDateTimeByPeriod.map((period) => formatDate(period)) ?? []);

/** The cards retain the reference dashboard hierarchy while exposing only physical Community facts. */
const summaryCards = computed(() => {

  const latestRows = quantityRows.value.filter((row) => row.periodEnd === overview.value?.finalDateTimeByPeriod.at(-1));
  const sum = (key: keyof QuantityRow) => latestRows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  return [
    { label: 'Constrained stock', value: formatValue(sum('constrainedInventory')), tone: 'default' as const },
    { label: 'Unconstrained stock', value: formatValue(sum('unconstrainedInventory')), tone: 'success' as const },
    { label: 'Constrained production', value: formatValue(sum('constrainedProduction')), tone: 'default' as const },
    { label: 'Constrained direct demand', value: formatValue(sum('constrainedDirectDemand')), tone: 'warning' as const },
  ];
});

/** Keeps the two visual chart slots from the reference without deriving any private metric. */
function buildVolumeOption(plan: 'constrained' | 'unconstrained') {

  const rows = quantityRows.value;
  const sumForPeriod = (field: keyof QuantityRow) => periodLabels.value.map((_, periodIndex) => {
    const period = overview.value?.finalDateTimeByPeriod[periodIndex];
    return rows
      .filter((row) => row.periodEnd === period)
      .reduce((total, row) => total + Number(row[field] ?? 0), 0);
  });
  const prefix = plan === 'constrained' ? 'constrained' : 'unconstrained';

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { top: 30, right: 24, bottom: 58, left: 56 },
    xAxis: { type: 'category', data: periodLabels.value },
    yAxis: { type: 'value', name: uomId.value },
    series: [
      { name: 'Stock', type: 'line', smooth: true, data: sumForPeriod(`${prefix}Inventory` as keyof QuantityRow) },
      { name: 'Inbound', type: 'line', smooth: true, data: sumForPeriod(`${prefix}Inbound` as keyof QuantityRow) },
      { name: 'Production', type: 'line', smooth: true, data: sumForPeriod(`${prefix}Production` as keyof QuantityRow) },
      { name: 'Direct demand', type: 'line', smooth: true, data: sumForPeriod(`${prefix}DirectDemand` as keyof QuantityRow) },
      { name: 'Indirect demand', type: 'line', smooth: true, data: sumForPeriod(`${prefix}IndirectDemand` as keyof QuantityRow) },
    ],
  };

}

const constrainedVolumeOption = computed(() => buildVolumeOption('constrained'));
const unconstrainedVolumeOption = computed(() => buildVolumeOption('unconstrained'));
const pivotRows = computed(() => quantityRows.value.flatMap((row) => [
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Constrained', series: 'Stock', value: row.constrainedInventory ?? 0 },
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Unconstrained', series: 'Stock', value: row.unconstrainedInventory ?? 0 },
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Constrained', series: 'Production', value: row.constrainedProduction ?? 0 },
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Unconstrained', series: 'Production', value: row.unconstrainedProduction ?? 0 },
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Constrained', series: 'Direct demand', value: row.constrainedDirectDemand ?? 0 },
  { location: row.locationId, material: row.materialId, period: formatDate(row.periodEnd), planVersion: 'Unconstrained', series: 'Direct demand', value: row.unconstrainedDirectDemand ?? 0 },
]));

/** Joins the two independently published physical blocks by their fixed Community identity. */
const quantityRows = computed<QuantityRow[]>(() => {

  if (overview.value === null) return [];

  const demandByLocationAndMaterial = new Map<string, DirectAndIndirectDemand>();
  for (const demand of overview.value.directAndIndirectDemandByLocationAndMaterialGrouping) {
    demandByLocationAndMaterial.set(`${demand.locationId}\u0000${demand.materialId}`, demand);
  }

  return overview.value.stockAndProductionByLocationAndMaterialGrouping.flatMap((stockAndProduction) => (
    overview.value!.finalDateTimeByPeriod.map((periodEnd, periodIndex) => {
      const demand = demandByLocationAndMaterial.get(`${stockAndProduction.locationId}\u0000${stockAndProduction.materialId}`);
      return toQuantityRow(stockAndProduction, demand, periodEnd, periodIndex);
    })
  ));

});

/** Sums the backend's material-level occupation into the requested resource-period physical view. */
const resourceRows = computed<ResourceRow[]>(() => {

  if (overview.value === null) return [];

  const capacityByResource = new Map<string, ProductionResourceCapacity>();
  for (const capacity of overview.value.capacityByProductionResource) {
    capacityByResource.set(resourceKey(capacity.locationId, capacity.productionResourceId), capacity);
  }

  const occupationByResourcePeriod = new Map<string, ResourceRow>();
  for (const occupation of overview.value.occupationAndProductionByProductionResourceAndMaterialGrouping) {
    addOccupationRows(occupationByResourcePeriod, occupation, overview.value.finalDateTimeByPeriod, capacityByResource);
  }
  for (const capacity of overview.value.capacityByProductionResource) {
    for (const [periodIndex, periodEnd] of overview.value.finalDateTimeByPeriod.entries()) {
      const key = `${resourceKey(capacity.locationId, capacity.productionResourceId)}\u0000${periodIndex}`;
      occupationByResourcePeriod.set(key, occupationByResourcePeriod.get(key) ?? {
        locationId: capacity.locationId,
      productionResourceId: capacity.productionResourceId,
      periodEnd,
        periodIndex,
        constrainedOccupation: 0,
        unconstrainedOccupation: 0,
        capacity: capacity.capacityInHoursOrQuantity[periodIndex],
      });
    }
  }

  return [...occupationByResourcePeriod.values()];

});

function toQuantityRow(
  stockAndProduction: StockAndProduction,
  demand: DirectAndIndirectDemand | undefined,
  periodEnd: string,
  periodIndex: number,
): QuantityRow {

  return {
    locationId: stockAndProduction.locationId,
    materialId: stockAndProduction.materialId,
    periodEnd,
    constrainedInventory: stockAndProduction.constrainedInventory[periodIndex],
    unconstrainedInventory: stockAndProduction.unconstrainedInventory[periodIndex],
    constrainedInbound: stockAndProduction.constrainedInbound[periodIndex],
    unconstrainedInbound: stockAndProduction.unconstrainedInbound[periodIndex],
    constrainedProduction: stockAndProduction.constrainedProduction[periodIndex],
    unconstrainedProduction: stockAndProduction.unconstrainedProduction[periodIndex],
    constrainedDirectDemand: demand?.constrainedDirectDemand[periodIndex],
    unconstrainedDirectDemand: demand?.unconstrainedDirectDemand[periodIndex],
    constrainedIndirectDemand: demand?.constrainedIndirectDemand[periodIndex],
    unconstrainedIndirectDemand: demand?.unconstrainedIndirectDemand[periodIndex],
  };

}

function addOccupationRows(
  rowsByResourcePeriod: Map<string, ResourceRow>,
  occupation: ProductionResourceOccupation,
  periods: string[],
  capacityByResource: Map<string, ProductionResourceCapacity>,
): void {

  const keyPrefix = resourceKey(occupation.locationId, occupation.productionResourceId);
  const capacity = capacityByResource.get(keyPrefix);
  for (const [periodIndex, periodEnd] of periods.entries()) {
    const key = `${keyPrefix}\u0000${periodIndex}`;
    const row = rowsByResourcePeriod.get(key) ?? {
      locationId: occupation.locationId,
      productionResourceId: occupation.productionResourceId,
      periodEnd,
      periodIndex,
      constrainedOccupation: 0,
      unconstrainedOccupation: 0,
      capacity: capacity?.capacityInHoursOrQuantity[periodIndex],
    };
    row.constrainedOccupation += occupation.constrainedOccupationInHoursOrQuantity[periodIndex] ?? 0;
    row.unconstrainedOccupation += occupation.unconstrainedOccupationInHoursOrQuantity[periodIndex] ?? 0;
    rowsByResourcePeriod.set(key, row);
  }

}

function resourceKey(locationId: string, productionResourceId: string): string {

  return `${locationId}\u0000${productionResourceId}`;

}

function selectorLabel(option: NamedOption): string {

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

function formatValue(value: number | undefined): string {

  return value === undefined || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

}

/** A zero/absent capacity is explicitly unavailable, never a division or synthetic zero utilization. */
function formatOccupationByCapacity(occupation: number, capacity: number | undefined): string {

  return capacity === undefined || !Number.isFinite(capacity) || capacity === 0
    ? '—'
    : `${formatValue(occupation)} / ${formatValue(capacity)}`;

}

async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getProductionOverviewSelectors();
    supplyPlans.value = selectors.supplyPlans;
    unitOfMeasureIds.value = selectors.unitOfMeasureIds;
    materials.value = selectors.materials;
    locations.value = selectors.locations;
    supplyPlanId.value ??= selectors.supplyPlans[0]?.supplyPlanId ?? null;
    uomId.value ||= selectors.unitOfMeasureIds[0] ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Production Overview selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

async function loadOverview(): Promise<void> {

  if (!canLoadOverview.value || supplyPlanId.value === null) return;

  isLoadingOverview.value = true;
  errorMessage.value = null;
  clearResourceDetail();

  try {
    overview.value = await getProductionOverview({
      supplyPlanId: supplyPlanId.value,
      uomId: uomId.value,
      locationIds: selectedLocationIds.value,
      materialIds: selectedMaterialIds.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Production Overview.';
  } finally {
    isLoadingOverview.value = false;
  }

}

/** Opens one physical cell only after an explicit click; no resource detail is prefetched. */
async function loadResourceDetail(row: ResourceRow): Promise<void> {

  if (supplyPlanId.value === null) return;

  isLoadingResourceDetail.value = true;
  resourceDetailErrorMessage.value = null;
  resourceDetail.value = null;

  try {
    resourceDetail.value = await getProductionOverviewResourceDetail(
      supplyPlanId.value,
      row.productionResourceId,
      row.periodIndex,
      selectedMaterialIds.value,
    );
  } catch (error) {
    resourceDetailErrorMessage.value = error instanceof Error
      ? error.message
      : 'Unable to load Production Overview resource detail.';
  } finally {
    isLoadingResourceDetail.value = false;
  }

}

/** A detail belongs to exactly one overview snapshot and physical selection. */
function clearResourceDetail(): void {

  resourceDetail.value = null;
  resourceDetailErrorMessage.value = null;
  isLoadingResourceDetail.value = false;

}

watch([supplyPlanId, uomId, selectedMaterialIds, selectedLocationIds], clearResourceDetail, { deep: true });

onMounted(loadSelectors);
</script>

<template>
  <DashboardPageLayout class="occupation-volumes-page">
    <OfxPageHeader eyebrow="Production" title="Production Overview">
      <template #actions><button class="secondary-button" :disabled="isLoadingSelectors || isLoadingOverview" @click="loadSelectors">Refresh selectors</button></template>
    </OfxPageHeader>

    <div v-if="isLoadingSelectors" class="dashboard-state">Loading report selectors…</div>
    <p v-else-if="errorMessage && !overview" class="error" role="alert">{{ errorMessage }}</p>

    <template v-else>
      <div class="dashboard-selection-grid">
        <OfxSectionCard title="Supply Plan Selection" description="Select a Supply Plan version and unit of measure, then open the dashboard.">
          <div class="selector-grid">
            <OfxSelectField label="Supply plan version" :model-value="supplyPlanId === null ? '' : String(supplyPlanId)" :options="supplyPlanOptions" @update:model-value="supplyPlanId = $event ? Number($event) : null" />
            <OfxSelectField label="Unit of measure" :model-value="uomId" :options="unitOfMeasureOptions" @update:model-value="uomId = String($event)" />
            <div class="selector-actions"><button class="primary-button" :disabled="!canLoadOverview || isLoadingOverview" @click="loadOverview">{{ isLoadingOverview ? 'Loading…' : 'Open Dashboard' }}</button></div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Selection - locations and materials" description="Community keeps the same selection area, with an explicit physical scope.">
          <div class="selector-grid">
            <OfxEntityMultiSelect v-model="selectedLocationIds" label="Locations" :options="locationOptions" placeholder="Select one or more locations" />
            <OfxEntityMultiSelect v-model="selectedMaterialIds" label="Materials" :options="materialOptions" placeholder="Select one or more materials" />
            <div class="enterprise-slot selector-actions" aria-disabled="true"><span>Dynamic characteristics</span><small>Enterprise</small></div>
          </div>
        </OfxSectionCard>
      </div>

      <p v-if="errorMessage && overview" class="error" role="alert">{{ errorMessage }}</p>
      <OfxEmptyState v-if="errorMessage && !overview && !isLoadingOverview" title="Production data unavailable" :description="errorMessage" />
      <OfxEmptyState v-else-if="!overview && !isLoadingOverview" title="Select plan and unit to open the dashboard" description="Select a Supply Plan, unit, locations and materials to open the dashboard." />
      <div v-else-if="isLoadingOverview" class="dashboard-state">Running the Production Overview report…</div>

      <template v-else-if="overview">
        <div class="kpi-grid"><OfxKpiCard v-for="card in summaryCards" :key="card.label" :label="card.label" :value="card.value" :tone="card.tone" /></div>

        <div class="chart-grid">
          <OfxSectionCard title="Production volume / Occupation - Constrained"><EChartAdapter :option="constrainedVolumeOption" :height="340" /></OfxSectionCard>
          <OfxSectionCard title="Production volume / Occupation - Unconstrained"><EChartAdapter :option="unconstrainedVolumeOption" :height="340" /></OfxSectionCard>
        </div>

        <OfxSectionCard title="Pivot Table">
          <OfxPivotTable :data="pivotRows" :rows="['location', 'material', 'planVersion', 'series']" :columns="['period']" :measures="[{ field: 'value', label: 'Quantity', aggregation: 'sum', allowAggregationChange: false, allowedAggregations: ['sum'] }]" :height="440" :allow-measure-selection="false" :allow-aggregation-selection="false" :show-measure-controls="false" :show-totals-controls="false" :open-settings-by-default="false" :allow-split-by-selection="false" :show-datagrid-toolbar="false" :show-reset-control="false" :show-plugin-selector="false" :show-plugin-settings-control="false" :show-all-columns-section="false" :show-expressions-section="false" :show-status-metrics="false" :show-title-field="false" :show-actions="false" group-rollup-mode="flat" :allow-group-rollup-mode-selection="true" :hide-grand-totals="true" base-name="production-overview-pivot" />
        </OfxSectionCard>

        <OfxSectionCard title="Production Capacity - Production Resources Selection" description="The published Community snapshot supplies the resource capacity and occupation."><p class="muted">Resource selection and sequencing controls remain visible in the Enterprise edition. Community presents the authorized physical resource snapshot below.</p></OfxSectionCard>

        <div class="chart-grid">
          <OfxSectionCard title="Occupation by Production Resource - Constrained">
            <p v-if="!resourceRows.length" class="muted">No constrained resource rows</p>
            <div v-else class="table-scroll"><table><thead><tr><th>Period end</th><th>Location</th><th>Resource</th><th>Constrained occupancy / capacity</th><th></th></tr></thead><tbody><tr v-for="row in resourceRows" :key="`${row.periodEnd}-${row.locationId}-${row.productionResourceId}-constrained`"><td>{{ formatDate(row.periodEnd) }}</td><td>{{ row.locationId }}</td><td>{{ row.productionResourceId }}</td><td>{{ formatOccupationByCapacity(row.constrainedOccupation, row.capacity) }}</td><td><button class="secondary-button" :disabled="isLoadingResourceDetail" @click="loadResourceDetail(row)">{{ isLoadingResourceDetail ? 'Loading…' : 'Details' }}</button></td></tr></tbody></table></div>
          </OfxSectionCard>
          <OfxSectionCard title="Occupation by Production Resource - Unconstrained">
            <p v-if="!resourceRows.length" class="muted">No unconstrained resource rows</p>
            <div v-else class="table-scroll"><table><thead><tr><th>Period end</th><th>Location</th><th>Resource</th><th>Unconstrained occupancy / capacity</th></tr></thead><tbody><tr v-for="row in resourceRows" :key="`${row.periodEnd}-${row.locationId}-${row.productionResourceId}-unconstrained`"><td>{{ formatDate(row.periodEnd) }}</td><td>{{ row.locationId }}</td><td>{{ row.productionResourceId }}</td><td>{{ formatOccupationByCapacity(row.unconstrainedOccupation, row.capacity) }}</td></tr></tbody></table></div>
          </OfxSectionCard>
        </div>

        <OfxSectionCard class="enterprise-slot" title="Production sequencing" description="Persisted setup sequencing and the Gantt track are Enterprise capabilities."><button class="secondary-button" disabled>Available in Enterprise</button></OfxSectionCard>

        <OfxSectionCard v-if="resourceDetail || resourceDetailErrorMessage || isLoadingResourceDetail" title="Production Resource Detail">
          <div class="section-header"><p>Read-only physical lines. Quantities and capacity consumption remain in the units returned for each line.</p><button class="secondary-button" :disabled="isLoadingResourceDetail" @click="clearResourceDetail">Close</button></div>
          <p v-if="isLoadingResourceDetail" class="muted">Loading production resource detail…</p>
          <OfxEmptyState v-else-if="resourceDetailErrorMessage" title="Production resource detail unavailable" :description="resourceDetailErrorMessage" />
          <template v-else-if="resourceDetail"><dl class="detail-summary"><div><dt>Location</dt><dd>{{ resourceDetail.locationId }}<template v-if="resourceDetail.locationDescription"> — {{ resourceDetail.locationDescription }}</template></dd></div><div><dt>Resource</dt><dd>{{ resourceDetail.productionResourceId }}<template v-if="resourceDetail.productionResourceDescription"> — {{ resourceDetail.productionResourceDescription }}</template></dd></div><div><dt>Period</dt><dd>{{ formatDate(resourceDetail.plannedDate) }}</dd></div><div><dt>Available capacity</dt><dd>{{ formatValue(resourceDetail.availableCapacityInHoursOrQuantity ?? undefined) }} {{ resourceDetail.resourceCapacityUnitOfMeasureId }}</dd></div></dl><OfxEmptyState v-if="!resourceDetail.rows.length" title="No allocation details" description="No production lines were returned for this resource, period and selected material scope." /><div v-else class="table-scroll"><table><thead><tr><th>Material</th><th>Production version</th><th>Routing</th><th>BOM</th><th>Quantity UOM</th><th>Unconstrained quantity</th><th>Constrained quantity</th><th>Working quantity</th><th>Capacity UOM</th><th>Unconstrained consumption</th><th>Constrained consumption</th><th>Working consumption</th></tr></thead><tbody><tr v-for="row in resourceDetail.rows" :key="`${row.outputMaterialId}-${row.productionVersionId ?? 'none'}-${row.routingId}-${row.billOfMaterialsId}`"><td>{{ row.outputMaterialId }}<template v-if="row.outputMaterialDescription"> — {{ row.outputMaterialDescription }}</template></td><td>{{ row.productionVersionId ?? '—' }}</td><td>{{ row.routingId }}<template v-if="row.routingDescription"> — {{ row.routingDescription }}</template></td><td>{{ row.billOfMaterialsId }}<template v-if="row.billOfMaterialsDescription"> — {{ row.billOfMaterialsDescription }}</template></td><td>{{ row.unitOfMeasureId }}</td><td>{{ formatValue(row.unconstrainedQuantity ?? undefined) }}</td><td>{{ formatValue(row.constrainedQuantity ?? undefined) }}</td><td>{{ formatValue(row.workPlanQuantity ?? undefined) }}</td><td>{{ row.resourceCapacityUnitOfMeasureId }}</td><td>{{ formatValue(row.unconstrainedHours ?? undefined) }}</td><td>{{ formatValue(row.constrainedHours ?? undefined) }}</td><td>{{ formatValue(row.workPlanHours ?? undefined) }}</td></tr></tbody></table></div></template>
        </OfxSectionCard>
      </template>
    </template>
  </DashboardPageLayout>
</template>

<style scoped>
.occupation-volumes-page { display: grid; gap: 1.5rem; }
.dashboard-selection-grid, .chart-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.selector-grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.selector-actions { display: flex; align-items: end; justify-content: flex-end; }
.kpi-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.dashboard-state { border: 1px dashed var(--ofx-border); border-radius: 12px; color: var(--ofx-text-muted); padding: 2rem; text-align: center; }
.enterprise-slot { border-color: color-mix(in srgb, var(--ofx-border) 70%, var(--ofx-text-muted)); opacity: .8; }
.enterprise-slot small { border: 1px solid currentColor; border-radius: 999px; font-size: .7rem; font-weight: 700; margin-left: .5rem; padding: .15rem .45rem; }
.section-header { align-items: start; display: flex; gap: 1rem; justify-content: space-between; }
.primary-button, .secondary-button { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface-elevated); color: var(--ofx-text-strong); cursor: pointer; padding: .65rem .9rem; }
.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }
.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { border-top: 1px solid var(--ofx-border); padding: .8rem .65rem; vertical-align: top; white-space: nowrap; }
th { color: var(--ofx-text-muted); font-size: .75rem; text-transform: uppercase; }
.detail-summary { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); margin: 1rem 0; }
.detail-summary dt { color: var(--ofx-text-muted); font-size: .75rem; font-weight: 700; text-transform: uppercase; }
.detail-summary dd { margin: .25rem 0 0; }
.muted, .section-header p { color: var(--ofx-text-muted); }
.error { color: #b42318; }
@media (max-width: 1100px) { .dashboard-selection-grid, .chart-grid { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .selector-grid, .kpi-grid { grid-template-columns: 1fr; } }
</style>
