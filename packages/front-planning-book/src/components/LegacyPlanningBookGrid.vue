<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellClassParams,
  type CellClickedEvent,
  type CellContextMenuEvent,
  type ColDef,
  type EditableCallbackParams,
  type FilterChangedEvent,
  type FirstDataRenderedEvent,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
  type ITooltipParams,
  type SortChangedEvent,
  type ValueFormatterParams,
} from 'ag-grid-community';
import PlanningBookTreeCellRenderer from './PlanningBookTreeCellRenderer.vue';
import type {
  PlanningBookColumnDefDto,
  PlanningBookDto,
  PlanningBookRow,
  PlanningBookSelectedCellDto,
} from '../planning-book.dto.js';
import {
  aggregatePlanningBookSubtotalField,
  getPlanningBookPeriodField,
  normalizePlanningBook,
  selectPlanningBookSubtotalContributors,
} from '../planning-book.normalization.js';

const OFX_TABLE_COMPACT_ROW_HEIGHT = 30;
const OFX_TABLE_COMPACT_HEADER_HEIGHT = 32;

ModuleRegistry.registerModules([AllCommunityModule]);

const props = withDefaults(
  defineProps<{
    planningBook: PlanningBookDto;
    height?: number | string;
    mode?: 'generic' | 'demand' | 'supply' | 'production';
    pendingEditCount?: number;
    isSaving?: boolean;
    orderedFields?: string[];
    pinnedFields?: string[];
    pendingEdits?: PlanningBookSelectedCellDto[];
    detailsEnabled?: boolean;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    mode: 'generic',
    pendingEditCount: 0,
    isSaving: false,
    orderedFields: () => [],
    pinnedFields: () => [],
    pendingEdits: () => [],
    detailsEnabled: false,
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  edit: [payload: { row: PlanningBookRow; field: string; newValue: number; oldValue: number }];
  'unavailable-edit': [payload: { reason: string }];
  'request-details': [payload: { row: PlanningBookRow; field: string }];
}>();

const isLightTheme = computed(() => props.themeMode === 'light');
const gridApi = ref<GridApi<PlanningBookRow> | null>(null);
const rootElement = ref<HTMLDivElement | null>(null);
const contextMenuElement = ref<HTMLDivElement | null>(null);
const expandedState = reactive<Record<string, boolean>>({});
const subtotalKeyFigure = ref('');
const displayedRows = ref<PlanningBookRow[]>([]);
const contextMenu = ref<{ x: number; y: number; row: PlanningBookRow; field: string } | null>(null);
const expansionInitialized = ref(false);
const hasActiveFilters = ref(false);

const supplyPlanSuffixes = ['Constrained Plan', 'Unconstrained Plan', 'Working Plan'];
const supplyMaterialDetailKeyFigures = new Set([
  'Planned Inbound',
  'Inbound Orders',
  'Planned Production',
  'Production Orders',
]);
const supplyAggregatedDetailKeyFigures = new Set([
  'Indirect Demand',
]);

const normalized = computed(() => normalizePlanningBook(props.planningBook));

/**
 * The backend publishes this family so the SPA can mirror the batch-edit guard
 * without hard-coding workflow components. Gross/Net and Direct Demand share
 * the same quantity result, therefore a pending edit locks sibling key figures
 * at the same planning-book scope and period.
 */
const directDemandAdjustmentKeyFigureIds = computed(() => new Set(
  (props.planningBook.additionalParameters?.directDemandAdjustmentKeyFigures ?? '')
    .split(/[|,]/)
    .map((keyFigure) => keyFigure.trim())
    .filter(Boolean),
));

function getKeyFigureScopeKey(row: PlanningBookRow) {
  const keyFigureSuffix = `-${row.keyFigure}`;
  const suffixIndex = row.rowKey.lastIndexOf(keyFigureSuffix);

  return suffixIndex >= 0 ? row.rowKey.slice(0, suffixIndex) : row.rowKey;
}

function doesRowMatchPendingEditScope(row: PlanningBookRow, edit: PlanningBookSelectedCellDto) {
  if (row.keyFigure !== edit.keyFigure) return false;

  const descriptors = {
    ...edit.locationDescriptionCols,
    ...edit.materialDescriptionCols,
  };

  return Object.entries(descriptors).every(([field, value]) => String(row[field] ?? '') === value);
}

function applyPendingDemandFamilyLocks() {
  normalized.value.rows.forEach((row) => {
    row.lockedCells = undefined;
  });

  if (props.planningBook.autoSubmitChanges || !directDemandAdjustmentKeyFigureIds.value.size) {
    return;
  }

  props.pendingEdits.forEach((edit) => {
    if (!directDemandAdjustmentKeyFigureIds.value.has(edit.keyFigure)) return;

    const periodField = getPlanningBookPeriodField(props.planningBook, edit.period);
    const editedRows = normalized.value.rows.filter((row) => doesRowMatchPendingEditScope(row, edit));

    editedRows.forEach((editedRow) => {
      const scopeKey = getKeyFigureScopeKey(editedRow);

      normalized.value.rows.forEach((candidateRow) => {
        if (candidateRow.rowKey === editedRow.rowKey
          || getKeyFigureScopeKey(candidateRow) !== scopeKey
          || !directDemandAdjustmentKeyFigureIds.value.has(candidateRow.keyFigure)) {
          return;
        }

        candidateRow.lockedCells ??= {};
        candidateRow.lockedCells[periodField] = 'This cell is locked because an unsaved Gross/Net or Direct Demand quantity adjustment exists for this level and period.';
      });
    });
  });

  gridApi.value?.refreshCells({ force: true });
}

watch(
  [normalized, () => props.pendingEdits, directDemandAdjustmentKeyFigureIds],
  () => applyPendingDemandFamilyLocks(),
  { immediate: true },
);

const orderedColumns = computed(() => {
  const columnsByField = new Map(props.planningBook.columnDefs.map((column) => [column.field, column]));
  const configuredOrder = props.orderedFields
    .map((field) => columnsByField.get(field))
    .filter((column): column is PlanningBookColumnDefDto => Boolean(column));
  const configuredFields = new Set(configuredOrder.map((column) => column.field));

  return [
    ...configuredOrder,
    ...props.planningBook.columnDefs.filter((column) => !configuredFields.has(column.field)),
  ];
});

const pinnedFieldSet = computed(() => new Set([
  ...props.planningBook.columnDefs.filter((column) => column.pinnedLeft).map((column) => column.field),
  ...props.pinnedFields,
]));

watch(
  normalized,
  (value) => {
    const nextRowKeys = new Set(value.rows.map((row) => row.rowKey));

    Object.keys(expandedState).forEach((key) => {
      if (!nextRowKeys.has(key)) delete expandedState[key];
    });

    if (!expansionInitialized.value) {
      value.rows.forEach((row) => {
        if (row.hasChildren && row.isPrimaryKeyFigureRow) expandedState[row.rowKey] = false;
      });
      expansionInitialized.value = true;
      return;
    }

    value.rows.forEach((row) => {
      if (row.hasChildren && row.isPrimaryKeyFigureRow && expandedState[row.rowKey] == null) {
        expandedState[row.rowKey] = false;
      }
    });
  },
  { immediate: true },
);

watch(
  () => props.planningBook.keyFigures,
  (keyFigures) => {
    if (!keyFigures.length) {
      subtotalKeyFigure.value = '';
      return;
    }

    if (!keyFigures.includes(subtotalKeyFigure.value)) {
      subtotalKeyFigure.value = keyFigures[0];
    }
  },
  { immediate: true, deep: true },
);

const expandedRows = computed(() =>
  normalized.value.rows.filter((row) => row.ancestorKeys.every((ancestorKey) => expandedState[ancestorKey] !== false)),
);

const visibleRows = computed(() => (
  hasActiveFilters.value
    ? normalized.value.rows
    : expandedRows.value
));

watch(
  visibleRows,
  async (rows) => {
    if (!gridApi.value) {
      displayedRows.value = rows;
      return;
    }

    await nextTick();
    syncDisplayedRows();
  },
  { immediate: true },
);

function isNumberColumn(column: PlanningBookColumnDefDto) {
  return Boolean(column.dataColumn || column.cellFilter?.includes('customFormatNumber'));
}

function isPastPeriodColumn(column: PlanningBookColumnDefDto) {
  return column.cellClass === 'pastPeriods' || column.field === 'Average Historical Sales';
}

function formatNumericValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value ?? Number.NaN);
  if (!Number.isFinite(number)) return '';

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Preserves the backend's explicit financial-data state instead of formatting
 * an unavailable Gross/Net amount as an empty or zero numeric cell.
 */
function formatPlanningBookCellValue(row: PlanningBookRow | undefined, field: string, value: unknown) {
  if (row?.unavailableReasons?.[field]) return 'N/A';
  return formatNumericValue(value);
}

function parseEditableNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number(value ?? Number.NaN);

  const normalizedValue = value.trim().replace(/,/g, '');
  if (normalizedValue.length === 0) return 0;

  return Number(normalizedValue);
}

function isEditableCell(row: PlanningBookRow, field: string, column: PlanningBookColumnDefDto) {
  if (row.unavailableReasons?.[field]) return false;

  const lockedReason = row.lockedCells?.[field];
  const additionalClasses = row.additionalClasses?.[field] ?? [];
  const isFrozen = additionalClasses.includes('crosshatch');
  const mode = String(row.editMode ?? 'noEdit');

  if (lockedReason || isFrozen) return false;
  if (column.enableCellEdit === false) return false;

  return mode === 'cellEdit' || mode === 'detailOrCellEdit';
}

function getCellStyle(row: PlanningBookRow, field: string, column: PlanningBookColumnDefDto) {
  const styles: Record<string, string> = {};
  const additionalClasses = row.additionalClasses?.[field] ?? [];

  if (column.dataColumn) {
    styles.justifyContent = 'flex-end';
    styles.textAlign = 'right';
    styles.fontVariantNumeric = 'tabular-nums';
  }

  if (row.unavailableReasons?.[field]) {
    styles.background = isLightTheme.value
      ? 'linear-gradient(180deg, rgba(227, 102, 102, 0.16), rgba(255, 239, 239, 0.9))'
      : 'linear-gradient(180deg, rgba(227, 102, 102, 0.18), rgba(102, 35, 45, 0.2))';
    styles.color = isLightTheme.value ? 'rgba(132, 38, 50, 0.96)' : 'rgba(255, 213, 219, 0.94)';
    styles.fontWeight = '600';
  }

  if (additionalClasses.includes('crosshatch')) {
    styles.background = isLightTheme.value
      ? 'repeating-linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.18) 7px, rgba(226,232,240,0.55) 7px, rgba(226,232,240,0.55) 14px)'
      : 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 7px, rgba(255,255,255,0.02) 7px, rgba(255,255,255,0.02) 14px)';
    styles.color = isLightTheme.value ? 'rgba(82,97,121,0.92)' : 'rgba(206,216,238,0.72)';
  }

  if (row.updatedCells?.[field]) {
    styles.background = isLightTheme.value
      ? 'linear-gradient(180deg, rgba(31, 135, 93, 0.14), rgba(226, 247, 239, 0.82))'
      : 'linear-gradient(180deg, rgba(68, 204, 153, 0.18), rgba(27, 76, 61, 0.18))';
    styles.boxShadow = isLightTheme.value
      ? 'inset 0 0 0 1px rgba(31, 135, 93, 0.22)'
      : 'inset 0 0 0 1px rgba(68, 204, 153, 0.28)';
  }

  if (row.lockedCells?.[field]) {
    styles.background = isLightTheme.value
      ? 'linear-gradient(180deg, rgba(211, 155, 42, 0.15), rgba(255, 248, 230, 0.9))'
      : 'linear-gradient(180deg, rgba(238, 173, 68, 0.15), rgba(122, 82, 23, 0.16))';
    styles.color = isLightTheme.value ? 'rgba(95, 67, 18, 0.96)' : 'rgba(255, 235, 204, 0.9)';
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

function getTooltip(row: PlanningBookRow, field: string) {
  return row.unavailableReasons?.[field]
    ?? row.lockedCells?.[field]
    ?? row.updatedCells?.[field]
    ?? row.toolTips?.[field]
    ?? undefined;
}

function buildCellClasses(column: PlanningBookColumnDefDto, params: CellClassParams<PlanningBookRow>) {
  const classes = [
    'ofx-ag-grid-body-cell',
    column.dataColumn ? 'is-right' : 'is-left',
  ];

  if (column.field === 'keyFigure') classes.push('ofx-planning-book-key-figure-column');
  if (params.data?.isPrimaryKeyFigureRow && !column.dataColumn) classes.push('ofx-planning-book-primary-row');
  if (!params.data?.isPrimaryKeyFigureRow && column.field === 'keyFigure') classes.push('ofx-planning-book-secondary-key-figure');
  if (isPastPeriodColumn(column)) classes.push('ofx-planning-book-past-period');
  if (params.data?.isDetailedRow) classes.push('ofx-planning-book-detailed-row');
  if (params.node.rowPinned === 'bottom') classes.push('ofx-planning-book-subtotal-row');

  return classes;
}

function buildHierarchyCellClasses(params: CellClassParams<PlanningBookRow>) {
  const classes = ['ofx-ag-grid-body-cell', 'is-center', 'ofx-planning-book-hierarchy-column'];

  if (params.data?.isDetailedRow) classes.push('ofx-planning-book-detailed-row');
  if (params.node.rowPinned === 'bottom') classes.push('ofx-planning-book-subtotal-row');

  return classes;
}

function buildSubtotalRow(): PlanningBookRow {
  const subtotalRow: PlanningBookRow = {
    rowKey: '__subtotal__',
    ancestorKeys: [],
    level: 0,
    treeDepth: 0,
    rowOrder: -1,
    hasChildren: false,
    keyFigure: subtotalKeyFigure.value,
    groupLabel: 'Subtotal',
    isPrimaryKeyFigureRow: true,
    isDetailedRow: false,
    hierarchyVariant: 'group-total',
    uom: props.planningBook.uom,
    editMode: 'noEdit',
  };

  normalized.value.descriptorFields.forEach((field) => {
    subtotalRow[field] = '';
  });

  const contributingRows = selectPlanningBookSubtotalContributors(
    normalized.value.rows,
    displayedRows.value,
    subtotalKeyFigure.value,
    !hasActiveFilters.value,
  );

  normalized.value.periodFields.forEach((field) => {
    const aggregatedCell = aggregatePlanningBookSubtotalField(
      props.planningBook,
      subtotalKeyFigure.value,
      contributingRows,
      field,
    );

    subtotalRow[field] = aggregatedCell.value;
    if (aggregatedCell.unavailableReason) {
      subtotalRow.unavailableReasons ??= {};
      subtotalRow.unavailableReasons[field] = aggregatedCell.unavailableReason;
    }
  });

  return subtotalRow;
}

const subtotalRows = computed(() => (subtotalKeyFigure.value ? [buildSubtotalRow()] : []));
const containerHeightStyle = computed(() => {
  if (props.height == null) return '100%';
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});
const rootClass = computed(() => (
  isLightTheme.value
    ? 'bg-[color:var(--ofx-surface)]'
    : 'bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]'
));
const headerClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]'
    : 'border-white/6'
));
const headerTextClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/42'));
const headerDotClass = computed(() => (isLightTheme.value ? 'bg-[color:var(--ofx-border-strong)]' : 'bg-white/18'));
const subtotalControlClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/10 bg-white/[0.04] text-white/74'
));
const subtotalLabelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/48'));
const subtotalSelectClass = computed(() => (
  isLightTheme.value
    ? 'bg-transparent text-xs font-medium text-[color:var(--ofx-text)] outline-none'
    : 'bg-transparent text-xs font-medium text-white outline-none'
));
const optionClass = computed(() => (isLightTheme.value ? 'bg-white' : 'bg-[rgb(11_17_29)]'));
const contextMenuClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]'
    : 'border-white/12 bg-[rgb(10_16_29_/_0.98)]'
));
const contextMenuButtonClass = computed(() => (
  isLightTheme.value
    ? 'text-[color:var(--ofx-text)] hover:bg-[color:var(--ofx-surface-elevated)]'
    : 'text-white/88 hover:bg-white/[0.06]'
));

function toggleRow(rowKey: string) {
  expandedState[rowKey] = !expandedState[rowKey];
  void nextTick().then(() => {
    syncDisplayedRows();
    autoSizeLeadingColumns();
  });
}

function syncDisplayedRows() {
  if (!gridApi.value) {
    displayedRows.value = visibleRows.value;
    return;
  }

  const rows: PlanningBookRow[] = [];
  gridApi.value.forEachNodeAfterFilterAndSort((node) => {
    if (node.rowPinned || !node.data) return;
    rows.push(node.data);
  });
  displayedRows.value = rows;
}

function autoSizeLeadingColumns() {
  if (!gridApi.value) return;

  const nonPeriodColumns = orderedColumns.value
    .filter((column) => !column.dataColumn)
    .map((column) => column.field);

  if (!nonPeriodColumns.length) return;

  try {
    gridApi.value.autoSizeColumns(['__hierarchy__', ...nonPeriodColumns], true);
  } catch {
    // Keep the fallback widths when autosize is unavailable.
  }
}

function getColumnWidth(column: PlanningBookColumnDefDto) {
  if (column.dataColumn) return isPastPeriodColumn(column) ? 112 : 124;
  if (column.field === 'uom') return 58;
  if (column.field === 'keyFigure') return 156;
  if (column.field.endsWith('Description')) return 164;
  if (column.field.endsWith('Id')) return 138;
  if (pinnedFieldSet.value.has(column.field)) return 78;
  return 104;
}

const columnDefs = computed<ColDef<PlanningBookRow>[]>(() => [
  {
    colId: '__hierarchy__',
    field: 'hierarchyVariant',
    headerName: '',
    width: 46,
    minWidth: 46,
    maxWidth: 46,
    pinned: 'left',
    sortable: false,
    filter: false,
    resizable: false,
    lockPinned: true,
    editable: false,
    cellRenderer: 'planningBookTreeCellRenderer',
    headerClass: ['ofx-ag-grid-header-cell', 'ofx-planning-book-hierarchy-header'],
    cellClass: buildHierarchyCellClasses,
  },
  ...orderedColumns.value.map((column) => ({
    colId: column.field,
    field: column.field,
    headerName: column.name,
    minWidth: getColumnWidth(column),
    width: getColumnWidth(column),
    pinned: pinnedFieldSet.value.has(column.field) ? ('left' as const) : undefined,
    sortable: column.enableSorting !== false,
    filter: column.enableFiltering === false ? false : isNumberColumn(column) ? 'agNumberColumnFilter' : 'agTextColumnFilter',
    resizable: true,
    lockPinned: false,
    editable: (params: EditableCallbackParams<PlanningBookRow>) => {
      if (params.node.rowPinned || !params.data) return false;
      return isEditableCell(params.data, column.field, column);
    },
    valueFormatter: isNumberColumn(column)
      ? (params: ValueFormatterParams<PlanningBookRow>) => formatPlanningBookCellValue(
        params.data,
        column.field,
        params.value,
      )
      : undefined,
    cellStyle: (params: { node: { rowPinned?: string | null }; data?: PlanningBookRow }) => (params.node.rowPinned || !params.data
      ? undefined
      : getCellStyle(params.data, column.field, column)),
    tooltipValueGetter: (params: ITooltipParams<PlanningBookRow>) => (params.node?.rowPinned
      ? undefined
      : getTooltip(params.data as PlanningBookRow, column.field)),
    headerClass: column.dataColumn ? ['ofx-ag-grid-header-cell', 'is-right'] : ['ofx-ag-grid-header-cell'],
    cellClass: (params: CellClassParams<PlanningBookRow>) => buildCellClasses(column, params),
  })),
]);

const gridOptions = computed<GridOptions<PlanningBookRow>>(() => ({
  rowHeight: OFX_TABLE_COMPACT_ROW_HEIGHT,
  headerHeight: OFX_TABLE_COMPACT_HEADER_HEIGHT,
  enableCellTextSelection: true,
  suppressRowClickSelection: true,
  suppressContextMenu: true,
  suppressCellFocus: false,
  animateRows: false,
  tooltipShowDelay: 150,
  tooltipMouseTrack: true,
  stopEditingWhenCellsLoseFocus: true,
  alwaysShowHorizontalScroll: true,
  columnMenu: 'new',
  defaultColDef: {
    suppressMovable: false,
    menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'],
  },
  context: {
    toggleRow,
    isRowExpanded: (rowKey: string | undefined) => (rowKey ? expandedState[rowKey] !== false : true),
  },
}));

function handleGridReady(event: GridReadyEvent<PlanningBookRow>) {
  gridApi.value = event.api;
  hasActiveFilters.value = event.api.isAnyFilterPresent();
  syncDisplayedRows();
}

function handleFirstDataRendered(_event: FirstDataRenderedEvent<PlanningBookRow>) {
  autoSizeLeadingColumns();
  syncDisplayedRows();
}

function handleFilterChanged(_event: FilterChangedEvent<PlanningBookRow>) {
  hasActiveFilters.value = gridApi.value?.isAnyFilterPresent() ?? false;
  syncDisplayedRows();
}

function handleSortChanged(_event: SortChangedEvent<PlanningBookRow>) {
  syncDisplayedRows();
}

function closeContextMenu() {
  contextMenu.value = null;
}

function canOpenDetailsForEditMode(row: PlanningBookRow) {
  const editMode = String(row.editMode ?? 'noEdit');

  return (
    ((editMode === 'detailOrCellEdit' || editMode === 'detailDisaggregatedOnly') && Boolean(row.materialId))
    || editMode === 'detailAggregatedDisaggregated'
  );
}

function getSupplyBaseKeyFigure(keyFigure: string) {
  return supplyPlanSuffixes.reduce((current, suffix) => {
    if (current.endsWith(`-${suffix}`)) return current.slice(0, -suffix.length - 1);
    if (current.endsWith(` (${suffix})`)) return current.slice(0, -suffix.length - 3);
    return current;
  }, keyFigure);
}

function canOpenSupplyDetails(row: PlanningBookRow) {
  const baseKeyFigure = getSupplyBaseKeyFigure(String(row.keyFigure ?? ''));

  if (supplyAggregatedDetailKeyFigures.has(baseKeyFigure)) return true;
  if (supplyMaterialDetailKeyFigures.has(baseKeyFigure)) return Boolean(row.materialId);

  return canOpenDetailsForEditMode(row);
}

function canOpenDetailsForField(row: PlanningBookRow, field: string) {
  if (!props.detailsEnabled) return false;
  if (row.rowKey === '__subtotal__') return false;
  if (!normalized.value.periodFields.includes(field)) return false;

  if (props.mode === 'supply') return canOpenSupplyDetails(row);

  return canOpenDetailsForEditMode(row);
}

function handleCellContextMenu(event: CellContextMenuEvent<PlanningBookRow>) {
  const field = String(event.colDef.field ?? '');
  const row = event.data;
  const mouseEvent = event.event instanceof MouseEvent ? event.event : null;

  mouseEvent?.preventDefault();
  mouseEvent?.stopPropagation();

  if (!row || !canOpenDetailsForField(row, field)) {
    closeContextMenu();
    return;
  }

  const wrapper = rootElement.value?.getBoundingClientRect();
  if (!wrapper || !mouseEvent) return;

  const menuWidth = 172;
  const menuHeight = 52;
  const anchorX = Math.min(Math.max(mouseEvent.clientX - wrapper.left, 12), Math.max(wrapper.width - menuWidth - 12, 12));
  const anchorY = Math.min(Math.max(mouseEvent.clientY - wrapper.top, 12), Math.max(wrapper.height - menuHeight - 12, 12));

  contextMenu.value = {
    x: anchorX,
    y: anchorY,
    row,
    field,
  };
}

/** Shows the backend reason immediately when a user attempts to edit an N/A cell. */
function handleCellClicked(event: CellClickedEvent<PlanningBookRow>) {
  const row = event.data;
  const field = String(event.colDef.field ?? '');
  const unavailableReason = row?.unavailableReasons?.[field];

  if (unavailableReason) {
    emit('unavailable-edit', { reason: unavailableReason });
  }
}

function openDetailsFromContextMenu() {
  if (!contextMenu.value) return;

  emit('request-details', {
    row: contextMenu.value.row,
    field: contextMenu.value.field,
  });
  closeContextMenu();
}

function handleCellValueChanged(event: {
  data: PlanningBookRow;
  colDef: ColDef<PlanningBookRow>;
  newValue: unknown;
  oldValue: unknown;
}) {
  const field = String(event.colDef.field ?? '');
  const oldValue = typeof event.oldValue === 'number' ? event.oldValue : parseEditableNumber(event.oldValue);
  const newValue = parseEditableNumber(event.newValue);

  if (field.length === 0 || Number.isNaN(newValue) || oldValue === newValue) {
    if (Number.isNaN(newValue)) {
      event.data[field] = oldValue;
      gridApi.value?.refreshCells({
        columns: [field],
        force: true,
      });
    }

    return;
  }

  event.data.updatedCells ??= {};
  event.data.updatedCells[field] = `Modified cell: from ${formatNumericValue(oldValue)} to ${formatNumericValue(newValue)}`;

  emit('edit', {
    row: event.data,
    field,
    oldValue,
    newValue,
  });

  gridApi.value?.refreshCells({
    columns: [field],
    force: true,
  });
}

function handleGlobalPointerDown(pointerEvent: PointerEvent) {
  if (!contextMenu.value) return;

  const target = pointerEvent.target;
  if (!(target instanceof Node)) {
    closeContextMenu();
    return;
  }

  if (!contextMenuElement.value?.contains(target)) {
    closeContextMenu();
  }
}

function handleNativeContextMenu(mouseEvent: MouseEvent) {
  mouseEvent.preventDefault();
}

onMounted(() => {
  rootElement.value?.addEventListener('contextmenu', handleNativeContextMenu, true);
  window.addEventListener('pointerdown', handleGlobalPointerDown, true);
  window.addEventListener('resize', closeContextMenu);
  window.addEventListener('scroll', closeContextMenu, true);
});

onBeforeUnmount(() => {
  rootElement.value?.removeEventListener('contextmenu', handleNativeContextMenu, true);
  window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
  window.removeEventListener('resize', closeContextMenu);
  window.removeEventListener('scroll', closeContextMenu, true);
});
</script>

<template>
  <div
    ref="rootElement"
    :class="['relative flex min-h-0 flex-col overflow-hidden', rootClass]"
    :style="{ height: containerHeightStyle }"
    @contextmenu.prevent
  >
    <div :class="['shrink-0 border-b px-3 py-2', headerClass]">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div :class="['flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]', headerTextClass]">
          <slot name="header-leading" />
          <span>{{ props.planningBook.viewType }}</span>
          <span :class="['h-1 w-1 rounded-full', headerDotClass]"></span>
          <span>{{ displayedRows.length }} rows in view</span>
          <span :class="['h-1 w-1 rounded-full', headerDotClass]"></span>
          <span>{{ props.planningBook.autoSubmitChanges ? 'Automatic save' : 'Save in batch' }}</span>
          <span v-if="props.pendingEditCount" :class="['h-1 w-1 rounded-full', headerDotClass]"></span>
          <span v-if="props.pendingEditCount">{{ props.pendingEditCount }} pending edits</span>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <slot name="header-actions" />

          <label :class="['inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs', subtotalControlClass]">
            <span :class="subtotalLabelClass">Subtotal</span>
            <select
              v-model="subtotalKeyFigure"
              :class="subtotalSelectClass"
            >
              <option v-for="keyFigure in props.planningBook.keyFigures" :key="keyFigure" :value="keyFigure" :class="optionClass">
                {{ keyFigure }}
              </option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <div class="ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1">
      <AgGridVue
        class="h-full min-h-0 w-full"
        :row-data="visibleRows"
        :column-defs="columnDefs"
        :grid-options="gridOptions"
        :components="{ planningBookTreeCellRenderer: PlanningBookTreeCellRenderer }"
        :pinned-bottom-row-data="subtotalRows"
        :get-row-id="(params) => String(params.data?.rowKey ?? '')"
        theme="legacy"
        @grid-ready="handleGridReady"
        @first-data-rendered="handleFirstDataRendered"
        @filter-changed="handleFilterChanged"
        @sort-changed="handleSortChanged"
        @cell-clicked="handleCellClicked"
        @cell-context-menu="handleCellContextMenu"
        @cell-value-changed="handleCellValueChanged"
      />
    </div>

    <div
      v-if="contextMenu"
      ref="contextMenuElement"
      :class="['absolute z-20 min-w-[10.75rem] overflow-hidden rounded-[12px] border shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl', contextMenuClass]"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <button
        type="button"
        :class="['flex w-full items-center px-3 py-2.5 text-left text-sm font-medium transition', contextMenuButtonClass]"
        @click="openDetailsFromContextMenu"
      >
        <span>Show details</span>
      </button>
    </div>
  </div>
</template>
