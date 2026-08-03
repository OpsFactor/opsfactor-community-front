<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxEmptyState, OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import EChartAdapter from '@/wrappers/echarts/EChartAdapter.vue';
import { getInventoryOverview, getInventoryOverviewSelectors } from './inventory-overview.service';
import type {
  InventoryOverview,
  LocationOption,
  MaterialOption,
  PostHorizonPolicy,
  SupplyPlanOption,
} from './inventory-overview.types';

const supplyPlans = ref<SupplyPlanOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const materials = ref<MaterialOption[]>([]);
const locations = ref<LocationOption[]>([]);
const supplyPlanId = ref<number | null>(null);
const unitOfMeasureId = ref('');
const materialIds = ref<string[]>([]);
const locationIds = ref<string[]>([]);
const postHorizonPolicy = ref<PostHorizonPolicy>('LIMIT_TO_PLANNING_HORIZON');
const inventoryOverview = ref<InventoryOverview | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingOverview = ref(false);
const errorMessage = ref<string | null>(null);

/** The backend accepts an empty list as the complete active scope. */
const activeMaterials = computed(() => materials.value.filter((material) => material.active !== false));
const activeLocations = computed(() => locations.value.filter((location) => location.active !== false));
const canLoadOverview = computed(() => supplyPlanId.value !== null && unitOfMeasureId.value.length > 0);
const periodLabels = computed(() => inventoryOverview.value?.periods.map((period) => formatDate(period.periodEnd)) ?? []);
const openedPrimaryAxisLabel = 'Quantity';

/**
 * Community receives only the physical snapshot. These charts deliberately
 * mirror the constrained/unconstrained visual comparison without inventing
 * financial, write-off, or material-location detail series from the legacy
 * Enterprise report.
 */
function buildInventoryChartOption(plan: 'constrained' | 'unconstrained') {

  const periods = inventoryOverview.value?.periods ?? [];
  const isConstrained = plan === 'constrained';
  const stock = periods.map((period) => (
    isConstrained ? period.constrainedProjectedStock : period.unconstrainedProjectedStock
  ));
  const daysOfSupply = periods.map((period) => (
    isConstrained ? period.constrainedDaysOfSupply : period.unconstrainedDaysOfSupply
  ));

  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 42, left: 52, right: 52, bottom: 42 },
    xAxis: { type: 'category', data: periodLabels.value, axisLabel: { rotate: 25 } },
    yAxis: [
      { type: 'value', name: 'Days of supply' },
      { type: 'value', name: inventoryOverview.value?.unitOfMeasureId ?? '', position: 'right' },
    ],
    series: [
      {
        name: 'Days of supply',
        type: 'line',
        data: daysOfSupply,
        smooth: true,
        lineStyle: { color: '#d88717', width: 2 },
        itemStyle: { color: '#d88717' },
      },
      {
        name: 'Projected stock',
        type: 'line',
        yAxisIndex: 1,
        data: stock,
        smooth: true,
        lineStyle: { color: '#2563eb', width: 2 },
        itemStyle: { color: '#2563eb' },
      },
    ],
  };
}

const constrainedChartOption = computed(() => buildInventoryChartOption('constrained'));
const unconstrainedChartOption = computed(() => buildInventoryChartOption('unconstrained'));

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
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatValue(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function clearMaterialFilter(): void {
  materialIds.value = [];
}

function clearLocationFilter(): void {
  locationIds.value = [];
}

async function loadSelectors(): Promise<void> {
  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getInventoryOverviewSelectors();
    supplyPlans.value = selectors.supplyPlans;
    unitOfMeasureIds.value = selectors.unitOfMeasureIds;
    materials.value = selectors.materials;
    locations.value = selectors.locations;
    supplyPlanId.value ??= selectors.supplyPlans[0]?.supplyPlanId ?? null;
    unitOfMeasureId.value ||= selectors.unitOfMeasureIds[0] ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Inventory Overview selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }
}

async function loadOverview(): Promise<void> {
  if (!canLoadOverview.value || supplyPlanId.value === null) {
    return;
  }

  isLoadingOverview.value = true;
  errorMessage.value = null;

  try {
    inventoryOverview.value = await getInventoryOverview({
      supplyPlanId: supplyPlanId.value,
      unitOfMeasureId: unitOfMeasureId.value,
      materialIds: materialIds.value,
      locationIds: locationIds.value,
      postHorizonPolicy: postHorizonPolicy.value,
    });
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
    <OfxPageHeader eyebrow="Visibility" title="Inventory Overview" description="Open a detailed inventory snapshot, then narrow charts and the pivot locally without another report request.">
      <template #actions><button class="secondary-button" :disabled="isLoadingSelectors || isLoadingOverview" @click="loadSelectors">Refresh selectors</button></template>
    </OfxPageHeader>

    <p v-if="errorMessage && inventoryOverview" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard title="Initial selection" description="This scope is sent once to the backend. Empty material or location selections include the complete active scope.">
      <div class="grid gap-4 lg:grid-cols-3">
        <label class="field-label">Supply Plan
        <select v-model.number="supplyPlanId" :disabled="isLoadingSelectors">
          <option v-for="supplyPlan in supplyPlans" :key="supplyPlan.supplyPlanId" :value="supplyPlan.supplyPlanId">{{ supplyPlanLabel(supplyPlan) }}</option>
        </select>
      </label>
      <label class="field-label">Unit of measure
        <select v-model="unitOfMeasureId" :disabled="isLoadingSelectors">
          <option v-for="uom in unitOfMeasureIds" :key="uom" :value="uom">{{ uom }}</option>
        </select>
      </label>
      <label class="field-label">Primary axis
        <select disabled aria-label="Primary axis available in the current edition">
          <option>Quantity</option>
          <option>Value at cost — Enterprise</option>
        </select>
        <span><strong class="enterprise-badge">Enterprise</strong> Financial value is available in the Enterprise detailed report.</span>
      </label>
      <label class="field-label">Demand after planning horizon
        <select v-model="postHorizonPolicy">
          <option value="LIMIT_TO_PLANNING_HORIZON">Limit coverage to planning horizon</option>
          <option value="AVERAGE_ALL_PERIODS">Continue using average daily consumption</option>
        </select>
      </label>
      <label class="field-label">Materials <span>optional</span>
        <select v-model="materialIds" multiple :disabled="isLoadingSelectors" aria-label="Filter materials">
          <option v-for="material in activeMaterials" :key="material.id" :value="material.id">{{ selectorLabel(material) }}</option>
        </select>
      </label>
      <label class="field-label">Locations <span>optional</span>
        <select v-model="locationIds" multiple :disabled="isLoadingSelectors" aria-label="Filter locations">
          <option v-for="location in activeLocations" :key="location.id" :value="location.id">{{ selectorLabel(location) }}</option>
        </select>
      </label>
      </div>
      <template #actions><div class="flex flex-wrap gap-3">
        <button class="secondary-button" :disabled="!materialIds.length" @click="clearMaterialFilter">All active materials</button>
        <button class="secondary-button" :disabled="!locationIds.length" @click="clearLocationFilter">All active locations</button>
        <button class="primary-button" :disabled="!canLoadOverview || isLoadingOverview" @click="loadOverview">{{ isLoadingOverview ? 'Loading...' : inventoryOverview ? 'Reload detailed snapshot' : 'Open detailed snapshot' }}</button>
      </div></template>
    </OfxSectionCard>

    <OfxEmptyState v-if="!isLoadingSelectors && errorMessage && !inventoryOverview" class="mt-6" title="Inventory Overview unavailable" :description="errorMessage" />
    <OfxEmptyState v-else-if="!isLoadingSelectors && !inventoryOverview" class="mt-6" title="Select the initial scope to open the report" description="The report opens one detailed material/location snapshot; later analysis filters stay in the browser." />
    <template v-else-if="inventoryOverview">
      <div v-if="inventoryOverview.periods.length" class="mt-6 grid gap-6 xl:grid-cols-2">
        <OfxSectionCard :title="`Inventory and days of supply - Constrained (${openedPrimaryAxisLabel})`" description="Projected physical stock and calendar coverage for the constrained plan.">
          <EChartAdapter :option="constrainedChartOption" :height="340" />
        </OfxSectionCard>
        <OfxSectionCard :title="`Inventory and days of supply - Unconstrained (${openedPrimaryAxisLabel})`" description="Projected physical stock and calendar coverage without supply constraints.">
          <EChartAdapter :option="unconstrainedChartOption" :height="340" />
        </OfxSectionCard>
      </div>

      <OfxSectionCard class="mt-6" title="Analysis filters" description="Detailed material/location analysis, characteristics and local pivot exploration belong to Enterprise.">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="enterprise-filter-label">Locations
            <select disabled aria-label="Enterprise analysis locations"><option>All loaded locations</option></select>
          </label>
          <label class="enterprise-filter-label">Location characteristics
            <select disabled aria-label="Enterprise location characteristics"><option>Refine by characteristic</option></select>
          </label>
          <label class="enterprise-filter-label">Materials
            <select disabled aria-label="Enterprise analysis materials"><option>All loaded materials</option></select>
          </label>
          <label class="enterprise-filter-label">Material characteristics
            <select disabled aria-label="Enterprise material characteristics"><option>Refine by characteristic</option></select>
          </label>
        </div>
        <div class="enterprise-gate mt-4" aria-disabled="true">
          <div>
            <strong>Detailed inventory exploration</strong>
            <p>Open one detailed material/location snapshot and refine it locally without changing the original selection.</p>
          </div>
          <span class="enterprise-badge">Enterprise</span>
        </div>
      </OfxSectionCard>

      <OfxSectionCard class="mt-6" title="Inventory analysis" description="Days of Supply are calendar days, calculated from each period-end stock balance.">
      <p v-if="!inventoryOverview.periods.length" class="muted">The selected Supply Plan has no projected periods.</p>
      <template v-else>
        <label class="enterprise-filter-label mb-4 max-w-sm">Show in table
          <select disabled aria-label="Enterprise table metric"><option>Constrained projected stock</option></select>
          <span><strong class="enterprise-badge">Enterprise</strong> Detailed local pivot and alternate metrics are available in Enterprise.</span>
        </label>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Period end</th>
                <th scope="col">Constrained projected stock</th>
                <th scope="col">Unconstrained projected stock</th>
                <th scope="col">Constrained Days of Supply <small>(calendar days)</small></th>
                <th scope="col">Unconstrained Days of Supply <small>(calendar days)</small></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in inventoryOverview.periods" :key="period.periodEnd">
                <td>{{ formatDate(period.periodEnd) }}</td>
                <td>{{ formatValue(period.constrainedProjectedStock) }}</td>
                <td>{{ formatValue(period.unconstrainedProjectedStock) }}</td>
                <td>{{ formatValue(period.constrainedDaysOfSupply) }}</td>
                <td>{{ formatValue(period.unconstrainedDaysOfSupply) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #actions><span class="uom-badge">{{ inventoryOverview.unitOfMeasureId }}</span></template>
      </OfxSectionCard>
    </template>
  </DashboardPageLayout>
</template>

<style scoped>
.field-label,
.enterprise-filter-label {
  display: grid;
  gap: .5rem;
  color: var(--ofx-text);
  font-size: 13px;
  font-weight: 500;
}

.field-label select,
.enterprise-filter-label select {
  min-height: 2.5rem;
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: .45rem .75rem;
  color: var(--ofx-text);
}

.field-label select[multiple] {
  min-height: 9rem;
}

.field-label span,
.enterprise-filter-label span,
.muted {
  color: var(--ofx-text-muted);
  font-size: .8125rem;
}

.enterprise-filter-label {
  border: 1px dashed var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-muted);
  padding: .75rem;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  height: 2.5rem;
  align-items: center;
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: 0 1rem;
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
}

.primary-button {
  border-color: var(--ofx-primary);
  background: var(--ofx-primary);
  color: var(--ofx-primary-foreground);
}

.primary-button:disabled,
.secondary-button:disabled,
select:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.message {
  border-radius: 14px;
  padding: .85rem 1rem;
  font-size: .875rem;
}

.message-error {
  border: 1px solid #f0b7b2;
  background: #fff8f7;
  color: #b42318;
}

.uom-badge,
.enterprise-badge {
  border-radius: 999px;
  background: var(--ofx-muted);
  padding: .35rem .65rem;
  color: var(--ofx-text-muted);
  font-size: .75rem;
  font-weight: 700;
}

.enterprise-badge {
  display: inline-flex;
  margin-right: .35rem;
  border: 1px solid var(--ofx-border);
}

.enterprise-gate {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px dashed var(--ofx-border);
  border-radius: 12px;
  padding: 1rem;
  opacity: .72;
}

.enterprise-gate p {
  margin: .35rem 0 0;
  color: var(--ofx-text-muted);
  font-size: .875rem;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  border-top: 1px solid var(--ofx-border);
  padding: .8rem .65rem;
  vertical-align: top;
  white-space: nowrap;
}

th {
  color: var(--ofx-text-muted);
  font-size: .75rem;
  text-transform: uppercase;
}

th small {
  color: var(--ofx-text-muted);
}
</style>
