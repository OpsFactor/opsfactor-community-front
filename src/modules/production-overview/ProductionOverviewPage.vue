<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  OfxEmptyState,
  OfxKpiCard,
  OfxPageHeader,
  OfxSectionCard,
  type OfxExportFormat,
  type OfxTableColumn,
} from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxDataTable from '@/components/ofx/data-display/OfxDataTable.vue';
import OfxPivotTable from '@/components/ofx/data-display/OfxPivotTable.vue';
import OfxTableToolbar from '@/components/ofx/data-display/OfxTableToolbar.vue';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import { getCapacityUtilizationCellStyle } from './capacity-utilization';
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
  constrainedProduction: number;
  unconstrainedProduction: number;
  capacity: number | undefined;
}

/** Identifies the cell whose detail is being presented independently from the async response. */
interface ResourceDetailSelection {
  locationId: string;
  productionResourceId: string;
  periodIndex: number;
  periodLabel: string;
}

const supplyPlans = ref<SupplyPlanOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const materials = ref<NamedOption[]>([]);
const locations = ref<NamedOption[]>([]);
const supplyPlanId = ref<number | null>(null);
const uomId = ref('');
const selectedMaterialIds = ref<string[]>([]);
const selectedLocationIds = ref<string[]>([]);
const selectedProductionResourceIds = ref<string[]>([]);
const overview = ref<ProductionOverview | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingOverview = ref(false);
const errorMessage = ref<string | null>(null);
const resourceDetail = ref<ProductionOverviewResourceDetail | null>(null);
const resourceDetailSelection = ref<ResourceDetailSelection | null>(null);
const isLoadingResourceDetail = ref(false);
const resourceDetailErrorMessage = ref<string | null>(null);
const constrainedResourceTableRef = ref<InstanceType<typeof OfxDataTable> | null>(null);
const unconstrainedResourceTableRef = ref<InstanceType<typeof OfxDataTable> | null>(null);
const resourceDetailTableRef = ref<InstanceType<typeof OfxDataTable> | null>(null);
const exportFormat = ref<OfxExportFormat>('xlsx');
let resourceDetailRequestId = 0;

/** Matches Planning Front: location and material filters are optional and empty means the whole loaded scope. */
const canLoadOverview = computed(() => (
  supplyPlanId.value !== null
  && uomId.value.length > 0
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
const selectedSupplyPlanMeta = computed(() =>
  supplyPlans.value.find((supplyPlan) => supplyPlan.supplyPlanId === supplyPlanId.value),
);
const periodLabels = computed(() => overview.value?.finalDateTimeByPeriod.map((period) => (
  summarizeBucket(period, selectedSupplyPlanMeta.value?.bucketSize)
)) ?? []);
const productionResourceOptions = computed(() => {

  const uniqueResources = new Map<string, { label: string; value: string }>();
  for (const row of resourceRows.value) {
    uniqueResources.set(row.productionResourceId, {
      label: `${row.productionResourceId} - ${row.locationId}`,
      value: row.productionResourceId,
    });
  }

  return [...uniqueResources.values()].sort((left, right) => left.label.localeCompare(right.label));

});

/** Applies the optional slice locally, preserving the whole report whenever no values are selected. */
function isIncludedInSelectedScope(selectedIds: string[], id: string): boolean {

  return selectedIds.length === 0 || selectedIds.includes(id);

}

/** Mirrors the legacy dashboard summaries across the complete selected horizon. */
const summaryCards = computed(() => {

  const periodCount = periodLabels.value.length;
  const averageByPeriod = (key: keyof QuantityRow) => {
    if (periodCount === 0) return 0;
    const total = quantityRows.value.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
    return total / periodCount;
  };
  const selectedUomLabel = uomId.value;
  const formatAverage = (value: number) => `${Math.round(value).toLocaleString('en-US')} ${selectedUomLabel}`.trim();

  return [
    { label: 'Avg Constrained Met Demand', value: formatAverage(averageByPeriod('constrainedDirectDemand')), tone: 'success' as const },
    { label: 'Avg Constrained Production', value: formatAverage(averageByPeriod('constrainedProduction')), tone: 'default' as const },
    { label: 'Avg Unconstrained Met Demand', value: formatAverage(averageByPeriod('unconstrainedDirectDemand')), tone: 'default' as const },
    { label: 'Avg Unconstrained Production', value: formatAverage(averageByPeriod('unconstrainedProduction')), tone: 'default' as const },
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
    legend: { top: 0 },
    grid: { top: 42, right: 18, bottom: 28, left: 42 },
    xAxis: { type: 'category', data: periodLabels.value },
    yAxis: { type: 'value', name: uomId.value },
    series: [
      { name: 'Stock', type: 'line', smooth: false, data: sumForPeriod(`${prefix}Inventory` as keyof QuantityRow), lineStyle: { color: '#7aa2ff', width: 2 }, itemStyle: { color: '#7aa2ff' } },
      { name: 'Direct demand', type: 'bar', stack: plan, data: sumForPeriod(`${prefix}DirectDemand` as keyof QuantityRow), itemStyle: { color: '#ff7f66' }, barMaxWidth: 18 },
      { name: 'Indirect demand', type: 'bar', stack: plan, data: sumForPeriod(`${prefix}IndirectDemand` as keyof QuantityRow), itemStyle: { color: '#f4b860' }, barMaxWidth: 18 },
      { name: 'Inbound', type: 'line', smooth: false, data: sumForPeriod(`${prefix}Inbound` as keyof QuantityRow), lineStyle: { color: '#8b7cff', width: 2 }, itemStyle: { color: '#8b7cff' } },
      { name: 'Production', type: 'line', smooth: false, data: sumForPeriod(`${prefix}Production` as keyof QuantityRow), lineStyle: { color: '#3ad6bf', width: 3 }, itemStyle: { color: '#3ad6bf' } },
    ],
  };

}

const constrainedVolumeOption = computed(() => buildVolumeOption('constrained'));
const unconstrainedVolumeOption = computed(() => buildVolumeOption('unconstrained'));
/**
 * Mirrors the legacy/Planning Front pivot grain. Material and location remain
 * available in the source rows, but the initial view opens aggregated by plan
 * version and metric instead of flooding the first viewport with DFUs.
 */
const pivotRows = computed(() => quantityRows.value.flatMap((row) => [
  ['Constrained', 'Stock', row.constrainedInventory],
  ['Unconstrained', 'Stock', row.unconstrainedInventory],
  ['Gap vs Unconstrained', 'Stock', (row.unconstrainedInventory ?? 0) - (row.constrainedInventory ?? 0)],
  ['Constrained', 'Production', row.constrainedProduction],
  ['Unconstrained', 'Production', row.unconstrainedProduction],
  ['Gap vs Unconstrained', 'Production', (row.unconstrainedProduction ?? 0) - (row.constrainedProduction ?? 0)],
  ['Constrained', 'Inbound', row.constrainedInbound],
  ['Unconstrained', 'Inbound', row.unconstrainedInbound],
  ['Gap vs Unconstrained', 'Inbound', (row.unconstrainedInbound ?? 0) - (row.constrainedInbound ?? 0)],
  ['Constrained', 'Direct demand', row.constrainedDirectDemand],
  ['Unconstrained', 'Direct demand', row.unconstrainedDirectDemand],
  ['Gap vs Unconstrained', 'Direct demand', (row.unconstrainedDirectDemand ?? 0) - (row.constrainedDirectDemand ?? 0)],
  ['Constrained', 'Indirect demand', row.constrainedIndirectDemand],
  ['Unconstrained', 'Indirect demand', row.unconstrainedIndirectDemand],
  ['Gap vs Unconstrained', 'Indirect demand', (row.unconstrainedIndirectDemand ?? 0) - (row.constrainedIndirectDemand ?? 0)],
].flatMap(([planVersion, series, value]) => {
  const numericValue = Number(value ?? 0);
  return numericValue === 0 ? [] : [{
    location: row.locationId,
    material: row.materialId,
    period: row.periodEnd,
    planVersion,
    series,
    value: numericValue,
  }];
})));

/** Joins the two independently published physical blocks by their fixed Community identity. */
const quantityRows = computed<QuantityRow[]>(() => {

  if (overview.value === null) return [];

  const demandByLocationAndMaterial = new Map<string, DirectAndIndirectDemand>();
  for (const demand of overview.value.directAndIndirectDemandByLocationAndMaterialGrouping) {
    demandByLocationAndMaterial.set(`${demand.locationId}\u0000${demand.materialId}`, demand);
  }

  return overview.value.stockAndProductionByLocationAndMaterialGrouping
    .filter((stockAndProduction) => (
      isIncludedInSelectedScope(selectedLocationIds.value, stockAndProduction.locationId)
      && isIncludedInSelectedScope(selectedMaterialIds.value, stockAndProduction.materialId)
    ))
    .flatMap((stockAndProduction) => (
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
    if (!isIncludedInSelectedScope(selectedLocationIds.value, occupation.locationId)
      || !isIncludedInSelectedScope(selectedMaterialIds.value, occupation.materialId)) {
      continue;
    }
    addOccupationRows(occupationByResourcePeriod, occupation, overview.value.finalDateTimeByPeriod, capacityByResource);
  }
  for (const capacity of overview.value.capacityByProductionResource) {
    if (!isIncludedInSelectedScope(selectedLocationIds.value, capacity.locationId)) {
      continue;
    }
    for (const [periodIndex, periodEnd] of overview.value.finalDateTimeByPeriod.entries()) {
      const key = `${resourceKey(capacity.locationId, capacity.productionResourceId)}\u0000${periodIndex}`;
      occupationByResourcePeriod.set(key, occupationByResourcePeriod.get(key) ?? {
        locationId: capacity.locationId,
        productionResourceId: capacity.productionResourceId,
        periodEnd,
        periodIndex,
        constrainedOccupation: 0,
        unconstrainedOccupation: 0,
        constrainedProduction: 0,
        unconstrainedProduction: 0,
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
      constrainedProduction: 0,
      unconstrainedProduction: 0,
      capacity: capacity?.capacityInHoursOrQuantity[periodIndex],
    };
    row.constrainedOccupation += occupation.constrainedOccupationInHoursOrQuantity[periodIndex] ?? 0;
    row.unconstrainedOccupation += occupation.unconstrainedOccupationInHoursOrQuantity[periodIndex] ?? 0;
    row.constrainedProduction += occupation.constrainedProductionQuantity[periodIndex] ?? 0;
    row.unconstrainedProduction += occupation.unconstrainedProductionQuantity[periodIndex] ?? 0;
    rowsByResourcePeriod.set(key, row);
  }

}

/** Applies the public production-resource selector to charts and grids after the report is loaded. */
const selectedResourceRows = computed(() => resourceRows.value.filter((row) => (
  selectedProductionResourceIds.value.length === 0
  || selectedProductionResourceIds.value.includes(row.productionResourceId)
)));

function buildOccupationOption(plan: 'constrained' | 'unconstrained') {

  const capacity = new Array(periodLabels.value.length).fill(0);
  const occupation = new Array(periodLabels.value.length).fill(0);
  const production = new Array(periodLabels.value.length).fill(0);

  for (const row of selectedResourceRows.value) {
    capacity[row.periodIndex] += row.capacity ?? 0;
    occupation[row.periodIndex] += plan === 'constrained' ? row.constrainedOccupation : row.unconstrainedOccupation;
    production[row.periodIndex] += plan === 'constrained' ? row.constrainedProduction : row.unconstrainedProduction;
  }

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 42, right: 42, bottom: 28, left: 42 },
    xAxis: { type: 'category', data: periodLabels.value },
    yAxis: [
      { type: 'value', name: 'Hours' },
      // The secondary production axis provides a distinct physical scale.
      // Its grid must stay hidden, otherwise both axis tick grids overlap and
      // produce the extra horizontal lines visible in the dashboard.
      { type: 'value', name: uomId.value, splitLine: { show: false } },
    ],
    series: [
      { name: 'Total capacity', type: 'bar', data: capacity, itemStyle: { color: 'rgba(185,194,217,0.55)' }, barMaxWidth: 18, yAxisIndex: 0 },
      { name: 'Allocated capacity', type: 'line', smooth: false, data: occupation, lineStyle: { color: '#ff8a65', width: 3 }, itemStyle: { color: '#ff8a65' }, yAxisIndex: 0 },
      { name: 'Production', type: 'line', smooth: false, data: production, lineStyle: { color: '#5b8cff', width: 2 }, itemStyle: { color: '#5b8cff' }, yAxisIndex: 1 },
    ],
  };

}

const constrainedOccupationOption = computed(() => buildOccupationOption('constrained'));
const unconstrainedOccupationOption = computed(() => buildOccupationOption('unconstrained'));

function toCapacityPercent(occupation: number, capacity: number | undefined): number | null {

  return capacity === undefined || !Number.isFinite(capacity) || capacity === 0
    ? null
    : (occupation / capacity) * 100;

}

const resourceColumns = computed<OfxTableColumn[]>(() => [
  { field: 'location', header: 'Location', width: '18%', dataType: 'text' },
  { field: 'resource', header: 'Production resource', width: '20%', dataType: 'text' },
  ...periodLabels.value.map((periodLabel, periodIndex) => ({
    field: `period-${periodIndex}`,
    header: periodLabel,
    width: '11%',
    dataType: 'percent-1' as const,
    cellStyle: ({ value }: { value: unknown }) => ({
      ...(getCapacityUtilizationCellStyle(value) ?? {}),
      cursor: 'pointer',
    }),
  })),
]);

function buildResourceGridRows(plan: 'constrained' | 'unconstrained'): Record<string, unknown>[] {

  const rowsByResource = new Map<string, Record<string, unknown>>();
  for (const row of selectedResourceRows.value) {
    const key = resourceKey(row.locationId, row.productionResourceId);
    const gridRow = rowsByResource.get(key) ?? {
      rowKey: key,
      location: row.locationId,
      locationId: row.locationId,
      resource: row.productionResourceId,
      productionResourceId: row.productionResourceId,
    };
    const occupation = plan === 'constrained' ? row.constrainedOccupation : row.unconstrainedOccupation;
    gridRow[`period-${row.periodIndex}`] = toCapacityPercent(occupation, row.capacity);
    rowsByResource.set(key, gridRow);
  }

  return [...rowsByResource.values()];

}

const constrainedResourceRows = computed(() => buildResourceGridRows('constrained'));
const unconstrainedResourceRows = computed(() => buildResourceGridRows('unconstrained'));

const resourceDetailColumns: OfxTableColumn[] = [
  { field: 'outputMaterialId', header: 'Material', width: '140', minWidth: 130, dataType: 'text' },
  { field: 'outputMaterialDescription', header: 'Description', width: '180', minWidth: 160, dataType: 'text' },
  { field: 'productionVersionId', header: 'Production version', width: '150', minWidth: 140, dataType: 'text' },
  { field: 'routingId', header: 'Routing', width: '130', minWidth: 120, dataType: 'text' },
  { field: 'billOfMaterialsId', header: 'BOM', width: '130', minWidth: 120, dataType: 'text' },
  { field: 'unitOfMeasureId', header: 'UOM', width: '90', minWidth: 80, dataType: 'text' },
  { field: 'unconstrainedQuantity', header: 'Unrestricted qty', width: '140', minWidth: 130, dataType: 'number-2', align: 'right' },
  { field: 'constrainedQuantity', header: 'Restricted qty', width: '130', minWidth: 120, dataType: 'number-2', align: 'right' },
  { field: 'workPlanQuantity', header: 'Work plan qty', width: '130', minWidth: 120, dataType: 'number-2', align: 'right' },
  { field: 'resourceCapacityUnitOfMeasureId', header: 'Capacity UOM', width: '110', minWidth: 100, dataType: 'text' },
  { field: 'unconstrainedHours', header: 'Unrestricted consumption', width: '180', minWidth: 170, dataType: 'number-2', align: 'right' },
  { field: 'constrainedHours', header: 'Restricted consumption', width: '170', minWidth: 160, dataType: 'number-2', align: 'right' },
  { field: 'workPlanHours', header: 'Work plan consumption', width: '170', minWidth: 160, dataType: 'number-2', align: 'right' },
];

const resourceDetailRows = computed<Record<string, unknown>[]>(() => resourceDetail.value?.rows.map((row, index) => ({
  rowKey: `${row.outputMaterialId}::${row.productionVersionId ?? 'no-version'}::${row.routingId}::${row.billOfMaterialsId}::${index}`,
  ...row,
})) ?? []);

/** Presents the selected physical resource in the same compact card hierarchy as Planning Front. */
const resourceDetailSummaryCards = computed(() => {

  const selection = resourceDetailSelection.value;
  if (!selection) return [];

  const detail = resourceDetail.value;
  const capacityUnitOfMeasureId = detail?.resourceCapacityUnitOfMeasureId || 'Hours';
  const availableCapacityLabel = capacityUnitOfMeasureId === 'Hours'
    ? 'Available hours'
    : 'Available capacity';

  return [
    {
      label: 'Production line',
      value: selection.productionResourceId,
      detail: detail?.productionResourceDescription ?? '',
    },
    {
      label: 'Location',
      value: selection.locationId,
      detail: detail?.locationDescription ?? '',
    },
    {
      label: 'Period',
      value: selection.periodLabel,
      detail: '',
    },
    {
      label: availableCapacityLabel,
      value: detail
        ? formatValue(detail.availableCapacityInHoursOrQuantity ?? undefined)
        : 'Loading…',
      detail: capacityUnitOfMeasureId,
    },
  ];

});

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

/** Uses the canonical bucket presentation rather than turning periods into sortable display text. */
function summarizeBucket(period: string, bucketSize: string | null | undefined): string {

  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;

  const bucket = String(bucketSize ?? '').toLowerCase();
  if (bucket.includes('month') || bucket.includes('mensal')) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(date);

}

function formatValue(value: number | undefined): string {

  return value === undefined || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

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
  selectedProductionResourceIds.value = [];

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

  const requestId = ++resourceDetailRequestId;
  resourceDetailSelection.value = {
    locationId: row.locationId,
    productionResourceId: row.productionResourceId,
    periodIndex: row.periodIndex,
    periodLabel: periodLabels.value[row.periodIndex]
      ?? summarizeBucket(row.periodEnd, selectedSupplyPlanMeta.value?.bucketSize),
  };
  isLoadingResourceDetail.value = true;
  resourceDetailErrorMessage.value = null;

  try {
    const detail = await getProductionOverviewResourceDetail(
      supplyPlanId.value,
      row.productionResourceId,
      row.periodIndex,
      selectedMaterialIds.value,
    );
    if (requestId !== resourceDetailRequestId) return;

    resourceDetail.value = detail;
  } catch (error) {
    if (requestId !== resourceDetailRequestId) return;

    resourceDetailErrorMessage.value = error instanceof Error
      ? error.message
      : 'Unable to load Production Overview resource detail.';
  } finally {
    if (requestId === resourceDetailRequestId) {
      isLoadingResourceDetail.value = false;
    }
  }

}

/** Translates a clicked period column back to the backend's zero-based period identity. */
async function loadResourceDetailFromCell(payload: { row: Record<string, unknown>; field: string; value: unknown }): Promise<void> {

  if (!payload.field.startsWith('period-')) return;
  const periodIndex = Number(payload.field.slice('period-'.length));
  const locationId = String(payload.row.locationId ?? '');
  const productionResourceId = String(payload.row.productionResourceId ?? '');
  const row = selectedResourceRows.value.find((candidate) => (
    candidate.locationId === locationId
    && candidate.productionResourceId === productionResourceId
    && candidate.periodIndex === periodIndex
  ));
  if (!row) return;

  await loadResourceDetail(row);

}

function exportConstrainedResourceTable(): void {

  constrainedResourceTableRef.value?.exportData(exportFormat.value);

}

function exportUnconstrainedResourceTable(): void {

  unconstrainedResourceTableRef.value?.exportData(exportFormat.value);

}

function exportResourceDetailTable(): void {

  resourceDetailTableRef.value?.exportData(exportFormat.value);

}

/** A detail belongs to exactly one overview snapshot and physical selection. */
function clearResourceDetail(): void {

  resourceDetailRequestId += 1;
  resourceDetail.value = null;
  resourceDetailSelection.value = null;
  resourceDetailErrorMessage.value = null;
  isLoadingResourceDetail.value = false;

}

watch(
  [supplyPlanId, uomId, selectedMaterialIds, selectedLocationIds, selectedProductionResourceIds],
  clearResourceDetail,
  { deep: true },
);

onMounted(loadSelectors);
</script>

<template>
  <DashboardPageLayout class="occupation-volumes-page">
    <OfxPageHeader eyebrow="Production" title="Production Overview" />

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

        <OfxSectionCard title="Selection - locations and materials" description="Refine the loaded dashboard by location and material. Leave a filter empty to keep all values.">
          <div class="selector-grid">
            <OfxEntityMultiSelect v-model="selectedLocationIds" label="Locations" :options="locationOptions" placeholder="All locations selected" />
            <OfxEntityMultiSelect v-model="selectedMaterialIds" label="Materials" :options="materialOptions" placeholder="All materials selected" />
          </div>
        </OfxSectionCard>
      </div>

      <p v-if="errorMessage && overview" class="error" role="alert">{{ errorMessage }}</p>
      <OfxEmptyState v-if="errorMessage && !overview && !isLoadingOverview" title="Production data unavailable" :description="errorMessage" />
      <OfxEmptyState v-else-if="!overview && !isLoadingOverview" title="Select plan and unit to open the dashboard" description="Choose a Supply Plan version and unit of measure, then click Open Dashboard." />
      <div v-else-if="isLoadingOverview" class="dashboard-state">Running the Production Overview report…</div>

      <template v-else-if="overview">
        <div class="kpi-grid"><OfxKpiCard v-for="card in summaryCards" :key="card.label" :label="card.label" :value="card.value" :tone="card.tone" /></div>

        <div class="chart-grid">
          <OfxSectionCard title="Stock, demand, inbound and production - Constrained"><EChartAdapter :option="constrainedVolumeOption" :height="340" /></OfxSectionCard>
          <OfxSectionCard title="Stock, demand, inbound and production - Unconstrained"><EChartAdapter :option="unconstrainedVolumeOption" :height="340" /></OfxSectionCard>
        </div>

        <OfxSectionCard title="Pivot Table">
          <OfxPivotTable :data="pivotRows" :rows="['planVersion', 'series']" :columns="['period']" :measures="[{ field: 'value', label: 'Quantity', aggregation: 'sum', allowAggregationChange: false, allowedAggregations: ['sum'] }]" :temporal-bucket-size="selectedSupplyPlanMeta?.bucketSize" :height="440" :allow-measure-selection="false" :allow-aggregation-selection="false" :show-measure-controls="false" :show-totals-controls="false" :open-settings-by-default="false" :allow-split-by-selection="false" :show-datagrid-toolbar="false" :show-reset-control="false" :show-plugin-selector="false" :show-plugin-settings-control="false" :show-all-columns-section="false" :show-expressions-section="false" :show-status-metrics="false" :show-title-field="false" :show-actions="false" group-rollup-mode="flat" :allow-group-rollup-mode-selection="true" :hide-grand-totals="true" base-name="production-overview-pivot" />
        </OfxSectionCard>

        <OfxSectionCard title="Production Capacity - Production Resources Selection" description="Filters used to narrow the occupation charts and resource grids.">
          <OfxEntityMultiSelect
            v-model="selectedProductionResourceIds"
            label="Production resources"
            :options="productionResourceOptions"
            placeholder="All resources selected"
            help-text="The available list follows the selected locations, just like the Planning Front flow."
          />
        </OfxSectionCard>

        <div class="chart-grid">
          <OfxSectionCard title="Production volume / Occupation - Constrained" description="Capacity availability / consumption on the primary axis and production on the secondary axis.">
            <EChartAdapter :option="constrainedOccupationOption" :height="340" />
          </OfxSectionCard>
          <OfxSectionCard title="Production volume / Occupation - Unconstrained" description="Capacity availability / consumption on the primary axis and production on the secondary axis.">
            <EChartAdapter :option="unconstrainedOccupationOption" :height="340" />
          </OfxSectionCard>
        </div>

        <div class="chart-grid">
          <OfxSectionCard title="Occupation by Production Resource - Constrained">
            <div v-if="constrainedResourceRows.length" class="table-stack">
              <OfxTableToolbar :download-format="exportFormat" @update:download-format="exportFormat = $event" @download="exportConstrainedResourceTable" />
              <OfxDataTable
                ref="constrainedResourceTableRef"
                :rows="constrainedResourceRows"
                :columns="resourceColumns"
                row-key="rowKey"
                :dense="true"
                :page-size="10"
                text-size="xs"
                export-base-name="occupation-by-resource-constrained"
                @cell-click="loadResourceDetailFromCell"
              />
            </div>
            <OfxEmptyState v-else title="No constrained resource rows" description="The current slice produced no constrained capacity rows for the selected locations and resources." />
          </OfxSectionCard>
          <OfxSectionCard title="Occupation by Production Resource - Unconstrained">
            <div v-if="unconstrainedResourceRows.length" class="table-stack">
              <OfxTableToolbar :download-format="exportFormat" @update:download-format="exportFormat = $event" @download="exportUnconstrainedResourceTable" />
              <OfxDataTable
                ref="unconstrainedResourceTableRef"
                :rows="unconstrainedResourceRows"
                :columns="resourceColumns"
                row-key="rowKey"
                :dense="true"
                :page-size="10"
                text-size="xs"
                export-base-name="occupation-by-resource-unconstrained"
                @cell-click="loadResourceDetailFromCell"
              />
            </div>
            <OfxEmptyState v-else title="No unconstrained resource rows" description="The current slice produced no unconstrained capacity rows for the selected locations and resources." />
          </OfxSectionCard>
        </div>

        <OfxSectionCard v-if="resourceDetailSelection" title="Production Resource Detail">
          <div class="detail-workspace">
            <div class="detail-summary-row">
              <div class="detail-summary-cards">
                <div v-for="card in resourceDetailSummaryCards" :key="card.label" class="detail-summary-card">
                  <div class="detail-summary-label">{{ card.label }}</div>
                  <div class="detail-summary-value">{{ card.value }}</div>
                  <div v-if="card.detail" class="detail-summary-description">{{ card.detail }}</div>
                </div>
              </div>
              <OfxTableToolbar v-if="resourceDetailRows.length" :download-format="exportFormat" @update:download-format="exportFormat = $event" @download="exportResourceDetailTable" />
            </div>

          <p v-if="isLoadingResourceDetail" class="muted" aria-live="polite">Loading selected production resource detail…</p>
          <OfxEmptyState v-if="!resourceDetail && resourceDetailErrorMessage" title="Production resource detail unavailable" :description="resourceDetailErrorMessage" />
          <p v-else-if="resourceDetailErrorMessage" class="error" role="alert">{{ resourceDetailErrorMessage }}</p>
          <template v-if="resourceDetail">
            <OfxEmptyState v-if="!resourceDetailRows.length" title="No allocation details" description="No production lines were returned for this resource, period and selected material scope." />
            <OfxDataTable v-else ref="resourceDetailTableRef" :rows="resourceDetailRows" :columns="resourceDetailColumns" row-key="rowKey" :dense="true" :page-size="12" text-size="xs" export-base-name="production-resource-detail" />
          </template>
          </div>
        </OfxSectionCard>
      </template>
    </template>
  </DashboardPageLayout>
</template>

<style scoped>
.occupation-volumes-page { display: grid; gap: 1.5rem; }
.dashboard-selection-grid, .chart-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.selector-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
.selector-actions { align-self: end; display: flex; min-height: 2.5rem; }
.selector-actions .primary-button { justify-content: center; width: 100%; }
.kpi-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.dashboard-state { border: 1px dashed var(--ofx-border); border-radius: 12px; color: var(--ofx-text-muted); padding: 2rem; text-align: center; }
.primary-button { display: inline-flex; min-height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); color: var(--ofx-text); cursor: pointer; padding: .45rem .9rem; font-size: .875rem; font-weight: 600; }
.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }
.primary-button:disabled { cursor: not-allowed; opacity: .5; }
.table-stack { display: grid; gap: .5rem; }
.detail-workspace { display: grid; gap: .75rem; }
.detail-summary-row { align-items: start; display: flex; gap: .75rem; justify-content: space-between; }
.detail-summary-cards { display: grid; flex: 1; gap: .75rem; grid-template-columns: repeat(4, minmax(0, 1fr)); min-width: 0; }
.detail-summary-card { background: var(--ofx-surface-elevated); border: 1px solid var(--ofx-border); border-radius: 8px; box-shadow: var(--ofx-shadow-sm); min-height: 78px; min-width: 0; padding: .75rem; }
.detail-summary-label { color: var(--ofx-text-muted); font-size: .6875rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.detail-summary-value { color: var(--ofx-text-strong); font-size: 1rem; font-weight: 600; margin-top: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-summary-description { color: var(--ofx-text-muted); font-size: .75rem; margin-top: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muted { color: var(--ofx-text-muted); }
.error { color: #b42318; }
@media (max-width: 1100px) { .dashboard-selection-grid, .chart-grid { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .detail-summary-row { flex-direction: column; } .detail-summary-cards { width: 100%; } }
@media (max-width: 700px) { .selector-grid, .kpi-grid, .detail-summary-cards { grid-template-columns: 1fr; } }
</style>
