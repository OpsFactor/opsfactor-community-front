<script setup lang="ts">
import { computed, nextTick, shallowRef, useSlots, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellClickedEvent,
  type ColDef,
  type FirstDataRenderedEvent,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
  type RowClassRules,
  type SelectionChangedEvent,
} from 'ag-grid-community';
import { exportTableData, type OfxExportFormat } from './data-table.export.js';
import {
  compareTypedValues,
  formatDisplayValue,
  getColumnAlignment,
  mapBooleanFilterValue,
  normalizeDate,
} from './data-table.formatters.js';
import {
  OFX_TABLE_COMFORTABLE_HEADER_HEIGHT,
  OFX_TABLE_COMFORTABLE_ROW_HEIGHT,
  OFX_TABLE_COMPACT_HEADER_HEIGHT,
  OFX_TABLE_COMPACT_ROW_HEIGHT,
  OFX_TABLE_COMPACT_TEXT_SIZE,
} from './data-table.defaults.js';
import type { OfxTableColumn } from './data-table.types.js';
import OfxAgGridCellRenderer from './OfxAgGridCellRenderer.vue';

ModuleRegistry.registerModules([AllCommunityModule]);

type BooleanHeaderTogglePayload = {
  field: string;
  value: boolean;
  rows: Record<string, unknown>[];
};

const props = withDefaults(
  defineProps<{
    rows: Record<string, unknown>[];
    columns: OfxTableColumn[];
    rowKey?: string;
    dense?: boolean;
    striped?: boolean;
    height?: number | string;
    pagination?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[] | false;
    autoPageSize?: boolean;
    minVisibleRows?: number;
    exportBaseName?: string;
    textSize?: 'sm' | 'xs';
    selectionMode?: 'single' | 'multiple' | false;
    selectionCheckboxes?: boolean;
    highlightSelectedRow?: boolean;
    autoSizeColumns?: boolean;
    rowClassRules?: RowClassRules;
  }>(),
  {
    rowKey: 'id',
    dense: true,
    striped: true,
    height: undefined,
    pagination: false,
    pageSize: 8,
    pageSizeOptions: false,
    autoPageSize: true,
    minVisibleRows: 4,
    exportBaseName: 'opsfactor-data',
    textSize: OFX_TABLE_COMPACT_TEXT_SIZE,
    selectionMode: false,
    selectionCheckboxes: false,
    highlightSelectedRow: false,
    autoSizeColumns: true,
    rowClassRules: undefined,
  },
);

const emit = defineEmits<{
  'selection-change': [rows: Record<string, unknown>[]];
  'row-click': [row: Record<string, unknown>];
  'cell-click': [payload: { row: Record<string, unknown>; field: string; value: unknown }];
  'boolean-toggle-all': [payload: BooleanHeaderTogglePayload];
}>();

const slots = useSlots();
const gridApi = shallowRef<GridApi | null>(null);
const components = { ofxCellRenderer: OfxAgGridCellRenderer };

type BooleanHeaderParams = {
  api: GridApi;
  field: string;
  onToggleAll: (payload: BooleanHeaderTogglePayload) => void;
};

/** Keeps the generic all-boolean command in the neutral rendering layer. */
class BooleanHeaderToggleRenderer {
  private params!: BooleanHeaderParams;
  private readonly gui = document.createElement('div');
  private readonly checkbox = document.createElement('input');
  private readonly label = document.createElement('span');
  private readonly syncState = () => {
    let visibleRows = 0;
    let checkedRows = 0;

    this.params.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data as Record<string, unknown> | null | undefined;
      if (!row) return;
      visibleRows += 1;
      if (row[this.params.field] === true) checkedRows += 1;
    });

    this.checkbox.disabled = visibleRows === 0;
    this.checkbox.checked = visibleRows > 0 && checkedRows === visibleRows;
    this.checkbox.indeterminate = checkedRows > 0 && checkedRows < visibleRows;
  };
  private readonly handleToggle = () => {
    const rows: Record<string, unknown>[] = [];
    const nextValue = this.checkbox.checked;

    this.params.api.forEachNodeAfterFilterAndSort((node) => {
      const row = node.data as Record<string, unknown> | null | undefined;
      if (!row) return;
      row[this.params.field] = nextValue;
      rows.push(row);
    });

    this.params.api.refreshCells({ force: true, columns: [this.params.field] });
    this.params.api.refreshHeader();
    this.params.onToggleAll({ field: this.params.field, value: nextValue, rows });
  };

  init(params: BooleanHeaderParams) {
    this.params = params;
    this.gui.className = 'ofx-ag-boolean-header-toggle';
    this.checkbox.className = 'ofx-ag-boolean-header-toggle__checkbox';
    this.checkbox.type = 'checkbox';
    this.label.className = 'ofx-ag-boolean-header-toggle__label';
    this.label.textContent = 'All';
    this.gui.append(this.checkbox, this.label);
    this.checkbox.addEventListener('change', this.handleToggle);
    this.params.api.addEventListener('filterChanged', this.syncState);
    this.params.api.addEventListener('modelUpdated', this.syncState);
    this.params.api.addEventListener('paginationChanged', this.syncState);
    this.syncState();
  }

  getGui() { return this.gui; }

  refresh(params: BooleanHeaderParams) {
    this.params = params;
    this.syncState();
    return true;
  }

  destroy() {
    this.checkbox.removeEventListener('change', this.handleToggle);
    this.params.api.removeEventListener('filterChanged', this.syncState);
    this.params.api.removeEventListener('modelUpdated', this.syncState);
    this.params.api.removeEventListener('paginationChanged', this.syncState);
  }
}

const gridIcons = {
  menu: '<span class="ofx-ag-icon">⋯</span>', filter: '<span class="ofx-ag-icon">⌕</span>', columns: '<span class="ofx-ag-icon">☷</span>',
  sortAscending: '<span class="ofx-ag-icon">↑</span>', sortDescending: '<span class="ofx-ag-icon">↓</span>', sortUnSort: '<span class="ofx-ag-icon">↕</span>',
  first: '<span class="ofx-ag-icon">⏮</span>', previous: '<span class="ofx-ag-icon">‹</span>', next: '<span class="ofx-ag-icon">›</span>',
  last: '<span class="ofx-ag-icon">⏭</span>', selectOpen: '<span class="ofx-ag-icon">▾</span>',
};

const rowHeight = computed(() => (props.dense ? OFX_TABLE_COMPACT_ROW_HEIGHT : OFX_TABLE_COMFORTABLE_ROW_HEIGHT));
const headerHeight = computed(() => (props.dense ? OFX_TABLE_COMPACT_HEADER_HEIGHT : OFX_TABLE_COMFORTABLE_HEADER_HEIGHT));
const pagingPanelHeight = 40;
const horizontalScrollHeight = 18;
const effectivePageSize = computed(() => Math.max(props.pageSize, 1));
const minimumVisibleRows = computed(() => Math.min(Math.max(props.minVisibleRows, 1), effectivePageSize.value));
const shouldShowPaginationPanel = computed(() => props.pagination && props.rows.length > effectivePageSize.value);

function normalizeHeight(value: number | string) {
  if (typeof value === 'number') return `${value}px`;
  const trimmedValue = value.trim();
  return /^\d+(\.\d+)?$/.test(trimmedValue) ? `${trimmedValue}px` : trimmedValue;
}

const resolvedHeight = computed(() => {
  if (props.height != null) return props.height;
  const totalRows = Math.max(props.rows.length, 1);
  const desiredRows = shouldShowPaginationPanel.value ? effectivePageSize.value : totalRows;
  const visibleRows = Math.min(Math.max(desiredRows, minimumVisibleRows.value), effectivePageSize.value);
  return visibleRows * rowHeight.value + headerHeight.value + horizontalScrollHeight + (shouldShowPaginationPanel.value ? pagingPanelHeight : 0) + 2;
});
const resolvedHeightStyle = computed(() => normalizeHeight(resolvedHeight.value));
const isFillHeight = computed(() => resolvedHeightStyle.value === '100%');

const defaultColDef: ColDef = { sortable: true, resizable: true, suppressMovable: true, filter: true, floatingFilter: false };

function getFilterType(column: OfxTableColumn) {
  switch (column.dataType) {
    case 'currency-2': case 'currency-0': case 'number-2': case 'number-1': case 'number-0':
    case 'percent-2': case 'percent-1': case 'percent-0':
    case 'fraction-percent-2': case 'fraction-percent-1': case 'fraction-percent-0': return 'agNumberColumnFilter';
    case 'date': case 'datetime': return 'agDateColumnFilter';
    case 'boolean-nullable': return 'agTextColumnFilter';
    case 'text': default: return 'agTextColumnFilter';
  }
}

function getFilterParams(column: OfxTableColumn) {
  if (column.dataType === 'boolean-nullable') return { filterOptions: ['equals', 'contains'], buttons: ['reset', 'apply'], closeOnApply: true, debounceMs: 150 };
  if (column.dataType === 'date' || column.dataType === 'datetime') {
    return {
      browserDatePicker: true, buttons: ['reset', 'apply'], closeOnApply: true,
      comparator: (filterLocalDateAtMidnight: Date, cellValue: unknown) => {
        const value = normalizeDate(cellValue);
        if (!value) return -1;
        const cellDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
        if (cellDate < filterLocalDateAtMidnight) return -1;
        if (cellDate > filterLocalDateAtMidnight) return 1;
        return 0;
      },
    };
  }
  return { buttons: ['reset', 'apply'], closeOnApply: true };
}

const columnDefs = computed<ColDef[]>(() => props.columns.map((column, index) => {
  const alignment = getColumnAlignment(column);
  const selectionEnabled = Boolean(props.selectionMode);
  const selectionColumn = selectionEnabled && props.selectionCheckboxes && index === 0;
  const numericWidth = column.width?.endsWith('%') ? undefined : Number.parseInt(column.width ?? '', 10) || undefined;
  const percentFlex = column.width?.endsWith('%') ? Number.parseInt(column.width, 10) : undefined;
  const baseColumnDef = {
    field: column.field,
    headerName: column.header,
    width: props.autoSizeColumns ? numericWidth : numericWidth,
    flex: props.autoSizeColumns ? undefined : (percentFlex ?? (numericWidth == null ? 1 : undefined)),
    minWidth: column.minWidth ?? 120,
    cellDataType: false,
    cellRenderer: slots[`cell-${column.field}`] ? 'ofxCellRenderer' : undefined,
    valueFormatter: slots[`cell-${column.field}`] ? undefined : (params: { value: unknown }) => formatDisplayValue(column.dataType, params.value, column.emptyValueLabel),
    comparator: (left: unknown, right: unknown) => compareTypedValues(column.dataType, left, right),
    filter: column.filterable === false ? false : getFilterType(column),
    sortable: column.sortable !== false,
    filterParams: getFilterParams(column),
    cellStyle: column.cellStyle as ColDef['cellStyle'],
    cellClassRules: column.cellClassRules as ColDef['cellClassRules'],
    filterValueGetter: column.dataType === 'boolean-nullable' ? ((params: { data: Record<string, unknown> | null }) => mapBooleanFilterValue(params.data?.[column.field])) : undefined,
    headerComponent: column.dataType === 'boolean-nullable' && column.headerCheckboxToggle ? BooleanHeaderToggleRenderer : undefined,
    headerComponentParams: column.dataType === 'boolean-nullable' && column.headerCheckboxToggle ? { field: column.field, onToggleAll: (payload: BooleanHeaderTogglePayload) => emit('boolean-toggle-all', payload) } : undefined,
    checkboxSelection: selectionColumn,
    headerCheckboxSelection: selectionColumn && props.selectionMode === 'multiple',
    headerCheckboxSelectionFilteredOnly: selectionColumn && props.selectionMode === 'multiple',
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: column.filterable === false,
    headerClass: ['ofx-ag-grid-header-cell', alignment === 'right' ? 'is-right' : alignment === 'center' ? 'is-center' : 'is-left'],
    cellClass: ['ofx-ag-grid-body-cell', alignment === 'right' ? 'is-right' : alignment === 'center' ? 'is-center' : 'is-left'],
  } satisfies ColDef;
  return { ...baseColumnDef, ...(column.agGridColDef ?? {}) } satisfies ColDef;
}));

const context = computed(() => ({ ofxSlots: slots }));
const gridOptions = computed(() => ({
  rowHeight: rowHeight.value, headerHeight: headerHeight.value, enableCellTextSelection: true, suppressCellFocus: true,
  animateRows: true, domLayout: 'normal' as const, columnMenu: 'new' as const, context: context.value,
  pagination: props.pagination, paginationPageSize: effectivePageSize.value, paginationPageSizeSelector: props.autoPageSize ? false : props.pageSizeOptions,
  paginationAutoPageSize: props.autoPageSize, suppressPaginationPanel: props.pagination && !shouldShowPaginationPanel.value,
  rowSelection: props.selectionMode || undefined, suppressScrollOnNewData: true, suppressColumnVirtualisation: props.autoSizeColumns,
  suppressRowVirtualisation: false, suppressMenuHide: false, tooltipShowDelay: 350, icons: gridIcons, rowClassRules: props.rowClassRules,
}));

function handleGridReady(event: GridReadyEvent) { gridApi.value = event.api; scheduleAutoSizeColumns(); }
function handleFirstDataRendered(_event: FirstDataRenderedEvent) { scheduleAutoSizeColumns(); }
function handleGridSizeChanged() { scheduleAutoSizeColumns(); }
function handleSelectionChanged(event: SelectionChangedEvent) { emit('selection-change', event.api.getSelectedRows() as Record<string, unknown>[]); }
function handleRowClicked(event: RowClickedEvent) {
  if (props.selectionMode && event.node) event.node.setSelected(true, props.selectionMode === 'single');
  if (event.data) emit('row-click', event.data as Record<string, unknown>);
}
function handleCellClicked(event: CellClickedEvent) {
  if (event.data && event.colDef.field) emit('cell-click', { row: event.data as Record<string, unknown>, field: event.colDef.field, value: event.value });
}
function getDisplayedColumns() {
  const api = gridApi.value;
  if (!api) return props.columns;
  const displayedFields = api.getAllDisplayedColumns().map((column) => column.getColId()).filter((field) => props.columns.some((column) => column.field === field));
  return displayedFields.map((field) => props.columns.find((column) => column.field === field)).filter((column): column is OfxTableColumn => Boolean(column));
}
function getFilteredSortedRows() {
  const api = gridApi.value;
  if (!api) return props.rows;
  const rows: Record<string, unknown>[] = [];
  api.forEachNodeAfterFilterAndSort((node) => { if (node.data) rows.push(node.data as Record<string, unknown>); });
  return rows;
}
function exportData(format: OfxExportFormat) { exportTableData({ baseName: props.exportBaseName, columns: getDisplayedColumns(), rows: getFilteredSortedRows(), format }); }
function sizeColumnsToFit() { gridApi.value?.sizeColumnsToFit(); }
function autoSizeColumns() {
  if (!gridApi.value) return;
  const displayedColumnIds = gridApi.value.getAllDisplayedColumns().map((column) => column.getColId());
  if (!displayedColumnIds.length) return;
  try { gridApi.value.autoSizeColumns(displayedColumnIds, false); } catch { /* Preserve widths when autosize is unavailable. */ }
}
function scheduleAutoSizeColumns() {
  if (!props.autoSizeColumns) return;
  nextTick(() => { requestAnimationFrame(() => { requestAnimationFrame(() => { autoSizeColumns(); }); }); });
}
watch(() => [props.rows, props.columns, props.autoSizeColumns], () => { if (gridApi.value) scheduleAutoSizeColumns(); }, { deep: true });
function clearSelection() { gridApi.value?.deselectAll(); }
function getSelectedRows() { return (gridApi.value?.getSelectedRows() as Record<string, unknown>[] | undefined) ?? []; }
defineExpose({ exportData, sizeColumnsToFit, autoSizeColumns, clearSelection, getSelectedRows });
</script>

<template>
  <div class="ofx-ag-grid-shell" :class="{ 'is-fill-height': isFillHeight }">
    <div class="ofx-ag-grid ag-theme-quartz" :class="[props.dense ? 'is-dense' : 'is-comfortable', props.textSize === 'xs' ? 'is-text-xs' : 'is-text-sm', props.striped ? 'is-striped' : 'is-unstriped', isFillHeight ? 'is-fill-height' : null, props.highlightSelectedRow ? 'has-selected-row-highlight' : null]" :style="{ height: resolvedHeightStyle }">
      <AgGridVue
        class="h-full w-full" style="width: 100%; height: 100%;" :row-data="props.rows" :column-defs="columnDefs" :default-col-def="defaultColDef"
        :get-row-id="(params) => String(params.data?.[props.rowKey] ?? '')" :components="components" :grid-options="gridOptions" theme="legacy"
        @grid-ready="handleGridReady" @first-data-rendered="handleFirstDataRendered" @grid-size-changed="handleGridSizeChanged"
        @selection-changed="handleSelectionChanged" @row-clicked="handleRowClicked" @cell-clicked="handleCellClicked"
      />
    </div>
  </div>
</template>

<style scoped>
.ofx-ag-boolean-header-toggle { display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: 0.35rem; color: rgb(230 236 248 / 0.86); }
.ofx-ag-boolean-header-toggle__checkbox { height: 0.9rem; width: 0.9rem; cursor: pointer; accent-color: rgb(69 104 206); }
.ofx-ag-boolean-header-toggle__label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em; }
</style>
