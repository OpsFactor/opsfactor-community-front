<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRuntimeInfoStore } from '@opsfactor/front-core';
import { LegacyPlanningBookGrid, type PlanningBookRow as CanonicalPlanningBookRow } from '@opsfactor/front-planning-book';
import { OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import OfxSelectField from '../../components/ofx/forms/OfxSelectField.vue';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import { useNavigationStore } from '@/stores/app/navigation.store';
import {
  getSupplyPlanningBookCatalog,
  loadSupplyPlanningBook,
  loadSupplyPlanningBookCellDetails,
  saveSupplyPlanningBookCell,
  saveSupplyPlanningBookCellDetails,
} from './supply-planning-book.service';
import {
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
  SupplyPlanningBookView,
} from './supply-planning-book.types';

const COMMUNITY_EDITABLE_KEY_FIGURES = new Set([
  'Stock-Working Plan',
  'Planned Production-Working Plan',
  'Planned Inbound-Working Plan',
]);

const runtimeInfoStore = useRuntimeInfoStore();
const navigationStore = useNavigationStore();
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
const pendingCells = ref(new Map<string, SupplyPlanningBookCellUpdate>());

const backendEditableKeyFigures = computed(() => new Set(runtimeInfoStore.runtimeInfo?.editableSupplyPlanningBookKeyFigures ?? []));
const canOpenPlanningBook = computed(() => selectedPlanId.value !== '' && selectedViewName.value !== '' && selectedLocationId.value !== '' && runtimeInfoStore.runtimeInfo !== null);
const supplyPlanOptions = computed(() => [
  { label: 'Select a supply plan', value: '' },
  ...supplyPlans.value.map((plan) => ({ label: `${plan.supplyPlanId} — ${plan.description || 'Unnamed supply plan'}`, value: String(plan.supplyPlanId) })),
]);
const locationOptions = computed(() => [
  { label: 'Select a planning location', value: '' },
  ...locations.value.map((location) => ({ label: `${location.id} — ${location.description || 'Unnamed location'}`, value: location.id })),
]);
const planningBookViewOptions = computed(() => [
  { label: 'Select a view', value: '' },
  ...planningBookViews.value.map((view) => ({ label: view.viewName, value: view.viewName })),
]);
const canSaveDetails = computed(() => detailSelection.value !== null
  && cellDetails.value !== null
  && cellDetails.value.detailLines.some((detailLine) =>
    isSupplyPlanningBookDetailQuantityEditable(detailSelection.value!.keyFigure, detailLine),
  ));
const pendingCellList = computed(() => Array.from(pendingCells.value.values()));

function errorText(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

/** Narrows the canonical grid edit policy to the public Community key figures. */
function isCommunityCellEditable(row: CanonicalPlanningBookRow, field: string): boolean {

  const periodColumn = planningBook.value?.columnDefs.find((column) => column.dataColumn && column.field === field);

  return COMMUNITY_EDITABLE_KEY_FIGURES.has(row.keyFigure)
    && backendEditableKeyFigures.value.has(row.keyFigure)
    && isSupplyPlanningBookCellEditMode(row.editMode)
    && periodColumn?.enableCellEdit !== false
    && row.unavailableReasons?.[field] === undefined
    && !row.additionalClasses?.[field]?.includes('crosshatch');
}

/** Rebuilds the API descriptor maps from the canonical flattened grid row. */
function descriptorValues(
  row: CanonicalPlanningBookRow,
  dimension: 'location' | 'material',
): Record<string, string> {

  if (planningBook.value === null) return {};

  return Object.fromEntries(planningBook.value.columnDefs
    .filter((column) => !column.dataColumn && column.dimension === dimension)
    .map((column) => [column.field, String(row[column.field] ?? '')]));
}

/** Retains a user edit locally until the explicit Community batch action. */
function queuePendingCell(cell: SupplyPlanningBookCellUpdate): void {

  const cellKey = `${cell.locationId}::${cell.materialDescriptionCols.materialId}::${cell.keyFigure}::${cell.period}`;
  const previousCell = pendingCells.value.get(cellKey);
  const nextCells = new Map(pendingCells.value);
  const nextCell = { ...cell, oldValue: previousCell?.oldValue ?? cell.oldValue };

  if (nextCell.oldValue === nextCell.newValue) {
    nextCells.delete(cellKey);
  } else {
    nextCells.set(cellKey, nextCell);
  }

  pendingCells.value = nextCells;
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
    pendingCells.value = new Map();
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
  pendingCells.value = new Map();
}

/** Opens one backend-derived detail snapshot only after an explicit cell click. */
async function openCellDetails(payload: { row: CanonicalPlanningBookRow; field: string }): Promise<void> {

  const { row, field } = payload;
  if (planningBook.value === null || isLoadingDetails.value || isSaving.value || !supportsSupplyPlanningBookDetails(row.keyFigure)) return;

  const selectedValue = typeof row[field] === 'number' ? row[field] : Number(row[field]);
  if (!Number.isFinite(selectedValue)) {
    errorMessage.value = 'The selected Planning Book cell does not contain a valid numeric quantity.';
    return;
  }

  const selection: SupplyPlanningBookDetailSelection = {
    planId: selectedPlanId.value,
    viewName: planningBook.value.viewName,
    locationId: selectedLocationId.value,
    locationDescriptionCols: descriptorValues(row, 'location'),
    materialDescriptionCols: descriptorValues(row, 'material'),
    keyFigure: row.keyFigure,
    period: resolveSupplyPlanningBookPeriod(planningBook.value, field),
    uom: planningBook.value.uom,
    oldValue: selectedValue,
    newValue: selectedValue,
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

function submitCellUpdate(payload: {
  row: CanonicalPlanningBookRow;
  field: string;
  oldValue: number;
  newValue: number;
}): void {

  if (planningBook.value === null || isSaving.value) return;

  const { row, field, oldValue, newValue } = payload;
  if (!Number.isFinite(newValue) || !Number.isFinite(oldValue) || newValue === oldValue) return;

  const cell: SupplyPlanningBookCellUpdate = {
    planId: selectedPlanId.value,
    viewType: planningBook.value.viewType,
    viewName: planningBook.value.viewName,
    locationId: selectedLocationId.value,
    locationDescriptionCols: descriptorValues(row, 'location'),
    materialDescriptionCols: descriptorValues(row, 'material'),
    keyFigure: row.keyFigure,
    period: resolveSupplyPlanningBookPeriod(planningBook.value, field),
    uom: planningBook.value.uom,
    oldValue,
    newValue,
  };

  queuePendingCell(cell);

  if (planningBook.value.autoSubmitChanges) {
    void savePendingCells([cell]);
  }
}

/** Sends each Community cell as its required homogeneous update, then refreshes the authoritative book. */
async function savePendingCells(cells = pendingCellList.value): Promise<void> {

  if (planningBook.value === null || cells.length === 0 || isSaving.value) return;

  isSaving.value = true;
  errorMessage.value = null;

  try {
    let refreshedBook = planningBook.value;
    for (const cell of cells) {
      refreshedBook = await saveSupplyPlanningBookCell(cell);
    }
    planningBook.value = refreshedBook;
    pendingCells.value = new Map();
  } catch (error) {
    const failureMessage = errorText(error, 'Unable to save the Supply Planning Book change.');
    await reloadPlanningBookAfterFailure();
    errorMessage.value = failureMessage;
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadOptions);

onBeforeUnmount(() => {

  navigationStore.setImmersiveWorkspace(false);
});

watch(
  () => Boolean(planningBook.value),
  (opened) => {

    navigationStore.setImmersiveWorkspace(opened);
  },
  { immediate: true },
);
</script>

<template>
  <DashboardPageLayout class="supply-planning-book-page">
    <OfxPageHeader v-if="!planningBook" eyebrow="Supply Planning" title="Planning Book" description="Material/location adjustments in the current Working Plan.">
      <template #actions><button class="secondary-button" :disabled="isLoadingOptions" @click="loadOptions">Refresh options</button></template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="!planningBook" title="Workbook Selection" description="Select the Working Plan, planning location and configured view.">
      <div class="selection-grid"><OfxSelectField v-model="selectedPlanId" label="Supply Plan" :options="supplyPlanOptions" :disabled="isLoadingOptions || isSaving" /><OfxSelectField v-model="selectedLocationId" label="Planning location" :options="locationOptions" :disabled="isLoadingOptions || isSaving" /><OfxSelectField v-model="selectedViewName" label="User view" :options="planningBookViewOptions" :disabled="isLoadingOptions || isSaving" /><div class="selection-open"><button class="primary-button" :disabled="!canOpenPlanningBook || isLoadingBook || isSaving" @click="openPlanningBook">{{ isLoadingBook ? 'Opening…' : 'Open Planning Book' }}</button></div></div>
    </OfxSectionCard>

    <p v-if="!planningBook && !isLoadingOptions && !planningBookViews.length" class="muted">No Supply Planning Book view is assigned to this account. Ask an administrator to configure one before opening the workbook.</p>

    <section v-if="planningBook" class="planning-book-workspace-header">
      <div><div class="planning-book-workspace-eyebrow">Supply Planning Workspace</div><div class="planning-book-workspace-meta">{{ planningBook.viewName }} <span>•</span> {{ selectedPlanId }} <span>•</span> {{ selectedLocationId }}</div></div>
      <button class="secondary-button" type="button" :disabled="isSaving || isLoadingDetails || isSavingDetails" @click="leavePlanningBook">Reopen selection</button>
    </section>

    <div v-if="planningBook" class="planning-book-workspace-body">
      <LegacyPlanningBookGrid
        :planning-book="planningBook"
        height="100%"
        mode="supply"
        theme-mode="light"
        details-enabled
        :pending-edit-count="pendingCells.size"
        :pending-edits="pendingCellList"
        :is-saving="isSaving || isLoadingDetails || isSavingDetails"
        :is-cell-editable="isCommunityCellEditable"
        @edit="submitCellUpdate"
        @request-details="openCellDetails"
      >
        <template #header-actions>
          <button class="secondary-button" :disabled="isLoadingBook || isSaving || isLoadingDetails || isSavingDetails" @click="openPlanningBook">Reload</button>
          <button
            v-if="!planningBook.autoSubmitChanges"
            class="primary-button"
            :disabled="pendingCells.size === 0 || isSaving || isLoadingDetails || isSavingDetails"
            @click="savePendingCells()"
          >
            {{ isSaving ? 'Saving…' : `Save in batch${pendingCells.size ? ` (${pendingCells.size})` : ''}` }}
          </button>
        </template>
      </LegacyPlanningBookGrid>
    </div>

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
.selection-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.selection-open { align-self: end; display: flex; min-height: 2.5rem; }.selection-open .primary-button { width: 100%; justify-content: center; }.field-label { display: grid; gap: .5rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }.field-label select, input { border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .55rem .75rem; color: var(--ofx-text); }.primary-button, .secondary-button { display: inline-flex; min-height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .9rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }.section-header { display: flex; align-items: start; gap: 1rem; justify-content: space-between; }.table-scroll { overflow: auto; }.drawer-backdrop { position: fixed; inset: 0; z-index: 20; display: flex; justify-content: end; background: rgb(15 23 42 / .3); }.detail-drawer { width: min(52rem, 94vw); height: 100%; overflow: auto; background: var(--ofx-surface); box-shadow: -12px 0 32px rgb(15 23 42 / .2); padding: 1.5rem; color: var(--ofx-text); }.drawer-actions { display: flex; justify-content: end; margin-top: 1rem; }.planning-book-workspace-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.25rem 0; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-surface-elevated); padding: 1rem 1.25rem; }.planning-book-workspace-eyebrow { color: var(--ofx-text-muted); font-size: .6875rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }.planning-book-workspace-meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .35rem; color: var(--ofx-text); font-size: .8125rem; font-weight: 600; }.planning-book-workspace-meta span { color: var(--ofx-text-muted); }.planning-book-workspace-body { height: calc(100vh - 13.5rem); min-height: 32rem; overflow: hidden; }.muted { color: var(--ofx-text-muted); }.message { margin-top: 1.25rem; border-radius: 14px; padding: .85rem 1rem; font-size: .875rem; }.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }
</style>
