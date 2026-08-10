<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  LegacyPlanningBookGrid,
  type PlanningBookRow as CanonicalPlanningBookRow,
  type PlanningBookSelectedCellDto,
} from '@opsfactor/front-planning-book';
import {
  OfxConfirmDialog,
  OfxEmptyState,
  OfxEditionAvailabilityMark,
  OfxLoadingState,
  OfxModalDialog,
  OfxPageHeader,
  OfxSectionCard,
  OfxSelectField,
  OfxToggleField,
} from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import { getDemandPlans } from './demand-plans.service';
import { exportPlanningBookXlsx, getPlanningBookViews, loadPlanningBook, savePlanningBookCells } from './planning-book.service';
import { resolvePlanningBookPeriod } from './planning-book.utils';
import type { DemandPlan } from './demand-plan.types';
import type { PlanningBook, PlanningBookCellUpdate, PlanningBookSelection, PlanningBookView } from './planning-book.types';

const demandPlans = ref<DemandPlan[]>([]);
const planningBookViews = ref<PlanningBookView[]>([]);
const selectedPlanId = ref('');
const selectedViewName = ref('');
const planningBook = ref<PlanningBook | null>(null);
const openedPlanningBookSelection = ref<PlanningBookSelection | null>(null);
const pendingCells = ref(new Map<string, PlanningBookCellUpdate>());
const isLoadingOptions = ref(true);
const isLoadingBook = ref(false);
const isSaving = ref(false);
const isExporting = ref(false);
const logDialogOpen = ref(false);
const discardDialogOpen = ref(false);
const errorMessage = ref<string | null>(null);

const demandPlanOptions = computed(() => [
  { label: 'Select a demand plan', value: '' },
  ...demandPlans.value.map((plan) => ({
    label: `${plan.demandPlanId} - ${plan.description || 'Unnamed demand plan'}`,
    value: String(plan.demandPlanId),
  })),
]);
const planningBookViewOptions = computed(() => [
  { label: 'Select a user view', value: '' },
  ...planningBookViews.value.map((view) => ({ label: view.viewName, value: view.viewName })),
]);
const canOpenPlanningBook = computed(() => selectedPlanId.value !== '' && selectedViewName.value !== '');
const canExportPlanningBook = computed(() => planningBook.value !== null
  && openedPlanningBookSelection.value !== null
  && !isLoadingBook.value
  && !isSaving.value
  && !isExporting.value);

function errorText(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function cellKey(rowKey: string, field: string): string { return `${rowKey}::${field}`; }

const pendingEditList = computed<PlanningBookSelectedCellDto[]>(() => Array.from(pendingCells.value.values()));
const workspaceLogEntries = computed(() => [
  ...(planningBook.value?.errorMessage ?? []),
  ...(errorMessage.value ? [errorMessage.value] : []),
].filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index));

/** Keeps the legacy composite row identity unchanged for draft-cell reconciliation. */
async function loadOptions(): Promise<void> {
  isLoadingOptions.value = true; errorMessage.value = null;
  try {
    const [plans, views] = await Promise.all([getDemandPlans(), getPlanningBookViews()]);
    demandPlans.value = plans; planningBookViews.value = views;
  } catch (error) { errorMessage.value = errorText(error, 'Unable to load Planning Book options.'); }
  finally { isLoadingOptions.value = false; }
}

async function openPlanningBook(): Promise<void> {
  if (!canOpenPlanningBook.value) return;
  const selection: PlanningBookSelection = { planId: selectedPlanId.value, viewName: selectedViewName.value };
  isLoadingBook.value = true; errorMessage.value = null; pendingCells.value = new Map();
  try {
    planningBook.value = await loadPlanningBook(selection);
    openedPlanningBookSelection.value = selection;
  }
  catch (error) { errorMessage.value = errorText(error, 'Unable to load the Planning Book.'); }
  finally { isLoadingBook.value = false; }
}

/** Returns from the immersive workbook to the reference-style plan selection. */
function leavePlanningBook(): void {

  planningBook.value = null;
  openedPlanningBookSelection.value = null;
  pendingCells.value = new Map();
}

/** Triggers a local browser download of the server-generated read-only spreadsheet. */
function downloadPlanningBookSpreadsheet(spreadsheet: Blob): void {

  const downloadUrl = URL.createObjectURL(spreadsheet);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'planning-book.xlsx';
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

/** Exports only the exact selection that produced the currently displayed Planning Book. */
async function exportOpenedPlanningBook(): Promise<void> {

  const selection = openedPlanningBookSelection.value;
  if (selection === null || !canExportPlanningBook.value) return;

  isExporting.value = true;
  errorMessage.value = null;
  try {
    downloadPlanningBookSpreadsheet(await exportPlanningBookXlsx(selection));
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to export the Demand Planning Book spreadsheet.');
  } finally {
    isExporting.value = false;
  }
}

/** Extracts one dimension map from the normalized canonical grid row. */
function descriptorValues(
  row: CanonicalPlanningBookRow,
  dimension: 'location' | 'material',
): Record<string, string> {

  if (planningBook.value === null) return {};

  return Object.fromEntries(planningBook.value.columnDefs
    .filter((column) => !column.dataColumn && column.dimension === dimension)
    .map((column) => [column.field, String(row[column.field] ?? '')]));

}

/** Converts the canonical AG Grid edit event to the Community POST contract. */
function queueCellUpdate(payload: {
  row: CanonicalPlanningBookRow;
  field: string;
  oldValue: number;
  newValue: number;
}): void {

  if (planningBook.value === null) return;

  const key = cellKey(payload.row.rowKey, payload.field);
  const previousUpdate = pendingCells.value.get(key);
  const update: PlanningBookCellUpdate = {
    planId: selectedPlanId.value,
    viewType: planningBook.value.viewType,
    viewName: planningBook.value.viewName,
    locationDescriptionCols: descriptorValues(payload.row, 'location'),
    materialDescriptionCols: descriptorValues(payload.row, 'material'),
    keyFigure: payload.row.keyFigure,
    period: resolvePlanningBookPeriod(planningBook.value, payload.field),
    uom: planningBook.value.uom,
    oldValue: previousUpdate?.oldValue ?? payload.oldValue,
    newValue: payload.newValue,
  };
  const nextCells = new Map(pendingCells.value);
  if (update.newValue === update.oldValue) {
    nextCells.delete(key);
    pendingCells.value = nextCells;
    return;
  }
  nextCells.set(key, update);
  pendingCells.value = nextCells;
  if (planningBook.value.autoSubmitChanges) void savePendingChanges([update]);
}

/** Reloads immediately when clean and asks before discarding local edits. */
function requestReload(): void {

  if (pendingCells.value.size > 0) {
    discardDialogOpen.value = true;
    return;
  }

  void openPlanningBook();

}

/** Discards local edits and replaces the grid with the authoritative snapshot. */
async function confirmDiscardChanges(): Promise<void> {

  discardDialogOpen.value = false;
  pendingCells.value = new Map();
  await openPlanningBook();

}

/** Surfaces the backend reason emitted by a canonical unavailable cell. */
function handleUnavailableEdit(payload: { reason: string }): void {

  errorMessage.value = payload.reason;

}

async function savePendingChanges(cells = Array.from(pendingCells.value.values())): Promise<void> {
  if (cells.length === 0) return;
  isSaving.value = true; errorMessage.value = null;
  try { planningBook.value = await savePlanningBookCells(cells); pendingCells.value = new Map(); }
  catch (error) {
    const failureMessage = errorText(error, 'Unable to save Planning Book changes.');
    /* A rejected update can leave local input values divergent from the server.
       Reload the authoritative Planning Book before allowing another edit. */
    try {
      planningBook.value = await loadPlanningBook({ planId: selectedPlanId.value, viewName: selectedViewName.value });
      pendingCells.value = new Map();
    } catch {
      /* Keep the original functional failure as the visible message. */
    }
    errorMessage.value = failureMessage;
  }
  finally { isSaving.value = false; }
}

onMounted(loadOptions);
</script>

<template>
  <DashboardPageLayout class="demand-planning-book-page">
    <OfxLoadingState v-if="isLoadingOptions" label="Loading demand plans and configured views" />

    <OfxEmptyState
      v-else-if="errorMessage && demandPlans.length === 0"
      title="Planning Book metadata unavailable"
      :description="errorMessage"
    >
      <button class="secondary-button" @click="loadOptions">Try again</button>
    </OfxEmptyState>

    <template v-else>
      <OfxPageHeader v-if="!planningBook" eyebrow="Demand Planning" title="Planning Book">
        <template #actions>
          <button class="secondary-button" :disabled="isLoadingOptions" @click="loadOptions">Refresh options</button>
        </template>
      </OfxPageHeader>

      <div v-if="!planningBook" class="planning-book-selection-stack">
        <OfxSectionCard title="Plan context" description="Choose the Demand Plan and view that define the Planning Book.">
          <div class="selection-grid">
            <OfxSelectField
              label="Demand plan"
              :model-value="selectedPlanId"
              :options="demandPlanOptions"
              :disabled="isLoadingOptions"
              @update:model-value="selectedPlanId = $event"
            />
            <OfxSelectField
              label="User view"
              :model-value="selectedViewName"
              :options="planningBookViewOptions"
              :disabled="isLoadingOptions"
              @update:model-value="selectedViewName = $event"
            />
            <OfxToggleField
              :model-value="false"
              label="Include a reference plan"
              description="Reference-plan comparison is not available in the current edition."
              disabled
              required-edition="Pro / Enterprise"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Collaboration workflow" description="Use the Planning Book directly or collaborate through an Excel workbook.">
          <div class="workflow-grid">
            <button type="button" class="workflow-option workflow-option--selected text-left">
              <span class="workflow-option__title">Edit in Planning Book</span>
              <span>Open the interactive planning grid and submit the supported adjustments.</span>
            </button>
            <button type="button" class="workflow-option workflow-option--locked text-left" disabled>
              <span class="workflow-option__title">Collaborate via Excel <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="light" :size="12" /></span>
              <span>Workbook collaboration is not available in the current edition.</span>
            </button>
          </div>

          <template #actions>
            <button class="primary-button" :disabled="!canOpenPlanningBook || isLoadingBook" @click="openPlanningBook">
              {{ isLoadingBook ? 'Opening...' : 'Open Planning Book' }}
            </button>
          </template>
        </OfxSectionCard>
      </div>

      <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
      <OfxEmptyState
        v-if="!planningBook && !planningBookViews.length"
        title="No Planning Book views available"
        description="No Planning Book view is assigned to this account. Ask an administrator to configure one before opening the workbook."
      />
      <OfxLoadingState v-else-if="!planningBook && isLoadingBook" label="Preparing the Planning Book workspace" />

      <section v-if="planningBook" class="planning-book-workspace-header">
        <div>
          <div class="planning-book-workspace-eyebrow">Demand Planning Workspace</div>
          <div class="planning-book-workspace-meta">{{ planningBook.viewName }} <span>•</span> {{ selectedPlanId }}</div>
        </div>
        <button class="secondary-button" type="button" :disabled="isSaving || isExporting" @click="leavePlanningBook">Reopen selection</button>
      </section>

      <div v-if="planningBook" class="planning-book-workspace-body">
        <LegacyPlanningBookGrid
          :planning-book="planningBook"
          height="100%"
          mode="demand"
          theme-mode="light"
          :pending-edit-count="pendingCells.size"
          :pending-edits="pendingEditList"
          :is-saving="isSaving"
          @edit="queueCellUpdate"
          @unavailable-edit="handleUnavailableEdit"
        >
          <template #header-actions>
            <button type="button" class="grid-action" @click="logDialogOpen = true">Log</button>
            <button type="button" class="grid-action" :disabled="!canExportPlanningBook" @click="exportOpenedPlanningBook">
              {{ isExporting ? 'Exporting...' : 'Export XLSX' }}
            </button>
            <button type="button" class="grid-action" :disabled="isLoadingBook || isSaving || isExporting" @click="requestReload">
              {{ pendingCells.size ? 'Discard local changes' : 'Reload workbook' }}
            </button>
            <button
              v-if="!planningBook.autoSubmitChanges"
              type="button"
              class="grid-action grid-action--primary"
              :disabled="!pendingCells.size || isSaving || isExporting"
              @click="savePendingChanges()"
            >
              {{ isSaving ? 'Saving...' : `Save in batch${pendingCells.size ? ` (${pendingCells.size})` : ''}` }}
            </button>
          </template>
        </LegacyPlanningBookGrid>
      </div>
    </template>

    <OfxConfirmDialog
      :open="discardDialogOpen"
      title="Discard local planning-book changes?"
      description="Unsaved cell edits will be lost and the workbook will be reloaded from the backend."
      confirm-label="Discard changes"
      cancel-label="Keep editing"
      @cancel="discardDialogOpen = false"
      @confirm="confirmDiscardChanges"
    />

    <OfxModalDialog
      :open="logDialogOpen"
      title="Planning Book Log"
      description="Messages returned by the current workbook context."
      @close="logDialogOpen = false"
    >
      <div v-if="workspaceLogEntries.length" class="space-y-2">
        <div v-for="entry in workspaceLogEntries" :key="entry" class="log-entry">{{ entry }}</div>
      </div>
      <div v-else class="log-empty">No log entries were returned for this planning book.</div>
    </OfxModalDialog>
  </DashboardPageLayout>
</template>

<style scoped>
.planning-book-selection-stack {
  display: grid;
  gap: 1.5rem;
}

.planning-book-workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border: 1px solid var(--ofx-border);
  border-radius: 14px;
  background: var(--ofx-surface-elevated);
  padding: 1rem 1.25rem;
}

.planning-book-workspace-eyebrow {
  color: var(--ofx-text-muted);
  font-size: .6875rem;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.planning-book-workspace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .35rem;
  color: var(--ofx-text);
  font-size: .8125rem;
  font-weight: 600;
}

.planning-book-workspace-meta span {
  color: var(--ofx-text-muted);
}

.planning-book-workspace-body {
  height: calc(100vh - 13.5rem);
  min-height: 32rem;
  overflow: hidden;
}

.selection-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.workflow-grid {
  display: grid;
  gap: .75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.workflow-option {
  display: grid;
  gap: .35rem;
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: 1rem;
}

.workflow-option--selected {
  border-color: var(--ofx-primary);
  box-shadow: inset 0 0 0 1px var(--ofx-primary);
}

.workflow-option--locked {
  background: var(--ofx-muted);
  color: var(--ofx-text-muted);
  cursor: not-allowed;
}

.workflow-option__title {
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
}

.workflow-option span:not(.workflow-option__title) {
  color: var(--ofx-text-muted);
  font-size: .8rem;
  line-height: 1.35;
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
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
}

.grid-action {
  display: inline-flex;
  height: 2.25rem;
  align-items: center;
  border: 1px solid var(--ofx-border);
  border-radius: 999px;
  background: var(--ofx-surface);
  padding: 0 .75rem;
  color: var(--ofx-text);
  font-size: .75rem;
  font-weight: 600;
}

.grid-action--primary {
  border-color: var(--ofx-primary);
  background: var(--ofx-primary);
  color: var(--ofx-primary-foreground);
}

.grid-action:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.log-entry {
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface-elevated);
  padding: .75rem 1rem;
  color: var(--ofx-text-muted);
  font-size: .875rem;
}

.log-empty {
  border: 1px dashed var(--ofx-border);
  border-radius: 12px;
  padding: 2rem 1rem;
  color: var(--ofx-text-muted);
  text-align: center;
  font-size: .875rem;
}

.muted {
  color: var(--ofx-text-muted);
  font-size: .875rem;
}

.message {
  margin-top: 1.25rem;
  border-radius: 14px;
  padding: .85rem 1rem;
  font-size: .875rem;
}

.message-error {
  border: 1px solid #f0b7b2;
  background: #fff8f7;
  color: #b42318;
}

@media (max-width: 720px) {
  .workflow-grid {
    grid-template-columns: 1fr;
  }

  .planning-book-workspace-body {
    height: calc(100vh - 16rem);
    min-height: 26rem;
  }
}
</style>
