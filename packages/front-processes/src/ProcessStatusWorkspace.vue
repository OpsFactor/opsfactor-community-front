<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  OfxActiveFilterChips,
  OfxConfirmDialog,
  OfxDataTable,
  OfxEmptyState,
  OfxEntityMultiSelect,
  OfxLoadingState,
  OfxPageHeader,
  OfxSectionCard,
  OfxTableCellText,
  OfxTableToolbar,
  OfxTextField,
  TaskPageLayout,
  type OfxExportFormat,
  type OfxTableColumn,
} from '@opsfactor/front-shell';
import { OfxFilterBar } from '@opsfactor/front-shell';
import {
  deriveProcessTaskState,
  deriveScheduledCronTaskState,
  getProcessExecutionRows,
  getScheduledCronRows,
  type ProcessStatusTask,
} from '@opsfactor/front-core';

interface OfxFilterChip {
  key: string;
  label: string;
}

interface OfxSelectOption {
  label: string;
  value: string;
}

interface ProcessStatusNotification {
  tone: 'error' | 'success';
  title: string;
  description: string;
}

interface ProcessStatusNotifications {
  push: (notification: ProcessStatusNotification) => void;
}

const props = defineProps<{
  fetchProcessStatusTasks: () => Promise<ProcessStatusTask[]>;
  deleteProcessStatusTasks: (tasks: ProcessStatusTask[]) => Promise<string>;
  notifications: ProcessStatusNotifications;
}>();

interface ProcessStatusRow extends ProcessStatusTask {
  state: string;
}

interface ScheduledCronRow extends ProcessStatusRow {
  lastStartTime: string | null;
  lastEndTime: string | null;
  lastErrorMessage: string;
}

const notifications = props.notifications;
const executionTableRef = ref<InstanceType<typeof OfxDataTable> | null>(null);
const cronTableRef = ref<InstanceType<typeof OfxDataTable> | null>(null);

const exportFormat = ref<OfxExportFormat>('xlsx');
const isLoading = ref(true);
const isDeleting = ref(false);
const loadError = ref<string | null>(null);
const confirmDeleteOpen = ref(false);

const tasks = ref<ProcessStatusTask[]>([]);
const selectedExecutionRows = ref<ProcessStatusRow[]>([]);
const selectedCronRows = ref<ScheduledCronRow[]>([]);

const selectedProcessTypes = ref<string[]>([]);
const selectedTaskTypes = ref<string[]>([]);
const selectedOwners = ref<string[]>([]);
const selectedStates = ref<string[]>([]);
const searchTerm = ref('');

const executionColumns: OfxTableColumn[] = [
  { field: 'taskId', header: 'Task Id', width: '10%', dataType: 'text' },
  { field: 'processType', header: 'Process Type', width: '14%', dataType: 'text' },
  { field: 'taskType', header: 'Task Type', width: '14%', dataType: 'text' },
  { field: 'description', header: 'Description', width: '23%', dataType: 'text' },
  { field: 'state', header: 'State', width: '10%', dataType: 'text' },
  { field: 'userId', header: 'User', width: '10%', dataType: 'text' },
  { field: 'scheduledExecutionTime', header: 'Scheduled', width: '11%', dataType: 'datetime' },
  { field: 'startTime', header: 'Start', width: '10%', dataType: 'datetime' },
  { field: 'endTime', header: 'End', width: '10%', dataType: 'datetime' },
  { field: 'errorMessage', header: 'Error Message', width: '18%', dataType: 'text' },
];

const cronColumns: OfxTableColumn[] = [
  { field: 'taskId', header: 'Task Id', width: '12%', dataType: 'text' },
  { field: 'processType', header: 'Process Type', width: '16%', dataType: 'text' },
  { field: 'description', header: 'Description', width: '22%', dataType: 'text' },
  { field: 'state', header: 'State', width: '10%', dataType: 'text' },
  { field: 'cronExpression', header: 'Cron', width: '12%', dataType: 'text' },
  { field: 'timeZone', header: 'Timezone', width: '10%', dataType: 'text' },
  { field: 'userId', header: 'User', width: '10%', dataType: 'text' },
  { field: 'taskCreationTime', header: 'Created', width: '11%', dataType: 'datetime' },
  { field: 'lastStartTime', header: 'Last Start', width: '11%', dataType: 'datetime' },
  { field: 'lastEndTime', header: 'Last End', width: '11%', dataType: 'datetime' },
  { field: 'lastErrorMessage', header: 'Last Error', width: '18%', dataType: 'text' },
];

const executionRows = computed<ProcessStatusRow[]>(() =>
  getProcessExecutionRows(tasks.value).map((task) => ({
    ...task,
    state: deriveProcessTaskState(task),
  })),
);

const scheduledCronRows = computed<ScheduledCronRow[]>(() =>
  getScheduledCronRows(tasks.value).map((task) => ({
    ...task,
    state: deriveScheduledCronTaskState(task),
    lastStartTime: task.startTime,
    lastEndTime: task.endTime,
    lastErrorMessage: task.errorMessage,
  })),
);

const rows = computed<Array<ProcessStatusRow | ScheduledCronRow>>(() => [
  ...executionRows.value,
  ...scheduledCronRows.value,
]);

const selectedRows = computed<Array<ProcessStatusRow | ScheduledCronRow>>(() => [
  ...selectedExecutionRows.value,
  ...selectedCronRows.value,
]);

const processTypeOptions = computed<OfxSelectOption[]>(() =>
  Array.from(new Set(rows.value.map((row) => row.processType).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value })),
);

const taskTypeOptions = computed<OfxSelectOption[]>(() =>
  Array.from(new Set(rows.value.map((row) => row.taskType).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value })),
);

const ownerOptions = computed<OfxSelectOption[]>(() =>
  Array.from(new Set(rows.value.map((row) => row.userId).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value })),
);

const stateOptions: OfxSelectOption[] = [
  { label: 'Running', value: 'Running' },
  { label: 'Active', value: 'Active' },
  { label: 'Paused', value: 'Paused' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Last Failed', value: 'Last Failed' },
  { label: 'Queued', value: 'Queued' },
];

function matchesFilters(row: ProcessStatusRow | ScheduledCronRow) {
  const query = searchTerm.value.trim().toLowerCase();

  const matchesProcessType = !selectedProcessTypes.value.length || selectedProcessTypes.value.includes(row.processType);
  const matchesTaskType = !selectedTaskTypes.value.length || selectedTaskTypes.value.includes(row.taskType);
  const matchesOwner = !selectedOwners.value.length || selectedOwners.value.includes(row.userId);
  const matchesState = !selectedStates.value.length || selectedStates.value.includes(row.state);
  const matchesQuery = !query || [
    row.taskId,
    row.description,
    row.errorMessage,
    'lastErrorMessage' in row ? row.lastErrorMessage : '',
    row.userId,
    row.processType,
    row.taskType,
    row.taskInstance,
    row.cronExpression,
  ].some((value) => String(value ?? '').toLowerCase().includes(query));

  return matchesProcessType && matchesTaskType && matchesOwner && matchesState && matchesQuery;
}

const filteredExecutionRows = computed(() => executionRows.value.filter(matchesFilters));
const filteredCronRows = computed(() => scheduledCronRows.value.filter(matchesFilters));

const activeChips = computed<OfxFilterChip[]>(() => [
  ...selectedProcessTypes.value.map((value) => ({ key: `process:${value}`, label: `Process: ${value}` })),
  ...selectedTaskTypes.value.map((value) => ({ key: `task:${value}`, label: `Task: ${value}` })),
  ...selectedOwners.value.map((value) => ({ key: `owner:${value}`, label: `User: ${value}` })),
  ...selectedStates.value.map((value) => ({ key: `state:${value}`, label: `State: ${value}` })),
  ...(searchTerm.value.trim() ? [{ key: 'query', label: `Search: ${searchTerm.value.trim()}` }] : []),
]);

const selectedIdsLabel = computed(() => selectedRows.value.map((row) => row.taskId).filter(Boolean).join(', '));

function formatError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'An unexpected error interrupted the process-status workflow.';
}

async function loadTasks(options: { silent?: boolean } = {}) {
  if (!options.silent) {
    isLoading.value = true;
  }

  loadError.value = null;

  try {
    tasks.value = await props.fetchProcessStatusTasks();
  } catch (error) {
    loadError.value = formatError(error);

    if (options.silent) {
      notifications.push({
        tone: 'error',
        title: 'Unable to refresh process status',
        description: loadError.value,
      });
    }
  } finally {
    isLoading.value = false;
  }
}

function clearSelection() {
  executionTableRef.value?.clearSelection();
  cronTableRef.value?.clearSelection();
  selectedExecutionRows.value = [];
  selectedCronRows.value = [];
}

function handleExecutionSelectionChange(selection: Record<string, unknown>[]) {
  selectedExecutionRows.value = selection as ProcessStatusRow[];
}

function handleCronSelectionChange(selection: Record<string, unknown>[]) {
  selectedCronRows.value = selection as ScheduledCronRow[];
}

function handleExecutionExport() {
  executionTableRef.value?.exportData(exportFormat.value);
}

function handleCronExport() {
  cronTableRef.value?.exportData(exportFormat.value);
}

function clearFilters() {
  selectedProcessTypes.value = [];
  selectedTaskTypes.value = [];
  selectedOwners.value = [];
  selectedStates.value = [];
  searchTerm.value = '';
}

function removeChip(key: string) {
  const [group, value] = key.split(':');

  if (group === 'process') {
    selectedProcessTypes.value = selectedProcessTypes.value.filter((item) => item !== value);
    return;
  }
  if (group === 'task') {
    selectedTaskTypes.value = selectedTaskTypes.value.filter((item) => item !== value);
    return;
  }
  if (group === 'owner') {
    selectedOwners.value = selectedOwners.value.filter((item) => item !== value);
    return;
  }
  if (group === 'state') {
    selectedStates.value = selectedStates.value.filter((item) => item !== value);
    return;
  }
  if (group === 'query') {
    searchTerm.value = '';
  }
}

async function confirmDeleteSelection() {
  if (!selectedRows.value.length) return;

  isDeleting.value = true;

  try {
    const payload = selectedRows.value.map((row) => {
      const { state, ...task } = row;
      delete (task as Partial<ScheduledCronRow>).lastStartTime;
      delete (task as Partial<ScheduledCronRow>).lastEndTime;
      delete (task as Partial<ScheduledCronRow>).lastErrorMessage;
      return task as ProcessStatusTask;
    });
    const responseMessage = await props.deleteProcessStatusTasks(payload);

    confirmDeleteOpen.value = false;
    clearSelection();
    await loadTasks({ silent: true });

    notifications.push({
      tone: 'success',
      title: 'Tasks deletion submitted',
      description: responseMessage || 'The selected scheduler tasks were submitted for deletion.',
    });
  } catch (error) {
    notifications.push({
      tone: 'error',
      title: 'Unable to delete selected tasks',
      description: formatError(error),
    });
  } finally {
    isDeleting.value = false;
  }
}

function stateTone(state: string) {
  if (state === 'Running') return 'bg-[color:rgb(47_155_113_/_0.12)] text-[color:var(--ofx-text-success)] border-[color:rgb(47_155_113_/_0.22)]';
  if (state === 'Active') return 'bg-[color:rgb(47_155_113_/_0.12)] text-[color:var(--ofx-text-success)] border-[color:rgb(47_155_113_/_0.22)]';
  if (state === 'Paused') return 'bg-[color:var(--ofx-bg-subtle)] text-[color:var(--ofx-text-muted)] border-[color:var(--ofx-border)]';
  if (state === 'Scheduled') return 'bg-[color:rgb(211_155_42_/_0.12)] text-[color:var(--ofx-text-warning)] border-[color:rgb(211_155_42_/_0.24)]';
  if (state === 'Failed') return 'bg-[color:rgb(208_69_95_/_0.12)] text-[color:var(--ofx-text-danger)] border-[color:rgb(208_69_95_/_0.22)]';
  if (state === 'Last Failed') return 'bg-[color:rgb(208_69_95_/_0.12)] text-[color:var(--ofx-text-danger)] border-[color:rgb(208_69_95_/_0.22)]';
  if (state === 'Completed') return 'bg-[color:rgb(40_115_217_/_0.12)] text-[color:var(--ofx-accent)] border-[color:rgb(40_115_217_/_0.22)]';
  return 'bg-[color:var(--ofx-bg-subtle)] text-[color:var(--ofx-text-muted)] border-[color:var(--ofx-border)]';
}

onMounted(() => {
  loadTasks();
});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader eyebrow="Processes" title="Process Status" />

    <OfxFilterBar title="Filters" description="Filter the task queue by process, task type, user, state, or text.">
      <OfxEntityMultiSelect v-model="selectedProcessTypes" label="Process Type" :options="processTypeOptions" placeholder="All process types" />
      <OfxEntityMultiSelect v-model="selectedTaskTypes" label="Task Type" :options="taskTypeOptions" placeholder="All task types" />
      <OfxEntityMultiSelect v-model="selectedOwners" label="User" :options="ownerOptions" placeholder="All users" />
      <OfxEntityMultiSelect v-model="selectedStates" label="State" :options="stateOptions" placeholder="All states" />
      <OfxTextField v-model="searchTerm" label="Search" placeholder="Task id, instance, user, or error text" />
      <template #actions>
        <button class="text-sm font-medium text-[color:var(--ofx-accent)]" @click="clearFilters">Reset filters</button>
      </template>
    </OfxFilterBar>

    <OfxActiveFilterChips :chips="activeChips" @remove="removeChip" @clear="clearFilters" />

    <div class="space-y-4">
      <OfxSectionCard>
        <div v-if="isLoading" class="space-y-4">
          <OfxLoadingState label="Loading scheduled tasks..." />
        </div>

        <div v-else-if="loadError && !filteredExecutionRows.length && !filteredCronRows.length" class="space-y-4">
          <OfxEmptyState title="Process status unavailable" :description="loadError">
            <button
              class="rounded-md border border-[color:var(--ofx-border)] px-4 py-2 text-sm text-[color:var(--ofx-text)] transition hover:bg-white/[0.04]"
              @click="loadTasks()"
            >
              Try again
            </button>
          </OfxEmptyState>
        </div>

        <div v-else class="space-y-4">
          <div
            v-if="loadError && (filteredExecutionRows.length || filteredCronRows.length)"
            class="rounded-lg border border-[color:rgb(211_155_42_/_0.24)] bg-[color:rgb(211_155_42_/_0.1)] px-4 py-3 text-sm text-[color:var(--ofx-text-warning)]"
          >
            {{ loadError }}
          </div>

          <div class="text-sm font-semibold text-[color:var(--ofx-text)]">Process executions</div>
          <OfxTableToolbar
            :results-label="`${filteredExecutionRows.length} execution${filteredExecutionRows.length === 1 ? '' : 's'}`"
            :download-format="exportFormat"
            @update:download-format="exportFormat = $event"
            @download="handleExecutionExport"
          >
            <template #actions>
              <button
                class="rounded-md border border-[color:var(--ofx-border)] px-4 py-2 text-sm text-[color:var(--ofx-text)] transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isLoading || isDeleting"
                @click="loadTasks({ silent: true })"
              >
                {{ isLoading ? 'Loading...' : 'Refresh list' }}
              </button>
              <button
                class="rounded-md border border-[color:rgb(208_69_95_/_0.34)] bg-[color:rgb(208_69_95_/_0.12)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-text-danger)] transition hover:bg-[color:rgb(208_69_95_/_0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!selectedRows.length || isDeleting"
                @click="confirmDeleteOpen = true"
              >
                {{ isDeleting ? 'Deleting...' : `Delete selected${selectedRows.length ? ` (${selectedRows.length})` : ''}` }}
              </button>
            </template>
          </OfxTableToolbar>

          <OfxDataTable
            ref="executionTableRef"
            :rows="filteredExecutionRows"
            :columns="executionColumns"
            row-key="rowKey"
            :dense="true"
            :pagination="true"
            :page-size="10"
            :auto-page-size="false"
            :page-size-options="false"
            export-base-name="process-status"
            selection-mode="multiple"
            :selection-checkboxes="true"
            @selection-change="handleExecutionSelectionChange"
          >
            <template #empty>
              <OfxEmptyState
                title="No process executions match the current filters"
                description="Clear the active filters or refresh the list to see more executions."
              />
            </template>

            <template #cell-taskId="{ row }">
              <OfxTableCellText :value="String(row.taskId || row.taskInstance || '')" fallback="No id" />
            </template>

            <template #cell-description="{ row }">
              <OfxTableCellText :value="String(row.description || row.cronExpression || '')" fallback="Scheduler task without description" />
            </template>

            <template #cell-state="{ value }">
              <span :class="['inline-flex rounded-[var(--ofx-radius-pill)] border px-2.5 py-1 text-xs font-medium', stateTone(String(value))]">
                {{ value }}
              </span>
            </template>

            <template #cell-errorMessage="{ value }">
              <OfxTableCellText
                :value="String(value || '')"
                fallback="No errors reported"
                :tone="value ? 'danger' : 'muted'"
              />
            </template>
          </OfxDataTable>

          <div class="border-t border-[color:var(--ofx-border)] pt-4">
            <div class="mb-4 text-sm font-semibold text-[color:var(--ofx-text)]">Scheduled cron tasks</div>
            <OfxTableToolbar
              :results-label="`${filteredCronRows.length} cron${filteredCronRows.length === 1 ? '' : 's'}`"
              :download-format="exportFormat"
              @update:download-format="exportFormat = $event"
              @download="handleCronExport"
            />

            <OfxDataTable
              ref="cronTableRef"
              :rows="filteredCronRows"
              :columns="cronColumns"
              row-key="rowKey"
              :dense="true"
              :pagination="true"
              :page-size="10"
              :auto-page-size="false"
              :page-size-options="false"
              export-base-name="scheduled-cron-tasks"
              selection-mode="multiple"
              :selection-checkboxes="true"
              @selection-change="handleCronSelectionChange"
            >
              <template #empty>
                <OfxEmptyState
                  title="No scheduled cron tasks match the current filters"
                  description="Clear the active filters or refresh the list to see more scheduled tasks."
                />
              </template>

              <template #cell-taskId="{ row }">
                <OfxTableCellText :value="String(row.taskId || '')" fallback="No id" />
              </template>

              <template #cell-description="{ row }">
                <OfxTableCellText :value="String(row.description || row.cronExpression || '')" fallback="Scheduled task without description" />
              </template>

              <template #cell-state="{ value }">
                <span :class="['inline-flex rounded-[var(--ofx-radius-pill)] border px-2.5 py-1 text-xs font-medium', stateTone(String(value))]">
                  {{ value }}
                </span>
              </template>

              <template #cell-lastErrorMessage="{ value }">
                <OfxTableCellText
                  :value="String(value || '')"
                  fallback="No errors reported"
                  :tone="value ? 'danger' : 'muted'"
                />
              </template>
            </OfxDataTable>
          </div>
        </div>
      </OfxSectionCard>
    </div>

    <OfxConfirmDialog
      :open="confirmDeleteOpen"
      title="Delete selected scheduler tasks?"
      confirm-tone="danger"
      :confirm-label="isDeleting ? 'Submitting...' : 'Delete selected tasks'"
      cancel-label="Keep tasks"
      @cancel="!isDeleting ? (confirmDeleteOpen = false) : undefined"
      @confirm="!isDeleting ? confirmDeleteSelection() : undefined"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-[color:rgb(211_155_42_/_0.24)] bg-[color:rgb(211_155_42_/_0.08)] px-4 py-3 text-sm text-[color:var(--ofx-text-warning)]">
          Deletion runs in the background. The same rows may remain visible briefly while the cleanup finishes.
        </div>

        <div class="rounded-lg border border-[color:rgb(208_69_95_/_0.24)] bg-[color:rgb(208_69_95_/_0.08)] px-4 py-3 text-sm text-[color:var(--ofx-text-danger)]">
          This action removes the selected scheduler tasks from the operational queue and should be used only after review.
        </div>

        <div class="rounded-lg border border-[color:var(--ofx-border)] bg-[color:var(--ofx-bg-subtle)] px-4 py-3">
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--ofx-text-subtle)]">Selected ids</div>
          <div class="mt-2 text-sm font-medium text-[color:var(--ofx-text)]">
            {{ selectedIdsLabel }}
          </div>
        </div>
      </div>
    </OfxConfirmDialog>
  </TaskPageLayout>
</template>
