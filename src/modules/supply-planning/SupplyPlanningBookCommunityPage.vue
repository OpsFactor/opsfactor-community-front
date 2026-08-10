<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRuntimeInfoStore } from '@opsfactor/front-core';
import { PlanningBookVirtualGrid, type PlanningBookVirtualGridColumn } from '@opsfactor/front-planning-book';
import { OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import { buildCommunityPlanningBookRichRows } from '../planning-books/community-planning-book-grid-rich.utils';
import {
  getSupplyPlanningBookCatalog,
  loadSupplyPlanningBook,
  loadSupplyPlanningBookCellDetails,
  saveSupplyPlanningBookCell,
  saveSupplyPlanningBookCellDetails,
} from './supply-planning-book.service';
import {
  flattenSupplyPlanningBook,
  getSupplyPlanningBookPeriodColumns,
  isSupplyPlanningBookCellEditMode,
  isSupplyPlanningBookDetailQuantityEditable,
  resolveSupplyPlanningBookPeriod,
  supportsSupplyPlanningBookDetails,
} from './supply-planning-book.utils';
import type {
  SupplyPlanOption,
  SupplyPlanningBook,
  SupplyPlanningBookCellUpdate,
  SupplyPlanningBookCellDetails,
  SupplyPlanningBookDetailSelection,
  SupplyPlanningBookLocation,
  SupplyPlanningBookRow,
  SupplyPlanningBookView,
} from './supply-planning-book.types';

const COMMUNITY_EDITABLE_KEY_FIGURES = new Set([
  'Stock-Working Plan',
  'Planned Production-Working Plan',
  'Planned Inbound-Working Plan',
]);

const runtimeInfoStore = useRuntimeInfoStore();
const supplyPlans = ref<SupplyPlanOption[]>([]);
const planningBookViews = ref<SupplyPlanningBookView[]>([]);
const locations = ref<SupplyPlanningBookLocation[]>([]);
const selectedPlanId = ref('');
const selectedViewName = ref('');
const selectedLocationId = ref('');
const planningBook = ref<SupplyPlanningBook | null>(null);
const isLoadingOptions = ref(true);
const isLoadingBook = ref(false);
const isSaving = ref(false);
const isLoadingDetails = ref(false);
const isSavingDetails = ref(false);
const errorMessage = ref<string | null>(null);
const cellDetails = ref<SupplyPlanningBookCellDetails | null>(null);
const detailSelection = ref<SupplyPlanningBookDetailSelection | null>(null);

const backendEditableKeyFigures = computed(() => new Set(runtimeInfoStore.runtimeInfo?.editableSupplyPlanningBookKeyFigures ?? []));
const rows = computed(() => planningBook.value === null ? [] : buildCommunityPlanningBookRichRows(flattenSupplyPlanningBook(planningBook.value)));
const periodColumns = computed(() => planningBook.value === null ? [] : getSupplyPlanningBookPeriodColumns(planningBook.value));
const descriptorColumns = computed(() => planningBook.value?.columnDefs.filter((column) => !column.dataColumn && column.field !== 'keyFigure') ?? []);
const planningBookGridColumns = computed<PlanningBookVirtualGridColumn<(typeof rows.value)[number]>[]>(() => [
  ...descriptorColumns.value.map((column) => ({
    id: `descriptor:${column.field}`,
    label: column.name,
    cellClass: 'supply-planning-book__descriptor-cell',
    getValue: (row: SupplyPlanningBookRow) => column.field === 'uom'
      ? planningBook.value?.uom ?? '—'
      : row.locationDescriptionCols[column.field]
        || row.materialDescriptionCols[column.field]
        || '—',
  })),
  {
    id: 'key-figure',
    label: 'Key figure',
    width: '15rem',
    hierarchy: true,
    cellClass: 'supply-planning-book__key-figure-cell',
    getValue: (row: SupplyPlanningBookRow) => row.keyFigure,
  },
  ...periodColumns.value.map((column) => ({
    id: `period:${column.field}`,
    label: column.name,
    cellClass: 'supply-planning-book__period-cell',
    getValue: (row: SupplyPlanningBookRow) => row.values[column.field],
  })),
]);
const canOpenPlanningBook = computed(() => selectedPlanId.value !== '' && selectedViewName.value !== '' && selectedLocationId.value !== '' && runtimeInfoStore.runtimeInfo !== null);
const canSaveDetails = computed(() => detailSelection.value !== null
  && cellDetails.value !== null
  && cellDetails.value.detailLines.some((detailLine) =>
    isSupplyPlanningBookDetailQuantityEditable(detailSelection.value!.keyFigure, detailLine),
  ));

function errorText(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function isEditable(row: SupplyPlanningBookRow, field: string): boolean {

  const periodColumn = periodColumns.value.find((column) => column.field === field);

  return COMMUNITY_EDITABLE_KEY_FIGURES.has(row.keyFigure)
    && backendEditableKeyFigures.value.has(row.keyFigure)
    && isSupplyPlanningBookCellEditMode(row.editMode)
    && periodColumn?.enableCellEdit !== false
    && row.unavailableReasons[field] === undefined
    && !row.additionalClasses[field]?.includes('crosshatch');
}

/** Identifies the product-owned period cells rendered through the rich Community grid. */
function isPeriodGridColumn(column: PlanningBookVirtualGridColumn<(typeof rows.value)[number]>): boolean {

  return column.id.startsWith('period:');
}

/** Extracts the unmodified backend field name from a presentation-only column id. */
function planningBookGridField(column: PlanningBookVirtualGridColumn<(typeof rows.value)[number]>): string {

  return column.id.slice('period:'.length);
}

async function loadOptions(): Promise<void> {

  isLoadingOptions.value = true;
  errorMessage.value = null;

  try {
    const catalog = await getSupplyPlanningBookCatalog();
    supplyPlans.value = catalog.supplyPlans;
    planningBookViews.value = catalog.views;
    locations.value = catalog.locations;
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to load Supply Planning Book options.');
  } finally {
    isLoadingOptions.value = false;
  }
}

async function openPlanningBook(): Promise<void> {

  if (!canOpenPlanningBook.value) return;

  isLoadingBook.value = true;
  errorMessage.value = null;

  try {
    planningBook.value = await loadSupplyPlanningBook({
      planId: selectedPlanId.value,
      viewName: selectedViewName.value,
      locationId: selectedLocationId.value,
    });
    cellDetails.value = null;
    detailSelection.value = null;
  } catch (error) {
    planningBook.value = null;
    errorMessage.value = errorText(error, 'Unable to load the Supply Planning Book.');
  } finally {
    isLoadingBook.value = false;
  }
}

/** Returns from the opened workbook to the reference-style selection state. */
function leavePlanningBook(): void {

  planningBook.value = null;
  cellDetails.value = null;
  detailSelection.value = null;
}

/** Opens one backend-derived detail snapshot only after an explicit cell click. */
async function openCellDetails(row: SupplyPlanningBookRow, field: string): Promise<void> {

  if (planningBook.value === null || isLoadingDetails.value || isSaving.value || !supportsSupplyPlanningBookDetails(row.keyFigure)) return;

  const selection: SupplyPlanningBookDetailSelection = {
    planId: selectedPlanId.value,
    viewName: planningBook.value.viewName,
    locationId: selectedLocationId.value,
    locationDescriptionCols: row.locationDescriptionCols,
    materialDescriptionCols: row.materialDescriptionCols,
    keyFigure: row.keyFigure,
    period: resolveSupplyPlanningBookPeriod(planningBook.value, field),
  };

  isLoadingDetails.value = true;
  errorMessage.value = null;

  try {
    cellDetails.value = await loadSupplyPlanningBookCellDetails(selection);
    detailSelection.value = selection;
  } catch (error) {
    cellDetails.value = null;
    detailSelection.value = null;
    errorMessage.value = errorText(error, 'Unable to load the Supply Planning Book cell details.');
  } finally {
    isLoadingDetails.value = false;
  }
}

function closeCellDetails(): void {

  if (isSavingDetails.value) return;
  cellDetails.value = null;
  detailSelection.value = null;
}

/** Replaces only a permitted Quantity field in the DTO snapshot; all other detail data is untouched. */
function setDetailQuantity(detailLineIndex: number, rawValue: string): void {

  if (cellDetails.value === null || detailSelection.value === null || isSavingDetails.value) return;

  const quantity = Number(rawValue);
  const detailLine = cellDetails.value.detailLines[detailLineIndex];
  if (!Number.isFinite(quantity) || quantity < 0 || detailLine === undefined
      || !isSupplyPlanningBookDetailQuantityEditable(detailSelection.value.keyFigure, detailLine)) return;

  cellDetails.value = {
    ...cellDetails.value,
    detailLines: cellDetails.value.detailLines.map((line, index) =>
      index === detailLineIndex ? { ...line, Quantity: quantity } : line,
    ),
  };
}

/** Saves the server-issued detail shape and replaces the book with its authoritative response. */
async function submitCellDetails(): Promise<void> {

  if (cellDetails.value === null || !canSaveDetails.value || isSavingDetails.value) return;

  isSavingDetails.value = true;
  errorMessage.value = null;

  try {
    planningBook.value = await saveSupplyPlanningBookCellDetails(cellDetails.value);
    cellDetails.value = null;
    detailSelection.value = null;
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to save the Supply Planning Book cell details.');
  } finally {
    isSavingDetails.value = false;
  }
}

/** Reopens the authoritative server snapshot after a rejected immediate edit. */
async function reloadPlanningBookAfterFailure(): Promise<void> {

  if (!canOpenPlanningBook.value) return;

  try {
    planningBook.value = await loadSupplyPlanningBook({
      planId: selectedPlanId.value,
      viewName: selectedViewName.value,
      locationId: selectedLocationId.value,
    });
  } catch {
    planningBook.value = null;
  }
}

async function submitCellUpdate(row: SupplyPlanningBookRow, field: string, rawValue: string): Promise<void> {

  if (planningBook.value === null || isSaving.value) return;

  const oldValue = row.values[field];
  const newValue = Number(rawValue);
  if (!Number.isFinite(newValue) || oldValue === null || oldValue === undefined || newValue === oldValue) return;

  const cell: SupplyPlanningBookCellUpdate = {
    planId: selectedPlanId.value,
    viewType: planningBook.value.viewType,
    viewName: planningBook.value.viewName,
    locationId: selectedLocationId.value,
    locationDescriptionCols: row.locationDescriptionCols,
    materialDescriptionCols: row.materialDescriptionCols,
    keyFigure: row.keyFigure,
    period: resolveSupplyPlanningBookPeriod(planningBook.value, field),
    uom: planningBook.value.uom,
    oldValue,
    newValue,
  };

  isSaving.value = true;
  errorMessage.value = null;

  try {
    /* The returned DTO replaces the full grid: no stale optimistic cell state. */
    planningBook.value = await saveSupplyPlanningBookCell(cell);
  } catch (error) {
    const failureMessage = errorText(error, 'Unable to save the Supply Planning Book change.');
    await reloadPlanningBookAfterFailure();
    errorMessage.value = failureMessage;
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadOptions);
</script>

<template>
  <DashboardPageLayout class="supply-planning-book-page">
    <OfxPageHeader v-if="!planningBook" eyebrow="Supply Planning" title="Planning Book" description="Material/location adjustments in the current Working Plan.">
      <template #actions><button class="secondary-button" :disabled="isLoadingOptions" @click="loadOptions">Refresh options</button></template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="!planningBook" title="Workbook Selection" description="Select the Working Plan, planning location and configured view.">
      <div class="selection-grid"><label class="field-label">Supply Plan<select v-model="selectedPlanId" :disabled="isLoadingOptions || isSaving"><option value="">Select a supply plan</option><option v-for="plan in supplyPlans" :key="plan.supplyPlanId" :value="String(plan.supplyPlanId)">{{ plan.supplyPlanId }} — {{ plan.description || 'Unnamed supply plan' }}</option></select></label><label class="field-label">Planning location<select v-model="selectedLocationId" :disabled="isLoadingOptions || isSaving"><option value="">Select a planning location</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.id }} — {{ location.description || 'Unnamed location' }}</option></select></label><label class="field-label">User view<select v-model="selectedViewName" :disabled="isLoadingOptions || isSaving"><option value="">Select a view</option><option v-for="view in planningBookViews" :key="view.viewName" :value="view.viewName">{{ view.viewName }}</option></select></label><div class="selection-open"><button class="primary-button" :disabled="!canOpenPlanningBook || isLoadingBook || isSaving" @click="openPlanningBook">{{ isLoadingBook ? 'Opening…' : 'Open Planning Book' }}</button></div></div>
    </OfxSectionCard>

    <p v-if="!planningBook && !isLoadingOptions && !planningBookViews.length" class="muted">No Supply Planning Book view is assigned to this account. Ask an administrator to configure one before opening the workbook.</p>

    <section v-if="planningBook" class="planning-book-workspace-header">
      <div><div class="planning-book-workspace-eyebrow">Supply Planning Workspace</div><div class="planning-book-workspace-meta">{{ planningBook.viewName }} <span>•</span> {{ selectedPlanId }} <span>•</span> {{ selectedLocationId }}</div></div>
      <button class="secondary-button" type="button" :disabled="isSaving || isLoadingDetails || isSavingDetails" @click="leavePlanningBook">Reopen selection</button>
    </section>

    <OfxSectionCard v-if="planningBook" class="mt-5" :title="planningBook.viewName" description="Each editable cell is submitted immediately as one homogeneous update.">
      <p v-for="message in planningBook.errorMessage" :key="message" class="muted">{{ message }}</p>
      <PlanningBookVirtualGrid :rows="rows" :columns="planningBookGridColumns" :busy="isSaving || isLoadingDetails || isSavingDetails">
        <template #cell="{ row, column, value }">
          <strong v-if="column.id === 'key-figure'">{{ value }}</strong>
          <div v-else-if="isPeriodGridColumn(column)" class="cell-readonly" :title="row.unavailableReasons[planningBookGridField(column)]">
            <input v-if="isEditable(row, planningBookGridField(column))" :value="row.values[planningBookGridField(column)]" type="number" step="any" :disabled="isSaving" @change="submitCellUpdate(row, planningBookGridField(column), ($event.target as HTMLInputElement).value)" />
            <span v-else>{{ row.unavailableReasons[planningBookGridField(column)] ? 'N/A' : (row.values[planningBookGridField(column)] ?? 0) }}</span>
            <button v-if="supportsSupplyPlanningBookDetails(row.keyFigure)" class="detail-button" :disabled="isLoadingDetails || isSaving || isSavingDetails" @click="openCellDetails(row, planningBookGridField(column))">{{ isLoadingDetails ? 'Loading…' : 'Details' }}</button>
          </div>
          <span v-else>{{ value }}</span>
        </template>
      </PlanningBookVirtualGrid>
      <template #actions><button class="secondary-button" :disabled="isLoadingBook || isSaving" @click="openPlanningBook">Reload</button></template>
    </OfxSectionCard>

    <div v-if="cellDetails && detailSelection" class="drawer-backdrop" @click.self="closeCellDetails">
      <aside class="detail-drawer" aria-label="Supply Planning Book cell details">
        <header class="section-header"><div><p class="eyebrow">Cell details</p><h2>{{ detailSelection.keyFigure }}</h2><p class="muted">{{ detailSelection.materialDescriptionCols.materialId }} · {{ detailSelection.locationId }} · {{ detailSelection.period }}</p></div><button class="secondary-button" :disabled="isSavingDetails" @click="closeCellDetails">Close</button></header>
        <p v-if="detailSelection.keyFigure.startsWith('Indirect Demand-')" class="muted">Indirect Demand is read-only.</p>
        <p v-else-if="!canSaveDetails" class="muted">This detail is read-only in the current edition.</p>
        <div class="table-scroll"><table><thead><tr><th v-for="column in cellDetails.columnDefs" :key="column.field">{{ column.headerName }}</th></tr></thead><tbody><tr v-for="(detailLine, detailLineIndex) in cellDetails.detailLines" :key="detailLineIndex"><td v-for="column in cellDetails.columnDefs" :key="column.field"><input v-if="column.field === 'Quantity' && isSupplyPlanningBookDetailQuantityEditable(detailSelection.keyFigure, detailLine)" :value="detailLine[column.field]" type="number" min="0" step="any" :disabled="isSavingDetails" @change="setDetailQuantity(detailLineIndex, ($event.target as HTMLInputElement).value)" /><span v-else>{{ detailLine[column.field] ?? '—' }}</span></td></tr></tbody></table></div>
        <footer v-if="canSaveDetails" class="drawer-actions"><button class="primary-button" :disabled="isSavingDetails" @click="submitCellDetails">{{ isSavingDetails ? 'Saving…' : 'Save quantities' }}</button></footer>
      </aside>
    </div>
  </DashboardPageLayout>
</template>

<style scoped>
.selection-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.selection-open { align-self: end; display: flex; min-height: 2.5rem; }.selection-open .primary-button { width: 100%; justify-content: center; }.field-label { display: grid; gap: .5rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }.field-label select, input { border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .55rem .75rem; color: var(--ofx-text); }.primary-button, .secondary-button, .detail-button { display: inline-flex; min-height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .9rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.primary-button:disabled, .secondary-button:disabled, .detail-button:disabled { cursor: not-allowed; opacity: .5; }.section-header { display: flex; align-items: start; gap: 1rem; justify-content: space-between; }.table-scroll { overflow: auto; }:deep(.supply-planning-book__period-cell input) { min-width: 7rem; width: 7rem; }.cell-readonly { display: flex; align-items: center; gap: .5rem; }.detail-button { min-height: auto; padding: .25rem .5rem; font-size: .75rem; }.drawer-backdrop { position: fixed; inset: 0; z-index: 20; display: flex; justify-content: end; background: rgb(15 23 42 / .3); }.detail-drawer { width: min(52rem, 94vw); height: 100%; overflow: auto; background: var(--ofx-surface); box-shadow: -12px 0 32px rgb(15 23 42 / .2); padding: 1.5rem; color: var(--ofx-text); }.drawer-actions { display: flex; justify-content: end; margin-top: 1rem; }.planning-book-workspace-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.25rem 0; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-surface-elevated); padding: 1rem 1.25rem; }.planning-book-workspace-eyebrow { color: var(--ofx-text-muted); font-size: .6875rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }.planning-book-workspace-meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .35rem; color: var(--ofx-text); font-size: .8125rem; font-weight: 600; }.planning-book-workspace-meta span { color: var(--ofx-text-muted); }.muted { color: var(--ofx-text-muted); }.message { margin-top: 1.25rem; border-radius: 14px; padding: .85rem 1rem; font-size: .875rem; }.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }
</style>
