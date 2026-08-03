<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellClassParams,
  type ColDef,
  type EditableCallbackParams,
  type FirstDataRenderedEvent,
  type GridApi,
  type GridReadyEvent,
  type ValueFormatterParams,
} from 'ag-grid-community';
import ProductionPlanningTreeCellRenderer from './ProductionPlanningTreeCellRenderer.vue';

ModuleRegistry.registerModules([AllCommunityModule]);

/** Minimal workbook contract needed by the shared Production Planning grid. */
export interface ProductionPlanningBookGridWorkbook {
  dados: Array<Record<string, unknown>>;
  columnDefs: Array<{
    name: string;
    enableCellEdit?: boolean;
  }>;
}

/** Neutral row metadata derived solely for the Planning Book presentation. */
export type ProductionPlanningGridRow = Record<string, unknown> & {
  rowKey: string;
  treeDepth: number;
  ancestorKeys: string[];
  hasChildren: boolean;
  baseVisible: boolean;
  isEditable: boolean;
  line?: string;
};

const props = withDefaults(defineProps<{
  workbook: ProductionPlanningBookGridWorkbook;
  height?: number | string;
  isSaving?: boolean;
  themeMode?: 'light' | 'dark';
}>(), {
  themeMode: 'light',
});

const emit = defineEmits<{
  edit: [payload: { row: ProductionPlanningGridRow; field: string; newValue: number; oldValue: number }];
}>();

const gridApi = ref<GridApi<ProductionPlanningGridRow> | null>(null);
const expandedState = reactive<Record<string, boolean>>({});
const descriptorFields = ['resource', 'sku', 'description', 'line'];
const isLightTheme = computed(() => props.themeMode === 'light');
const rootClass = computed(() => [
  'flex min-h-0 flex-col overflow-hidden',
  isLightTheme.value
    ? 'bg-[color:var(--ofx-surface)]'
    : 'bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]',
]);
const headerClass = computed(() => [
  'shrink-0 px-3 py-2',
  isLightTheme.value ? 'border-b border-[color:var(--ofx-border)]' : 'border-b border-white/6',
]);
const headerTextClass = computed(() => [
  'flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]',
  isLightTheme.value ? 'text-[color:var(--ofx-text-soft)]' : 'text-white/42',
]);
const headerDotClass = computed(() => [
  'h-1 w-1 rounded-full',
  isLightTheme.value ? 'bg-[color:var(--ofx-border-strong)]' : 'bg-white/18',
]);

/** Builds the visual hierarchy without modifying the host-owned DTO. */
const normalizedRows = computed<ProductionPlanningGridRow[]>(() => {
  const rows = props.workbook.dados;
  const nextRows = rows.map((row, index) => {
    const treeDepth = Number(row.$$treeLevel ?? 0);
    const ancestorKeys: string[] = [];

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const previous = rows[cursor];
      const previousDepth = Number(previous.$$treeLevel ?? 0);

      if (previousDepth < treeDepth) {
        ancestorKeys.unshift(String(previous.key ?? `${cursor}`));
      }

      if (previousDepth === 0 && previousDepth < treeDepth) break;
    }

    const nextDepth = Number(rows[index + 1]?.$$treeLevel ?? -1);

    return {
      ...row,
      rowKey: String(row.key ?? `${index}`),
      treeDepth,
      ancestorKeys,
      hasChildren: nextDepth > treeDepth,
      baseVisible: row.showLine !== false,
      isEditable: row.isEditable === true,
      line: typeof row.line === 'string' ? row.line : undefined,
    } satisfies ProductionPlanningGridRow;
  });

  return nextRows;
});

watch(
  normalizedRows,
  (rows) => {
    Object.keys(expandedState).forEach((key) => {
      delete expandedState[key];
    });

    rows.forEach((row) => {
      if (row.hasChildren) expandedState[row.rowKey] = true;
    });
  },
  { immediate: true },
);

const visibleRows = computed(() =>
  normalizedRows.value.filter((row) => row.baseVisible && row.ancestorKeys.every((ancestorKey) => expandedState[ancestorKey] !== false)),
);
const dateFields = computed(() =>
  props.workbook.columnDefs
    .map((column) => column.name)
    .filter((field) => !['level', ...descriptorFields].includes(field)),
);
const displayedRowCount = computed(() => visibleRows.value.length);
const containerHeightStyle = computed(() => {
  if (props.height == null) return '100%';
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

function toggleRow(rowKey: string) {

  expandedState[rowKey] = !expandedState[rowKey];
}

function formatNumber(value: unknown, row: ProductionPlanningGridRow | undefined) {

  const number = typeof value === 'number' ? value : Number(value ?? Number.NaN);
  if (!Number.isFinite(number)) return '';
  if (row?.line === '% capacity') return `${(number * 100).toFixed(1)}%`;

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseEditableNumber(value: unknown) {

  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function autoSizeLeadingColumns() {

  if (!gridApi.value) return;

  try {
    gridApi.value.autoSizeColumns(['__hierarchy__', ...descriptorFields], true);
  } catch {
    // Keep predictable widths when the grid cannot measure a hidden workspace.
  }
}

function getColumnWidth(field: string) {

  if (dateFields.value.includes(field)) return 124;
  if (field === 'description') return 220;
  if (field === 'line') return 168;
  if (field === 'resource') return 128;
  if (field === 'sku') return 124;
  return 120;
}

const columnDefs = computed<ColDef<ProductionPlanningGridRow>[]>(() => [
  {
    colId: '__hierarchy__', field: 'rowKey', headerName: '', width: 46, minWidth: 46, maxWidth: 46,
    pinned: 'left', sortable: false, filter: false, resizable: false, editable: false, lockPinned: true,
    cellRenderer: 'productionPlanningTreeCellRenderer',
    headerClass: ['ofx-ag-grid-header-cell', 'ofx-planning-book-hierarchy-header'],
    cellClass: ['ofx-ag-grid-body-cell', 'is-center', 'ofx-planning-book-hierarchy-column'],
  },
  ...props.workbook.columnDefs
    .filter((column) => column.name !== 'level')
    .map((column) => ({
      colId: column.name,
      field: column.name,
      headerName: dateFields.value.includes(column.name) ? column.name.slice(0, 10) : column.name,
      width: getColumnWidth(column.name),
      minWidth: getColumnWidth(column.name),
      pinned: descriptorFields.includes(column.name) ? ('left' as const) : undefined,
      sortable: false,
      filter: false,
      resizable: true,
      editable: (params: EditableCallbackParams<ProductionPlanningGridRow>) => (
        Boolean(params.data?.isEditable) && dateFields.value.includes(column.name) && column.enableCellEdit !== false
      ),
      valueFormatter: dateFields.value.includes(column.name)
        ? (params: ValueFormatterParams<ProductionPlanningGridRow>) => formatNumber(params.value, params.data)
        : undefined,
      headerClass: dateFields.value.includes(column.name) ? ['ofx-ag-grid-header-cell', 'is-right'] : ['ofx-ag-grid-header-cell'],
      cellClass: (params: CellClassParams<ProductionPlanningGridRow>) => [
        'ofx-ag-grid-body-cell',
        dateFields.value.includes(column.name) ? 'is-right' : 'is-left',
        params.data?.line === '% capacity' ? 'ofx-planning-book-secondary-key-figure' : '',
      ],
    })),
]);

const gridOptions = computed(() => ({
  rowHeight: 30,
  headerHeight: 32,
  enableCellTextSelection: true,
  suppressRowClickSelection: true,
  suppressCellFocus: false,
  animateRows: false,
  stopEditingWhenCellsLoseFocus: true,
  alwaysShowHorizontalScroll: true,
  context: {
    toggleRow,
    isRowExpanded: (rowKey: string | undefined) => (rowKey ? expandedState[rowKey] !== false : true),
  },
}));

function handleGridReady(event: GridReadyEvent<ProductionPlanningGridRow>) {

  gridApi.value = event.api;
}

function handleFirstDataRendered(_event: FirstDataRenderedEvent<ProductionPlanningGridRow>) {

  nextTick(() => {
    autoSizeLeadingColumns();
  });
}

function handleCellValueChanged(event: {
  data: ProductionPlanningGridRow;
  colDef: ColDef<ProductionPlanningGridRow>;
  newValue: unknown;
  oldValue: unknown;
}) {

  const field = String(event.colDef.field ?? '');
  const oldValue = typeof event.oldValue === 'number' ? event.oldValue : parseEditableNumber(event.oldValue);
  const newValue = parseEditableNumber(event.newValue);

  if (field.length === 0 || Number.isNaN(newValue) || newValue === oldValue) return;

  emit('edit', { row: event.data, field, oldValue, newValue });
}
</script>

<template>
  <div :class="rootClass" :style="{ height: containerHeightStyle }">
    <div :class="headerClass">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div :class="headerTextClass">
          <span>Production Planning Book</span>
          <span :class="headerDotClass"></span>
          <span>{{ displayedRowCount }} rows in view</span>
          <span :class="headerDotClass"></span>
          <span>Automatic save</span>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <slot name="header-actions" />
        </div>
      </div>
    </div>

    <div class="ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1">
      <AgGridVue
        class="h-full min-h-0 w-full"
        :row-data="visibleRows"
        :column-defs="columnDefs"
        :components="{ productionPlanningTreeCellRenderer: ProductionPlanningTreeCellRenderer }"
        :grid-options="gridOptions"
        :get-row-id="(params) => String(params.data?.rowKey ?? '')"
        theme="legacy"
        @grid-ready="handleGridReady"
        @first-data-rendered="handleFirstDataRendered"
        @cell-value-changed="handleCellValueChanged"
      />
    </div>
  </div>
</template>
