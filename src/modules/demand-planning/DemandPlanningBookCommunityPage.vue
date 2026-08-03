<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRuntimeInfoStore } from '@opsfactor/front-core';
import { PlanningBookVirtualGrid, type PlanningBookVirtualGridColumn } from '@opsfactor/front-planning-book';
import {
  OfxEmptyState,
  OfxLoadingState,
  OfxPageHeader,
  OfxSectionCard,
  OfxSelectField,
  OfxToggleField,
} from '@opsfactor/front-shell';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import { buildCommunityPlanningBookRichRows } from '../planning-books/community-planning-book-grid-rich.utils';
import { getDemandPlans } from './demand-plans.service';
import { exportPlanningBookXlsx, getPlanningBookViews, loadPlanningBook, savePlanningBookCells } from './planning-book.service';
import { flattenPlanningBook, getPlanningBookPeriodColumns, isCellEditMode, resolvePlanningBookPeriod } from './planning-book.utils';
import type { DemandPlan } from './demand-plan.types';
import type { PlanningBook, PlanningBookCellUpdate, PlanningBookRow, PlanningBookSelection, PlanningBookView } from './planning-book.types';

const runtimeInfoStore = useRuntimeInfoStore();
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
const errorMessage = ref<string | null>(null);

const editableKeyFigures = computed(() => new Set(runtimeInfoStore.runtimeInfo?.editableDemandPlanningBookKeyFigures ?? []));
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
const rows = computed(() => planningBook.value === null ? [] : buildCommunityPlanningBookRichRows(flattenPlanningBook(planningBook.value)));
const periodColumns = computed(() => planningBook.value === null ? [] : getPlanningBookPeriodColumns(planningBook.value));
const descriptorColumns = computed(() => planningBook.value?.columnDefs.filter((column) => !column.dataColumn && column.field !== 'keyFigure') ?? []);
/**
 * Keeps Community's DTO and edit policy local while the rich grid owns only
 * client-side virtualization, filtering and key-figure tree presentation.
 */
const planningBookGridColumns = computed<PlanningBookVirtualGridColumn<(typeof rows.value)[number]>[]>(() => [
  ...descriptorColumns.value.map((column) => ({
    id: `descriptor:${column.field}`,
    label: column.name,
    cellClass: 'demand-planning-book__descriptor-cell',
    getValue: (row: PlanningBookRow) => row.locationDescriptionCols[column.field]
      || row.materialDescriptionCols[column.field]
      || '—',
  })),
  {
    id: 'key-figure',
    label: 'Key figure',
    width: '15rem',
    hierarchy: true,
    cellClass: 'demand-planning-book__key-figure-cell',
    getValue: (row: PlanningBookRow) => row.keyFigure,
  },
  ...periodColumns.value.map((column) => ({
    id: `period:${column.field}`,
    label: column.name,
    cellClass: 'demand-planning-book__period-cell',
    getValue: (row: PlanningBookRow) => row.values[column.field],
  })),
]);
const canOpenPlanningBook = computed(() => selectedPlanId.value !== '' && selectedViewName.value !== '' && runtimeInfoStore.runtimeInfo !== null);
const canExportPlanningBook = computed(() => planningBook.value !== null
  && openedPlanningBookSelection.value !== null
  && !isLoadingBook.value
  && !isSaving.value
  && !isExporting.value);

function errorText(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function cellKey(rowKey: string, field: string): string { return `${rowKey}::${field}`; }
function currentCellValue(rowKey: string, field: string, originalValue: number | null | undefined): number | null | undefined { return pendingCells.value.get(cellKey(rowKey, field))?.newValue ?? originalValue; }

function isEditable(row: PlanningBookRow, field: string, unavailableReason?: string): boolean {
  const periodColumn = periodColumns.value.find((column) => column.field === field);
  return unavailableReason === undefined
    && !row.additionalClasses[field]?.includes('crosshatch')
    && editableKeyFigures.value.has(row.keyFigure)
    && isCellEditMode(row.editMode)
    && periodColumn?.enableCellEdit !== false;
}

/** Identifies product-owned period cells rendered through the rich Community grid. */
function isPeriodGridColumn(column: PlanningBookVirtualGridColumn<(typeof rows.value)[number]>): boolean {

  return column.id.startsWith('period:');
}

/** Extracts the backend field name from a presentation-only grid column id. */
function planningBookGridField(column: PlanningBookVirtualGridColumn<(typeof rows.value)[number]>): string {

  return column.id.slice('period:'.length);
}

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
  if (!canOpenPlanningBook.value || runtimeInfoStore.runtimeInfo === null) return;
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

function queueCellUpdate(row: (typeof rows.value)[number], field: string, rawValue: string): void {
  if (planningBook.value === null) return;
  const oldValue = row.values[field];
  const newValue = Number(rawValue);
  if (!Number.isFinite(newValue) || oldValue === null || oldValue === undefined) return;
  const key = cellKey(row.rowKey, field);
  const previousUpdate = pendingCells.value.get(key);
  const update: PlanningBookCellUpdate = { planId: selectedPlanId.value, viewType: planningBook.value.viewType, viewName: planningBook.value.viewName, locationDescriptionCols: row.locationDescriptionCols, materialDescriptionCols: row.materialDescriptionCols, keyFigure: row.keyFigure, period: resolvePlanningBookPeriod(planningBook.value, field), uom: planningBook.value.uom, oldValue: previousUpdate?.oldValue ?? oldValue, newValue };
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
              label="Include a reference plan · Enterprise"
              description="Reference-plan comparison is available in Enterprise."
              locked
              locked-label="Enterprise"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Collaboration workflow" description="Use the Planning Book directly or collaborate through an Excel workbook.">
          <div class="workflow-grid">
            <button type="button" class="workflow-option workflow-option--selected text-left">
              <span class="workflow-option__title">Edit in Planning Book</span>
              <span>Open the interactive planning grid and submit the supported Community adjustments.</span>
            </button>
            <button type="button" class="workflow-option workflow-option--locked text-left" disabled>
              <span class="workflow-option__title">Collaborate via Excel <em>Enterprise</em></span>
              <span>Workbook upload, validation and reference-plan collaboration are Enterprise capabilities.</span>
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
        description="Configure a view from the Planning Book workflow before opening it."
      />
      <OfxLoadingState v-else-if="!planningBook && isLoadingBook" label="Loading Planning Book DTO and preparing the workspace" />

      <section v-if="planningBook" class="planning-book-workspace-header">
        <div>
          <div class="planning-book-workspace-eyebrow">Demand Planning Workspace</div>
          <div class="planning-book-workspace-meta">{{ planningBook.viewName }} <span>•</span> {{ selectedPlanId }} <span>•</span> Community</div>
        </div>
        <button class="secondary-button" type="button" :disabled="isSaving || isExporting" @click="leavePlanningBook">Reopen selection</button>
      </section>

      <OfxSectionCard
        v-if="planningBook"
        class="mt-5"
        :title="planningBook.viewName"
        :description="planningBook.autoSubmitChanges ? 'Changes are submitted immediately.' : 'Changes stay local until saved.'"
      >
        <p class="muted">Spreadsheet export is a read-only copy of this opened view; it does not download or change view configuration.</p>
        <p v-for="message in planningBook.errorMessage" :key="message" class="muted">{{ message }}</p>
        <PlanningBookVirtualGrid :rows="rows" :columns="planningBookGridColumns" :busy="isSaving || isExporting">
          <template #cell="{ row, column, value }">
            <strong v-if="column.id === 'key-figure'">{{ value }}</strong>
            <template v-else-if="isPeriodGridColumn(column)">
              <input
                v-if="isEditable(row, planningBookGridField(column), row.unavailableReasons[planningBookGridField(column)])"
                :value="currentCellValue(row.rowKey, planningBookGridField(column), row.values[planningBookGridField(column)])"
                type="number"
                step="any"
                :disabled="isSaving || isExporting"
                @change="queueCellUpdate(row, planningBookGridField(column), ($event.target as HTMLInputElement).value)"
              />
              <span v-else :title="row.unavailableReasons[planningBookGridField(column)]">
                {{ row.unavailableReasons[planningBookGridField(column)] ? 'N/A' : (currentCellValue(row.rowKey, planningBookGridField(column), row.values[planningBookGridField(column)]) ?? 0) }}
              </span>
            </template>
            <span v-else>{{ value }}</span>
          </template>
        </PlanningBookVirtualGrid>
        <template #actions>
          <div class="actions">
            <button class="secondary-button" :disabled="!canExportPlanningBook" @click="exportOpenedPlanningBook">{{ isExporting ? 'Exporting...' : 'Export XLSX' }}</button>
            <button class="secondary-button" :disabled="isLoadingBook || isSaving || isExporting" @click="openPlanningBook">Reload</button>
            <button v-if="!planningBook.autoSubmitChanges" class="primary-button" :disabled="!pendingCells.size || isSaving || isExporting" @click="savePendingChanges()">
              {{ isSaving ? 'Saving...' : `Save changes (${pendingCells.size})` }}
            </button>
          </div>
        </template>
      </OfxSectionCard>
    </template>
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

.workflow-option em {
  border-radius: 99px;
  background: var(--ofx-surface);
  color: var(--ofx-text-muted);
  font-size: 10px;
  font-style: normal;
  letter-spacing: .1em;
  padding: .16rem .4rem;
  text-transform: uppercase;
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

:deep(.demand-planning-book__period-cell input) {
  min-width: 7rem;
  width: 7rem;
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: .55rem .75rem;
  color: var(--ofx-text);
}

@media (max-width: 720px) {
  .workflow-grid {
    grid-template-columns: 1fr;
  }
}
</style>
