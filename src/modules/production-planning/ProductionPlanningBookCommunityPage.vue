<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { PlanningBookVirtualGrid, type PlanningBookVirtualGridColumn } from '@opsfactor/front-planning-book';
import { OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import {
  getProductionPlanningBook,
  getProductionPlanningBookSelectors,
  updateProductionPlanningBook,
} from './production-planning-book.service';
import {
  isValidPlannedQuantity,
  buildProductionPlanningBookRichRows,
  type ProductionPlanningBook,
  type ProductionPlanningLocationOption,
  type ProductionPlanningMaterial,
  type ProductionPlanningResource,
  type ProductionPlanningSupplyPlanOption,
  type ProductionPlanningBookRichRow,
} from './production-planning-book.types';

const supplyPlans = ref<ProductionPlanningSupplyPlanOption[]>([]);
const locations = ref<ProductionPlanningLocationOption[]>([]);
const selectedSupplyPlanId = ref<number | null>(null);
const selectedLocationId = ref('');
const planningBook = ref<ProductionPlanningBook | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingBook = ref(false);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);

const canOpenPlanningBook = computed(() => selectedSupplyPlanId.value !== null && selectedLocationId.value.length > 0);
const richRows = computed(() => planningBook.value === null ? [] : buildProductionPlanningBookRichRows(planningBook.value));
const richColumns = computed<PlanningBookVirtualGridColumn<ProductionPlanningBookRichRow>[]>(() => [
  {
    id: 'production-row', label: 'Resource / material', width: '22rem', hierarchy: true,
    getValue: (row) => row.rowLabel,
  },
  { id: 'uom', label: 'Unit', width: '6rem', getValue: (row) => row.unitOfMeasure },
  ...(planningBook.value?.periodEndDates ?? []).map((periodEndDate) => ({
    id: `period:${periodEndDate}`, label: formatPeriod(periodEndDate), width: '8rem',
    getValue: (row: ProductionPlanningBookRichRow) => row.values[periodEndDate],
  })),
]);

function errorText(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function supplyPlanLabel(supplyPlan: ProductionPlanningSupplyPlanOption): string {

  return supplyPlan.description?.trim()
    ? `#${supplyPlan.supplyPlanId} — ${supplyPlan.description}`
    : `Supply Plan #${supplyPlan.supplyPlanId}`;
}

function locationLabel(location: ProductionPlanningLocationOption): string {

  return location.description?.trim() ? `${location.id} — ${location.description}` : location.id;
}

function formatPeriod(value: string): string {

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatNumber(value: number | null | undefined): string {

  return value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function isProductionPeriodColumn(column: PlanningBookVirtualGridColumn<ProductionPlanningBookRichRow>): boolean {

  return column.id.startsWith('period:');
}

function productionPeriodEndDate(column: PlanningBookVirtualGridColumn<ProductionPlanningBookRichRow>): string {

  return column.id.slice('period:'.length);
}

async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getProductionPlanningBookSelectors();
    supplyPlans.value = selectors.supplyPlans;
    locations.value = selectors.locations;
    selectedSupplyPlanId.value ??= selectors.supplyPlans[0]?.supplyPlanId ?? null;
    selectedLocationId.value ||= selectors.locations[0]?.id ?? '';
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to load Production Planning Book selectors.');
  } finally {
    isLoadingSelectors.value = false;
  }
}

async function openPlanningBook(): Promise<void> {

  if (!canOpenPlanningBook.value || selectedSupplyPlanId.value === null) return;

  isLoadingBook.value = true;
  errorMessage.value = null;

  try {
    planningBook.value = await getProductionPlanningBook(selectedLocationId.value, selectedSupplyPlanId.value);
  } catch (error) {
    planningBook.value = null;
    errorMessage.value = errorText(error, 'Unable to load the Production Planning Book.');
  } finally {
    isLoadingBook.value = false;
  }
}

async function savePlannedQuantity(
  resource: ProductionPlanningResource,
  material: ProductionPlanningMaterial,
  periodEndDate: string,
  rawValue: string,
): Promise<void> {

  if (planningBook.value === null || isSaving.value) return;

  /* Number('') is zero in JavaScript; reject an empty edit instead of inventing production. */
  const normalizedValue = rawValue.trim();
  const plannedQuantity = Number(normalizedValue);
  if (normalizedValue.length === 0 || !isValidPlannedQuantity(plannedQuantity)) {
    errorMessage.value = 'Planned production must be a finite quantity greater than or equal to zero.';
    return;
  }

  const periodIndex = planningBook.value.periodEndDates.indexOf(periodEndDate);
  const previousQuantity = material.plannedQuantityByPeriod[periodIndex];
  if (previousQuantity === plannedQuantity) return;

  isSaving.value = true;
  errorMessage.value = null;

  try {
    /* The response is the complete recalculated book and replaces stale local data. */
    planningBook.value = await updateProductionPlanningBook({
      supplyPlanId: planningBook.value.supplyPlanId,
      locationId: planningBook.value.locationId,
      materialId: material.materialId,
      productionResourceId: resource.productionResourceId,
      periodEndDate,
      plannedQuantity,
    });
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to save the planned production change.');
  } finally {
    isSaving.value = false;
  }
}

/** Returns from the production workbook to the reference-style selector state. */
function leavePlanningBook(): void {

  planningBook.value = null;
}

onMounted(loadSelectors);
</script>

<template>
  <DashboardPageLayout class="production-planning-book-page">
    <OfxPageHeader v-if="!planningBook" eyebrow="Production" title="Planning Book" description="Aggregate resource capacity in hours and Working Plan planned production.">
      <template #actions><button class="secondary-button" :disabled="isLoadingSelectors || isSaving" @click="loadSelectors">Refresh selectors</button></template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="!planningBook" title="Workbook Selection" description="Select the Supply Plan and the enabled production location.">
      <div class="selection-grid">
      <label class="field-label">Supply Plan
        <select v-model.number="selectedSupplyPlanId" :disabled="isLoadingSelectors || isSaving">
          <option :value="null">Select a Supply Plan</option>
          <option v-for="supplyPlan in supplyPlans" :key="supplyPlan.supplyPlanId" :value="supplyPlan.supplyPlanId">{{ supplyPlanLabel(supplyPlan) }}</option>
        </select>
      </label>
      <label class="field-label">Production location
        <select v-model="selectedLocationId" :disabled="isLoadingSelectors || isSaving">
          <option value="">Select a production location</option>
          <option v-for="location in locations" :key="location.id" :value="location.id">{{ locationLabel(location) }}</option>
        </select>
      </label>
      <div class="selection-open"><button class="primary-button" :disabled="!canOpenPlanningBook || isLoadingBook || isSaving" @click="openPlanningBook">{{ isLoadingBook ? 'Loading…' : 'Open Planning Book' }}</button></div>
      </div>
    </OfxSectionCard>

    <p v-if="!planningBook && !isLoadingSelectors && !locations.length" class="muted">No location is enabled for the Production Planning Book.</p>

    <section v-if="planningBook" class="planning-book-workspace-header">
      <div><div class="planning-book-workspace-eyebrow">Production Planning Workspace</div><div class="planning-book-workspace-meta">Supply Plan #{{ planningBook.supplyPlanId }} <span>•</span> {{ planningBook.locationId }} <span>•</span> Community</div></div>
      <button class="secondary-button" type="button" :disabled="isSaving" @click="leavePlanningBook">Reopen selection</button>
    </section>

    <OfxSectionCard v-if="planningBook" class="mt-5" :title="`${planningBook.locationId} · Supply Plan #${planningBook.supplyPlanId}`" description="Capacity is always hours. Only planned production can be edited.">

      <p v-if="!planningBook.resources.length" class="muted">No active production resource is available for this location.</p>
      <PlanningBookVirtualGrid v-else :rows="richRows" :columns="richColumns" :busy="isSaving">
        <template #cell="{ row, column, value }">
          <strong v-if="column.id === 'production-row' && row.rowType === 'resourceCapacity'">{{ value }}</strong>
          <span v-else-if="column.id === 'production-row'">{{ value }}</span>
          <template v-else-if="isProductionPeriodColumn(column)">
            <input
              v-if="row.rowType === 'materialProduction' && row.material"
              :value="row.values[productionPeriodEndDate(column)]"
              type="number"
              min="0"
              step="any"
              :disabled="isSaving"
              :aria-label="`Planned production for ${row.material.materialId} at ${productionPeriodEndDate(column)}`"
              @change="savePlannedQuantity(row.resource, row.material, productionPeriodEndDate(column), ($event.target as HTMLInputElement).value)"
            />
            <span v-else>{{ formatNumber(value as number | null | undefined) }}</span>
          </template>
          <span v-else>{{ value }}</span>
        </template>
      </PlanningBookVirtualGrid>
      <template #actions><button class="secondary-button" :disabled="isLoadingBook || isSaving" @click="openPlanningBook">Reload</button></template>
    </OfxSectionCard>
  </DashboardPageLayout>
</template>

<style scoped>
.selection-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.selection-open { align-self: end; display: flex; min-height: 2.5rem; }.selection-open .primary-button { width: 100%; justify-content: center; }.field-label { display: grid; gap: .5rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }.field-label select, input { border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .55rem .75rem; color: var(--ofx-text); }.primary-button, .secondary-button { display: inline-flex; min-height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .9rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }.community-planning-book-rich-grid :deep(input) { min-width: 7rem; width: 7rem; }.planning-book-workspace-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.25rem 0; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-surface-elevated); padding: 1rem 1.25rem; }.planning-book-workspace-eyebrow { color: var(--ofx-text-muted); font-size: .6875rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }.planning-book-workspace-meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .35rem; color: var(--ofx-text); font-size: .8125rem; font-weight: 600; }.planning-book-workspace-meta span { color: var(--ofx-text-muted); }.muted { color: var(--ofx-text-muted); }.message { margin-top: 1.25rem; border-radius: 14px; padding: .85rem 1rem; font-size: .875rem; }.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }
</style>
