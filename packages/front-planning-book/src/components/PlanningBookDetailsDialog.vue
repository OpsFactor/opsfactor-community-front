<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  type ValueParserParams,
} from 'ag-grid-community';
import { OfxLoadingState, OfxModalDialog } from '@opsfactor/front-shell';

/** Neutral column metadata supplied by either edition's Planning Book DTO. */
type PlanningBookCellDetailColumnDef = {
  headerName?: string;
  field?: string;
  width?: number | string;
  editable?: boolean;
};

/**
 * The dialog owns only editable grid presentation. Plan identity and update
 * transport remain owned by the calling edition.
 */
type PlanningBookCellDetails = {
  planId: string | number;
  viewName: string;
  materialId?: string | null;
  locationId?: string | null;
  keyFigure: string;
  period: string;
  detailLines: Record<string, unknown>[];
  columnDefs: PlanningBookCellDetailColumnDef[];
};

ModuleRegistry.registerModules([AllCommunityModule]);

const props = withDefaults(
  defineProps<{
    open: boolean;
    details: PlanningBookCellDetails | null;
    title: string;
    description?: string;
    themeMode?: 'light' | 'dark';
    isLoading?: boolean;
    isSubmitting?: boolean;
  }>(),
  {
    description: '',
    themeMode: 'light',
    isLoading: false,
    isSubmitting: false,
  },
);

const emit = defineEmits<{
  close: [];
  submit: [details: PlanningBookCellDetails];
}>();

const isLightTheme = computed(() => props.themeMode === 'light');
const editableDetails = ref<PlanningBookCellDetails | null>(null);

watch(
  () => props.details,
  (details) => {
    editableDetails.value = details ? JSON.parse(JSON.stringify(details)) as PlanningBookCellDetails : null;
  },
  { immediate: true, deep: true },
);

function parseColumnWidth(column: PlanningBookCellDetailColumnDef) {

  if (typeof column.width === 'number') return column.width;
  if (typeof column.width === 'string') {
    const parsed = Number.parseInt(column.width, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 160;
}

function parseValue(params: ValueParserParams<Record<string, unknown>>) {

  const currentValue = params.oldValue;
  if (typeof currentValue === 'number') {
    const parsed = Number(String(params.newValue).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  return params.newValue;
}

const columnDefs = computed<ColDef<Record<string, unknown>>[]>(() =>
  (editableDetails.value?.columnDefs ?? []).map((column) => ({
    field: column.field,
    headerName: column.headerName ?? column.field ?? '',
    width: parseColumnWidth(column),
    minWidth: Math.max(120, Math.min(parseColumnWidth(column), 240)),
    editable: column.editable === true,
    resizable: true,
    sortable: false,
    filter: false,
    valueParser: parseValue,
    headerClass: ['ofx-ag-grid-header-cell'],
    cellClass: ['ofx-ag-grid-body-cell'],
  })),
);

const hasDetailColumns = computed(() => columnDefs.value.length > 0);
const hasEditableDetailColumns = computed(() =>
  (editableDetails.value?.columnDefs ?? []).some((column) => column.editable === true),
);
const gridShellClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]'
));
const emptyClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/10 text-white/56'
));
const closeButtonClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
));

function handleGridReady(event: GridReadyEvent<Record<string, unknown>>) {

  const columnIds = event.api.getAllDisplayedColumns().map((column) => column.getColId());
  if (!columnIds.length) return;

  try {
    event.api.autoSizeColumns(columnIds, false);
  } catch {
    // Preserve configured widths when autosize is unavailable.
  }
}

function submitDetails() {

  if (!editableDetails.value) return;
  emit('submit', editableDetails.value);
}
</script>

<template>
  <OfxModalDialog
    :open="props.open"
    :title="props.title"
    :description="props.description"
    size="xl"
    @close="emit('close')"
  >
    <OfxLoadingState v-if="props.isLoading" label="Loading detail lines" />

    <div v-else-if="editableDetails && hasDetailColumns" :class="['overflow-hidden rounded-[14px] border', gridShellClass]">
      <div class="ofx-ag-grid ag-theme-quartz" style="--ofx-ag-grid-min-height: 420px;">
        <AgGridVue
          class="h-full min-h-0 w-full"
          :row-data="editableDetails.detailLines"
          :column-defs="columnDefs"
          :default-col-def="{ suppressMovable: true }"
          :grid-options="{ rowHeight: 34, headerHeight: 34, enableCellTextSelection: true, alwaysShowHorizontalScroll: true, suppressCellFocus: false }"
          theme="legacy"
          @grid-ready="handleGridReady"
        />
      </div>
    </div>

    <div v-else :class="['rounded-[14px] border border-dashed px-4 py-8 text-center text-sm', emptyClass]">
      No detail lines were returned for this cell.
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          :class="['inline-flex h-11 items-center rounded-[10px] border px-4 text-sm font-medium transition', closeButtonClass]"
          @click="emit('close')"
        >
          Close
        </button>
        <button
          v-if="hasEditableDetailColumns"
          type="button"
          class="inline-flex h-11 items-center rounded-[10px] bg-[color:var(--ofx-primary)] px-4 text-sm font-semibold text-[color:var(--ofx-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="props.isLoading || props.isSubmitting || !editableDetails"
          @click="submitDetails"
        >
          {{ props.isSubmitting ? 'Submitting...' : 'Submit changes' }}
        </button>
      </div>
    </template>
  </OfxModalDialog>
</template>
