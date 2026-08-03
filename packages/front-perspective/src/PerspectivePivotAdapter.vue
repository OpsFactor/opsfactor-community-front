<script setup lang="ts">
// Edition-neutral Perspective runtime; both edition hosts provide data and presentation policy only.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import perspective, { init_client, init_server, type Table } from '@perspective-dev/client';
import clientWasmUrl from '@perspective-dev/client/dist/wasm/perspective-js.wasm?url';
import serverWasmUrl from '@perspective-dev/server/dist/wasm/perspective-server.wasm?url';

type PerspectiveAggregateName = 'sum' | 'avg' | 'count' | 'distinct count' | 'last' | 'first' | 'max' | 'min' | 'weighted mean';
type PerspectiveAggregate = PerspectiveAggregateName | [PerspectiveAggregateName, string[]];
type PerspectiveGroupRollupMode = 'rollup' | 'flat';
type FieldOptionScope = 'group_by' | 'split_by' | 'sort' | 'filter' | 'columns';
type PerspectiveSchemaType = 'string' | 'float' | 'date';
type PerspectiveColumnConfig = {
  date_format?: Record<string, unknown>;
};
type DimensionFieldKind = 'string' | 'date' | 'month-year';
type ParsedDateDimension = {
  date: Date;
  display: 'date' | 'datetime' | 'month-year';
};
type TemporalBucketDisplay = 'year' | 'month-year' | 'date' | 'datetime';

type PerspectiveMeasure = {
  field: string;
  label?: string;
  enabled?: boolean;
  aggregation?: PerspectiveAggregate;
  allowAggregationChange?: boolean;
  allowedAggregations?: PerspectiveAggregate[];
};

type PerspectiveViewerApi = HTMLElement & {
  load: (table: unknown) => Promise<void>;
  restore: (config: Record<string, unknown>) => Promise<void>;
  save: () => Promise<Record<string, unknown>>;
  getView: () => Promise<{
    delete?: () => Promise<void>;
  }>;
  copy: (method?: string) => Promise<void>;
  download: (method?: string) => Promise<void>;
  notifyResize?: () => void;
  flush?: () => Promise<void>;
  toggleConfig?: () => void;
};

type PerspectiveRegularTableApi = {
  draw?: (options?: Record<string, unknown>) => Promise<void>;
  flush?: () => Promise<void>;
  resetAutoSize?: () => void;
  e?: {
    row_height?: number;
  };
  table_model?: {
    e?: {
      row_height?: number;
    };
  };
  shadowRoot?: ShadowRoot | null;
  [key: string]: unknown;
};

type PerspectiveDatagridElement = HTMLElement & {
  regular_table?: PerspectiveRegularTableApi;
  update?: (view: unknown) => Promise<void>;
};

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    rows: string[];
    columns?: string[];
    measures: PerspectiveMeasure[];
    height?: number | string;
    baseName?: string;
    allowRowSelection?: boolean;
    allowMeasureSelection?: boolean;
    allowAggregationSelection?: boolean;
    showMeasureControls?: boolean;
    showTotalsControls?: boolean;
    showActions?: boolean;
    showCopyAction?: boolean;
    showExportActions?: boolean;
    openSettingsByDefault?: boolean;
    allowSplitBySelection?: boolean;
    showDatagridToolbar?: boolean;
    showResetControl?: boolean;
    showPluginSelector?: boolean;
    showPluginSettingsControl?: boolean;
    showAllColumnsSection?: boolean;
    showExpressionsSection?: boolean;
    showStatusMetrics?: boolean;
    showTitleField?: boolean;
    totalizationFieldOptions?: string[];
    groupRollupMode?: PerspectiveGroupRollupMode;
    allowGroupRollupModeSelection?: boolean;
    hideGrandTotals?: boolean;
    hideSingleMeasureHeader?: boolean;
    temporalBucketSize?: string | null;
  }>(),
  {
    columns: () => [],
    height: 360,
    baseName: 'pivot-analysis',
    allowRowSelection: true,
    allowMeasureSelection: true,
    allowAggregationSelection: true,
    showMeasureControls: true,
    showTotalsControls: true,
    showActions: false,
    showCopyAction: true,
    showExportActions: true,
    openSettingsByDefault: false,
    allowSplitBySelection: true,
    showDatagridToolbar: false,
    showResetControl: false,
    showPluginSelector: false,
    showPluginSettingsControl: false,
    showAllColumnsSection: false,
    showExpressionsSection: false,
    showStatusMetrics: false,
    showTitleField: false,
    totalizationFieldOptions: () => [],
    groupRollupMode: 'flat',
    allowGroupRollupModeSelection: false,
    hideGrandTotals: false,
    hideSingleMeasureHeader: true,
    temporalBucketSize: null,
  },
);

const emit = defineEmits<{
  'config-update': [payload: { groupBy: string[]; splitBy: string[]; columns: string[] }];
}>();

const viewerRef = ref<PerspectiveViewerApi | null>(null);
const hostRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const copyFeedback = ref<'idle' | 'done'>('idle');
const isApplyingPolicy = ref(false);
const isSettingsPanelOpen = ref(false);

let workerPromise: Promise<Awaited<ReturnType<typeof perspective.worker>>> | null = null;
let currentTable: Table | null = null;
let runtimeReady = false;
let eventAbortController: AbortController | null = null;
let hostResizeObserver: ResizeObserver | null = null;
let hostIntersectionObserver: IntersectionObserver | null = null;
let datagridMountObserver: MutationObserver | null = null;
let datagridContentObserver: MutationObserver | null = null;
let datagridScrollElement: HTMLElement | null = null;
let datagridScrollHandler: (() => void) | null = null;
let viewerShadowObserver: MutationObserver | null = null;
let viewerSlotElement: HTMLSlotElement | null = null;
let viewerSlotChangeHandler: (() => void) | null = null;
let emptyColumnAssistHandler: ((event: Event) => void) | null = null;
let lastEmptyColumnPromptTarget: HTMLInputElement | null = null;
let lastEmptyColumnPromptAt = 0;
let queuedPolicyFrame = 0;
let policyBurstFrame = 0;
let policyBurstUntil = 0;
let queuedLayoutFrame = 0;
let layoutBurstFrame = 0;
let layoutBurstUntil = 0;
let queuedGrandTotalsFrame = 0;
let hasLoadedTable = false;
let isRebuilding = false;
let rebuildPending = false;
let lastMeaningfulConfig: { groupBy: string[]; splitBy: string[]; columns: string[] } | null = null;
let lastFieldOptionScope: FieldOptionScope | null = null;
let wasHostIntersecting = false;

const activeMeasures = computed(() => {
  const enabled = props.measures.filter((measure) => measure.enabled !== false);
  return enabled.length ? enabled : props.measures;
});

const lockedColumns = computed(() => activeMeasures.value.map((measure) => measure.field));
const measureFieldNames = computed(() => new Set(activeMeasures.value.map((measure) => measure.field)));

const dimensionFieldNames = computed(() => new Set([...props.rows, ...props.columns]));

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function parseMonthYearLabel(value: unknown): ParsedDateDimension | null {
  if (typeof value !== 'string') return null;

  const normalizedValue = value.trim().replace('.', '');
  const match = normalizedValue.match(/^([A-Za-z]+)\s+(\d{2}|\d{4})$/);
  if (!match) return null;

  const month = MONTH_NAME_TO_INDEX[match[1].toLowerCase()];
  if (month === undefined) return null;

  const numericYear = Number(match[2]);
  const year = numericYear < 100 ? 2000 + numericYear : numericYear;
  return {
    date: new Date(Date.UTC(year, month, 1)),
    display: 'month-year',
  };
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function dateHasTime(value: Date) {
  return value.getUTCHours() !== 0
    || value.getUTCMinutes() !== 0
    || value.getUTCSeconds() !== 0
    || value.getUTCMilliseconds() !== 0;
}

function parseIsoDateString(value: unknown): ParsedDateDimension | null {
  if (typeof value !== 'string') return null;

  const normalizedValue = value.trim();
  const yearMonthMatch = normalizedValue.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    return {
      date: new Date(Date.UTC(Number(yearMonthMatch[1]), Number(yearMonthMatch[2]) - 1, 1)),
      display: 'month-year',
    };
  }

  const dateTimeMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2}))?(?::(\d{2})(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!dateTimeMatch) return null;

  const year = Number(dateTimeMatch[1]);
  const month = Number(dateTimeMatch[2]) - 1;
  const day = Number(dateTimeMatch[3]);
  const hour = Number(dateTimeMatch[4] ?? 0);
  const minute = Number(dateTimeMatch[5] ?? 0);
  const second = Number(dateTimeMatch[6] ?? 0);
  const date = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (!Number.isFinite(date.getTime())) return null;

  return {
    date,
    display: hour || minute || second ? 'datetime' : 'date',
  };
}

function parseDateDimensionValue(value: unknown): ParsedDateDimension | null {
  if (isValidDate(value)) {
    return {
      date: value,
      display: dateHasTime(value) ? 'datetime' : 'date',
    };
  }

  return parseMonthYearLabel(value) ?? parseIsoDateString(value);
}

function resolveTemporalBucketDisplay() {
  const normalizedBucketSize = String(props.temporalBucketSize ?? '').toLowerCase();

  if (!normalizedBucketSize) return null;
  if (normalizedBucketSize.includes('year') || normalizedBucketSize.includes('annual') || normalizedBucketSize.includes('anual')) return 'year';
  if (normalizedBucketSize.includes('month') || normalizedBucketSize.includes('mensal')) return 'month-year';
  if (normalizedBucketSize.includes('hour') || normalizedBucketSize.includes('turn')) return 'datetime';
  if (normalizedBucketSize.includes('hora') || normalizedBucketSize.includes('turno')) return 'datetime';
  if (normalizedBucketSize.includes('day') || normalizedBucketSize.includes('daily') || normalizedBucketSize.includes('diario')) return 'date';
  if (normalizedBucketSize.includes('week') || normalizedBucketSize.includes('weekly') || normalizedBucketSize.includes('semanal')) return 'date';

  return null;
}

function inferDimensionFieldKind(field: string): DimensionFieldKind {
  if (!resolveTemporalBucketDisplay()) return 'string';

  const values = props.data
    .map((row) => row[field])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

  if (!values.length) return 'string';

  const parsedValues = values.map(parseDateDimensionValue);
  if (parsedValues.some((value) => value === null)) return 'string';

  return parsedValues.every((value) => value?.display === 'month-year') ? 'month-year' : 'date';
}

const dimensionFieldKinds = computed<Record<string, DimensionFieldKind>>(() =>
  Object.fromEntries(
    Array.from(dimensionFieldNames.value).map((field) => [field, inferDimensionFieldKind(field)]),
  ),
);

const normalizedData = computed(() =>
  props.data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([field, value]) => {
        if (measureFieldNames.value.has(field)) {
          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
          return [field, Number.isFinite(numericValue) ? numericValue : 0];
        }

        if (dimensionFieldKinds.value[field] === 'date' || dimensionFieldKinds.value[field] === 'month-year') {
          return [field, parseDateDimensionValue(value)?.date ?? null];
        }

        return [field, value === null || value === undefined ? '' : String(value)];
      }),
    ),
  ),
);

const lockedAggregates = computed<Record<string, PerspectiveAggregate>>(() =>
  Object.fromEntries(
    activeMeasures.value.map((measure) => [
      measure.field,
      measure.allowedAggregations?.some((aggregation) => aggregateEquals(aggregation, measure.aggregation ?? 'sum'))
        ? (measure.aggregation ?? 'sum')
        : (measure.allowedAggregations?.[0] ?? measure.aggregation ?? 'sum'),
    ]),
  ),
);

const shouldHideSingleMeasureHeader = computed(() =>
  props.hideSingleMeasureHeader && activeMeasures.value.length === 1 && props.columns.length > 0,
);

const hostHeightStyle = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height));
const totalizationFieldNames = computed(() => new Set(props.totalizationFieldOptions.map((value) => String(value).trim()).filter(Boolean)));
const knownFieldOptionNames = computed(() => {
  const firstRow = normalizedData.value[0] ?? {};
  return new Set(Object.keys(firstRow).map((value) => String(value).trim()).filter(Boolean));
});

function ensureRuntime() {
  if (runtimeReady) return;
  init_client(fetch(clientWasmUrl));
  init_server(fetch(serverWasmUrl));
  runtimeReady = true;
}

async function getWorker() {
  ensureRuntime();
  workerPromise ??= perspective.worker();
  return await workerPromise;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? ''));
}

function normalizeAggregate(value: unknown): PerspectiveAggregate {

  if (Array.isArray(value) && typeof value[0] === 'string') {
    const argumentsList = Array.isArray(value[1]) ? value[1] : value.slice(1);
    return [value[0] as PerspectiveAggregateName, argumentsList.map((entry) => String(entry))];
  }

  return String(value ?? 'sum') as PerspectiveAggregateName;
}

function normalizeAggregates(value: unknown): Record<string, PerspectiveAggregate> {

  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, aggregation]) => [key, normalizeAggregate(aggregation)]),
  );
}

function normalizeConfigColumns(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0);
}

function isPerspectiveViewNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('View not found');
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function aggregateEquals(left: PerspectiveAggregate, right: PerspectiveAggregate) {

  if (typeof left === 'string' || typeof right === 'string') return left === right;
  return left[0] === right[0]
    && left[1].length === right[1].length
    && left[1].every((value, index) => value === right[1][index]);
}

function aggregateMapEqual(a: Record<string, PerspectiveAggregate>, b: Record<string, PerspectiveAggregate>) {

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!aggregateEquals(a[key] ?? 'sum', b[key] ?? 'sum')) return false;
  }
  return true;
}

function hasMeaningfulConfigChanged(nextConfig: { groupBy: string[]; splitBy: string[]; columns: string[] }) {
  if (!lastMeaningfulConfig) return true;

  return !(
    arraysEqual(lastMeaningfulConfig.groupBy, nextConfig.groupBy)
    && arraysEqual(lastMeaningfulConfig.splitBy, nextConfig.splitBy)
    && arraysEqual(lastMeaningfulConfig.columns, nextConfig.columns)
  );
}

function buildViewerConfig() {
  return {
    plugin: 'Datagrid',
    title: '',
    settings: isSettingsPanelOpen.value,
    group_by: [...props.rows],
    split_by: [...props.columns],
    columns: [...lockedColumns.value],
    aggregates: { ...lockedAggregates.value },
    columns_config: buildColumnsConfig(),
    group_rollup_mode: props.groupRollupMode,
  };
}

function buildTableSchema(rows: Record<string, unknown>[]) {
  const fields = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((field) => fields.add(field));
  });

  props.rows.forEach((field) => fields.add(field));
  props.columns.forEach((field) => fields.add(field));
  lockedColumns.value.forEach((field) => fields.add(field));

  return Object.fromEntries(
    Array.from(fields).map((field) => [
      field,
      measureFieldNames.value.has(field)
        ? 'float'
        : dimensionFieldKinds.value[field] === 'date' || dimensionFieldKinds.value[field] === 'month-year'
          ? 'date'
          : 'string',
    ]),
  ) as Record<string, PerspectiveSchemaType>;
}

function buildColumnsConfig() {
  const columnsConfig: Record<string, PerspectiveColumnConfig> = {};
  const bucketDisplay = resolveTemporalBucketDisplay();
  if (!bucketDisplay) return columnsConfig;

  Object.entries(dimensionFieldKinds.value).forEach(([field, kind]) => {
    if (kind === 'string') return;

    columnsConfig[field] = {
      date_format: buildDateFormat(bucketDisplay),
    };
  });

  return columnsConfig;
}

function resolveRenderedTemporalDisplay() {
  return resolveTemporalBucketDisplay();
}

function formatTemporalDisplayValue(value: unknown, display: TemporalBucketDisplay) {
  const parsed = parseDateDimensionValue(value);
  if (!parsed) return null;

  const date = parsed.date;
  const optionsByDisplay: Record<TemporalBucketDisplay, Intl.DateTimeFormatOptions> = {
    year: {
      year: 'numeric',
      timeZone: 'UTC',
    },
    'month-year': {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    },
    date: {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    },
    datetime: {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    },
  };

  return new Intl.DateTimeFormat('en-US', optionsByDisplay[display]).format(date);
}

function applyRenderedTemporalHeaderLabelsPolicy() {
  const display = resolveRenderedTemporalDisplay();
  if (!display) return false;

  const datagrid = findDatagridElement();
  const table = datagrid?.shadowRoot?.querySelector('table');
  if (!table) return false;

  const cells = Array.from(table.querySelectorAll('thead th, tbody th, td.rt-tree-container'));
  cells.forEach((cell) => {
    const currentText = cell.textContent?.trim() ?? '';
    if (!currentText) return;

    const formattedText = formatTemporalDisplayValue(currentText, display);
    if (!formattedText || formattedText === currentText) return;

    cell.textContent = formattedText;
    if (cell instanceof HTMLElement) {
      cell.dataset.ofxTemporalHeader = display;
      cell.style.minWidth = getTemporalHeaderMinimumWidth(display);
    }
  });

  return true;
}

function getTemporalHeaderMinimumWidth(display: TemporalBucketDisplay) {
  if (display === 'datetime') return '112px';
  if (display === 'date') return '76px';
  if (display === 'month-year') return '56px';
  return '44px';
}

function buildDateFormat(display: TemporalBucketDisplay) {
  const baseFormat = {
    format: 'custom',
    weekday: 'disabled',
    hour: 'disabled',
    minute: 'disabled',
    second: 'disabled',
    timeZone: 'UTC',
  };

  if (display === 'year') {
    return {
      ...baseFormat,
      year: 'numeric',
      month: 'disabled',
      day: 'disabled',
    };
  }

  if (display === 'month-year') {
    return {
      ...baseFormat,
      year: '2-digit',
      month: 'short',
      day: 'disabled',
    };
  }

  if (display === 'datetime') {
    return {
      ...baseFormat,
      year: '2-digit',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
  }

  return {
    ...baseFormat,
    year: '2-digit',
    month: 'short',
    day: '2-digit',
  };
}

async function applyPolicyGuard() {
  if (!viewerRef.value || isApplyingPolicy.value || !hasLoadedTable) return;

  const viewer = viewerRef.value;
  try {
    const saved = await viewer.save();
    const patch: Record<string, unknown> = {};

    if (!props.allowRowSelection) {
      const savedRows = normalizeStringArray(saved.group_by);
      if (!arraysEqual(savedRows, props.rows)) {
        patch.group_by = [...props.rows];
      }
    }

    if (!props.allowMeasureSelection) {
      const savedColumns = normalizeStringArray(saved.columns);
      if (!arraysEqual(savedColumns, lockedColumns.value)) {
        patch.columns = [...lockedColumns.value];
      }
    }

    if (!props.allowSplitBySelection) {
      const savedSplitBy = normalizeStringArray(saved.split_by);
      if (!arraysEqual(savedSplitBy, props.columns)) {
        patch.split_by = [...props.columns];
      }
    }

    if (!props.allowAggregationSelection) {
      const savedAggregates = normalizeAggregates(saved.aggregates);
      const fixedAggregates = { ...lockedAggregates.value };
      if (!aggregateMapEqual(savedAggregates, fixedAggregates)) {
        patch.aggregates = { ...lockedAggregates.value };
      }
    }

    if (!props.allowGroupRollupModeSelection) {
      const savedRollupMode = String(saved.group_rollup_mode ?? 'rollup') as PerspectiveGroupRollupMode;
      if (savedRollupMode !== props.groupRollupMode) {
        patch.group_rollup_mode = props.groupRollupMode;
      }
    }

    if (!Object.keys(patch).length) return;

    isApplyingPolicy.value = true;
    try {
      await viewer.restore(patch);
      await applyGrandTotalsPolicyWithRetry();
      await applySingleMeasureHeaderPolicyWithRetry();
    } finally {
      isApplyingPolicy.value = false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (message.includes('View not found')) return;
    console.error('[OfxPivot] applyPolicyGuard failed', error);
  }
}

function queuePolicySync() {
  if (queuedPolicyFrame) return;

  queuedPolicyFrame = window.requestAnimationFrame(() => {
    queuedPolicyFrame = 0;
    applyViewerThemeStyle();
    applyViewerChromePolicy();
    applyRenderedTemporalHeaderLabelsPolicy();
    applyDatagridThemeStyle();
    void applySingleMeasureHeaderPolicyWithRetry();
  });
}

function startPolicyBurst(durationMs = 1500) {
  policyBurstUntil = performance.now() + durationMs;
  if (policyBurstFrame) return;

  const tick = () => {
    queuePolicySync();
    if (performance.now() < policyBurstUntil) {
      policyBurstFrame = window.requestAnimationFrame(tick);
      return;
    }
    policyBurstFrame = 0;
  };

  policyBurstFrame = window.requestAnimationFrame(tick);
}

async function refreshViewerLayout() {
  const viewer = viewerRef.value;
  if (!viewer || !hasLoadedTable) return;

  try {
    viewer.notifyResize?.();
    await viewer.flush?.();

    const datagrid = findDatagridElement();
    const regularTable = datagrid?.regular_table as PerspectiveRegularTableApi | undefined;

    const needsViewportRecovery = () => {
      if (!datagrid || !regularTable) return false;

      const table = datagrid.shadowRoot?.querySelector('table');
      const firstBodyRow = table?.querySelector('tbody tr');
      const virtualPanel = regularTable.shadowRoot?.querySelector('.rt-virtual-panel');
      const renderedTableHeight = table?.getBoundingClientRect().height ?? 0;
      const virtualPanelHeight = virtualPanel?.getBoundingClientRect().height ?? 0;
      const renderedRowHeight = firstBodyRow?.getBoundingClientRect().height ?? 0;
      const estimatedRowHeight =
        regularTable.table_model?.e?.row_height ?? regularTable.e?.row_height ?? 0;

      return (
        (virtualPanelHeight > 0 && renderedTableHeight > 0 && virtualPanelHeight + 1 < renderedTableHeight) ||
        (estimatedRowHeight > 0 && renderedRowHeight > 0 && estimatedRowHeight + 2 < renderedRowHeight)
      );
    };

    const recoverViewportSizing = async () => {
      if (!datagrid || !regularTable || !datagrid.update) return;

      if (regularTable.e) {
        regularTable.e.row_height = undefined;
      }
      if (regularTable.table_model?.e) {
        regularTable.table_model.e.row_height = undefined;
      }
      regularTable.resetAutoSize?.();

      const view = await viewer.getView();
      try {
        await datagrid.update(view);
      } finally {
        await view.delete?.();
      }

      await regularTable.flush?.();
      await viewer.flush?.();
    };

    try {
      await regularTable?.draw?.({ cache: true, invalid_viewport: true, throttle: false, preserve_width: true });
    } catch (error) {
      if (isPerspectiveViewNotFoundError(error)) return;
      // Perspective may still be mounting; the next burst tick will retry.
    }

    if (needsViewportRecovery()) {
      await recoverViewportSizing();
    }

    queuePolicySync();
  } catch (error) {
    if (isPerspectiveViewNotFoundError(error)) return;
    throw error;
  }
}

function queueLayoutRefresh() {
  if (queuedLayoutFrame) return;

  queuedLayoutFrame = window.requestAnimationFrame(() => {
    queuedLayoutFrame = 0;
    void refreshViewerLayout();
  });
}

function startLayoutBurst(durationMs = 1500) {
  layoutBurstUntil = performance.now() + durationMs;
  if (layoutBurstFrame) return;

  const tick = () => {
    queueLayoutRefresh();
    if (performance.now() < layoutBurstUntil) {
      layoutBurstFrame = window.requestAnimationFrame(tick);
      return;
    }
    layoutBurstFrame = 0;
  };

  layoutBurstFrame = window.requestAnimationFrame(tick);
}

async function rebuildViewer() {
  if (isRebuilding) {
    rebuildPending = true;
    return;
  }

  isRebuilding = true;
  try {
    while (true) {
      rebuildPending = false;
      isLoading.value = true;
      errorMessage.value = null;
      hasLoadedTable = false;

      try {
        const viewer = viewerRef.value;
        if (!viewer) {
          break;
        }

        try {
          const saved = await viewer.save();
          isSettingsPanelOpen.value = Boolean(saved.settings);
        } catch (error) {
          if (!isPerspectiveViewNotFoundError(error)) {
            throw error;
          }
        }

        const worker = await getWorker();
        const nextRows = normalizedData.value;
        const nextTable = await worker.table(buildTableSchema(nextRows));
        if (nextRows.length) {
          await nextTable.update(nextRows);
        }
        await viewer.load(nextTable);
        await viewer.restore(buildViewerConfig());
        await stabilizeViewerLayout();
        currentTable = nextTable;

        hasLoadedTable = true;
        startLayoutBurst(1800);
        applyViewerChromePolicy();
        applyRenderedTemporalHeaderLabelsPolicy();
        await applyGrandTotalsPolicyWithRetry();
        await applySingleMeasureHeaderPolicyWithRetry();
      } catch (error) {
        console.error('[OfxPivot] rebuildViewer failed', error);
        errorMessage.value = 'The pivot engine could not render this dataset.';
      } finally {
        isLoading.value = false;
      }

      if (!rebuildPending) {
        break;
      }
    }
  } finally {
    isRebuilding = false;
  }
}

async function stabilizeViewerLayout() {
  const viewer = viewerRef.value;
  if (!viewer) return;
  const getMainPanelWidth = () => {
    const panel = viewer.shadowRoot?.getElementById('main_panel_container');
    if (!panel) return 0;
    return panel.getBoundingClientRect().width;
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    try {
      viewer.notifyResize?.();
      await viewer.flush?.();
    } catch (error) {
      if (isPerspectiveViewNotFoundError(error)) return;
      throw error;
    }
    if (getMainPanelWidth() > 0) {
      return;
    }
    viewer.toggleConfig?.();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    viewer.toggleConfig?.();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  }
}

function setElementVisibility(root: ShadowRoot, id: string, visible: boolean) {
  const element = root.getElementById(id);
  if (!element) return;
  const nextDisplay = visible ? '' : 'none';
  if (element.style.display === nextDisplay) return;
  element.style.display = nextDisplay;
}

function applyViewerChromePolicy() {
  const viewer = viewerRef.value;
  const root = viewer?.shadowRoot;
  if (!viewer || !root) return;

  // Keep the status bar host visible so Perspective's settings toggle remains available.
  const showStatusBar = true;
  setElementVisibility(root, 'reset', props.showResetControl);
  setElementVisibility(root, 'plugin_selector_container', props.showPluginSelector);
  setElementVisibility(root, 'debug_open_button', props.showPluginSettingsControl);
  setElementVisibility(root, 'plugin-settings', props.showPluginSettingsControl);
  setElementVisibility(root, 'status_bar', showStatusBar);
  setElementVisibility(root, 'status', props.showStatusMetrics);
  setElementVisibility(root, 'title', props.showTitleField);
  setElementVisibility(root, 'name', props.showTitleField);
  setElementVisibility(root, 'settings_button', true);
  setElementVisibility(root, 'close_button', true);
  setElementVisibility(root, 'settings_close_button', true);
  setElementVisibility(root, 'main_column_container', true);
  setElementVisibility(root, 'sub-columns', props.showAllColumnsSection);
  setElementVisibility(root, 'add-expression', props.showExpressionsSection);

  if (!props.allowSplitBySelection) {
    setElementVisibility(root, 'split_by', false);
    setElementVisibility(root, 'transpose_button', false);
  }

  const statusBar = root.getElementById('status_bar');
  if (statusBar && !props.showStatusMetrics && !props.showTitleField) {
    const children = Array.from(statusBar.children);
    children.forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      const keepVisible =
        child.id === 'settings_button' ||
        child.id === 'close_button' ||
        child.id === 'settings_close_button';
      if (keepVisible) {
        if (child.style.display !== '') {
          child.style.display = '';
        }
        return;
      }

      if (child.style.display !== 'none') {
        child.style.display = 'none';
      }
    });
  }
}

function promptEmptyColumnSelector(target: EventTarget | null) {
  if (!hasLoadedTable || isLoading.value || isRebuilding) return;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.classList.contains('column-empty-input')) return;
  if (!target.isConnected || target.value.trim() !== '') return;

  const now = performance.now();
  if (lastEmptyColumnPromptTarget === target && now - lastEmptyColumnPromptAt < 180) return;
  lastEmptyColumnPromptTarget = target;
  lastEmptyColumnPromptAt = now;

  window.setTimeout(() => {
    if (!hasLoadedTable || isLoading.value || isRebuilding) return;
    if (!target.isConnected) return;
    target.focus();
    if (target.value.trim() !== '') return;
    try {
      target.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } catch {
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    queueFieldOptionFilter(resolveFieldOptionScope(target));
  }, 0);
}

function resolveFieldOptionScope(target: EventTarget | null): FieldOptionScope | null {
  if (!(target instanceof HTMLElement)) return null;

  if (target.closest('#group_by')) return 'group_by';
  if (target.closest('#split_by')) return 'split_by';
  if (target.closest('#sort')) return 'sort';
  if (target.closest('#filter')) return 'filter';
  if (target.closest('#active-columns') || target.closest('#selected-columns')) return 'columns';

  return null;
}

function getPopupFieldVisibility(text: string, scope: FieldOptionScope | null) {
  if (!totalizationFieldNames.value.size) {
    return true;
  }

  if (scope === 'columns') {
    return totalizationFieldNames.value.has(text);
  }

  return !totalizationFieldNames.value.has(text);
}

function findFloatingFieldOptionContainers() {
  if (!knownFieldOptionNames.value.size) return [];

  return Array.from(document.body.children).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const childTexts = Array.from(element.children)
      .map((child) => child.textContent?.trim() ?? '')
      .filter(Boolean);

    if (!childTexts.length) return false;
    return childTexts.every((text) => knownFieldOptionNames.value.has(text));
  });
}

function filterFloatingFieldOptions(scope: FieldOptionScope | null = lastFieldOptionScope) {
  if (!scope) return;
  if (!totalizationFieldNames.value.size) return;

  const containers = findFloatingFieldOptionContainers();
  containers.forEach((container) => {
    Array.from(container.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      const text = child.textContent?.trim() ?? '';
      if (!text) return;

      if (getPopupFieldVisibility(text, scope)) {
        if (child.dataset.ofxFieldOptionHidden === 'true') {
          child.style.display = '';
          delete child.dataset.ofxFieldOptionHidden;
        }
        return;
      }

      child.style.display = 'none';
      child.dataset.ofxFieldOptionHidden = 'true';
    });
  });
}

function queueFieldOptionFilter(scope: FieldOptionScope | null = lastFieldOptionScope) {
  if (!scope) return;
  lastFieldOptionScope = scope;
  window.setTimeout(() => filterFloatingFieldOptions(scope), 0);
  window.setTimeout(() => filterFloatingFieldOptions(scope), 60);
  window.setTimeout(() => filterFloatingFieldOptions(scope), 160);
}

function findDatagridElement() {
  const viewer = viewerRef.value;
  if (!viewer) return null;

  const directDatagrid = viewer.querySelector('perspective-viewer-datagrid') as PerspectiveDatagridElement | null;
  if (directDatagrid) return directDatagrid;

  const shadowDatagrid = viewer.shadowRoot?.querySelector('perspective-viewer-datagrid') as PerspectiveDatagridElement | null;
  if (shadowDatagrid) return shadowDatagrid;

  const slot = viewer.shadowRoot?.querySelector('slot');
  const assignedDatagrid = slot
    ?.assignedElements({ flatten: true })
    ?.find((element) => String((element as HTMLElement).tagName ?? '').toLowerCase().includes('datagrid')) as PerspectiveDatagridElement | undefined;

  return assignedDatagrid ?? null;
}

function ensureDatagridHeaderPolicyStyle(shadowRoot: ShadowRoot) {
  const existingStyle = shadowRoot.getElementById('ofx-single-measure-header-style');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'ofx-single-measure-header-style';
  style.textContent = `
    :host(.ofx-hide-single-measure-header) regular-table table thead tr:last-child th {
      height: 0 !important;
      min-height: 0 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      border-top-width: 0 !important;
      border-bottom-width: 0 !important;
    }

    :host(.ofx-hide-single-measure-header) regular-table table thead tr:last-child th span {
      display: none !important;
    }

    :host(.ofx-hide-single-measure-header) regular-table table thead tr:last-child:after {
      display: none !important;
    }

    :host(.ofx-hide-single-measure-header) regular-table table thead tr:nth-last-child(2) th {
      border-bottom-width: 1px !important;
      border-bottom-color: var(--inactive--border-color, #8b868045) !important;
    }
  `;

  shadowRoot.appendChild(style);
}

function ensureDatagridThemeStyle(shadowRoot: ShadowRoot) {
  const existingStyle = shadowRoot.getElementById('ofx-datagrid-theme-style');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'ofx-datagrid-theme-style';
  style.textContent = `
    regular-table,
    regular-table table {
      background: var(--plugin--background, transparent) !important;
      color: var(--value--color, currentColor) !important;
    }

    regular-table table thead th,
    regular-table table tbody th,
    regular-table table tbody td {
      border-color: var(--inactive--border-color, currentColor) !important;
    }

    regular-table table thead th {
      color: var(--name--color, currentColor) !important;
      background: color-mix(in srgb, var(--plugin--background, transparent) 86%, var(--inactive--border-color, currentColor)) !important;
    }

    regular-table table tbody th {
      color: var(--name--color, currentColor) !important;
      background: var(--plugin--background, transparent) !important;
    }

    regular-table table tbody td {
      color: var(--value--color, currentColor) !important;
      background: var(--plugin--background, transparent) !important;
    }

    regular-table table tbody th span,
    regular-table table tbody td span,
    regular-table table thead th span {
      color: inherit !important;
    }

    regular-table table tbody tr:hover th,
    regular-table table tbody tr:hover td {
      background: color-mix(in srgb, var(--active--color, currentColor) 7%, var(--plugin--background, transparent)) !important;
    }
  `;

  shadowRoot.appendChild(style);
}

function ensureViewerThemeStyle(shadowRoot: ShadowRoot) {
  const existingStyle = shadowRoot.getElementById('ofx-viewer-theme-style');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'ofx-viewer-theme-style';
  style.textContent = `
    :host {
      background: var(--plugin--background, transparent) !important;
      color: var(--name--color, currentColor) !important;
    }

    #side_panel,
    #side_panel *,
    #config_panel,
    #config_panel *,
    #main_column_container,
    #main_column_container *,
    [id*='side'],
    [id*='side'] *,
    [class*='side'],
    [class*='side'] * {
      color: var(--name--color, currentColor) !important;
      text-shadow: none !important;
    }

    #side_panel,
    #config_panel,
    #main_column_container {
      background: var(--plugin--background, transparent) !important;
      border-color: var(--inactive--border-color, currentColor) !important;
    }

    input,
    select,
    textarea,
    .column-empty-input {
      background: var(--plugin--background, #fff) !important;
      color: var(--name--color, currentColor) !important;
      border-color: var(--inactive--border-color, currentColor) !important;
      box-shadow: none !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: color-mix(in srgb, var(--name--color, currentColor) 52%, transparent) !important;
      opacity: 1 !important;
    }

    button,
    label,
    span,
    p,
    div {
      border-color: var(--inactive--border-color, currentColor);
    }

    button {
      color: var(--name--color, currentColor) !important;
    }

    .column_selector,
    .column_selector *,
    .column-container,
    .column-container *,
    .active_columns,
    .active_columns *,
    .inactive_columns,
    .inactive_columns * {
      color: var(--name--color, currentColor) !important;
    }
  `;

  shadowRoot.appendChild(style);
}

function applyDatagridThemeStyle() {
  const datagrid = findDatagridElement();
  const shadowRoot = datagrid?.shadowRoot;
  if (!shadowRoot) return false;

  ensureDatagridThemeStyle(shadowRoot);
  return true;
}

function applyViewerThemeStyle() {
  const shadowRoot = viewerRef.value?.shadowRoot;
  if (!shadowRoot) return false;

  ensureViewerThemeStyle(shadowRoot);
  return true;
}

function applySingleMeasureHeaderPolicy() {
  const datagrid = findDatagridElement();
  const shadowRoot = datagrid?.shadowRoot;
  if (!datagrid || !shadowRoot) return false;

  ensureDatagridThemeStyle(shadowRoot);
  ensureDatagridHeaderPolicyStyle(shadowRoot);
  datagrid.classList.toggle('ofx-hide-single-measure-header', shouldHideSingleMeasureHeader.value);
  return true;
}

async function applySingleMeasureHeaderPolicyWithRetry() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const done = applySingleMeasureHeaderPolicy();
    if (done) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

function cleanupGrandTotalDomObserver() {
  datagridContentObserver?.disconnect();
  datagridContentObserver = null;

  if (datagridScrollElement && datagridScrollHandler) {
    datagridScrollElement.removeEventListener('scroll', datagridScrollHandler);
  }
  datagridScrollElement = null;
  datagridScrollHandler = null;

  if (queuedGrandTotalsFrame) {
    window.cancelAnimationFrame(queuedGrandTotalsFrame);
    queuedGrandTotalsFrame = 0;
  }
}

function enforceRenderedGrandTotalPolicy() {
  const datagrid = findDatagridElement();
  const table = datagrid?.shadowRoot?.querySelector('table');
  if (!table) return false;

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  rows.forEach((row) => {
    const headerCells = Array.from(row.querySelectorAll('th, td.rt-tree-container'));
    const rowLabel =
      headerCells
        .map((cell) => cell.textContent?.trim() ?? '')
        .find((value) => Boolean(value)) ?? '';
    const isTotalRow = rowLabel.toUpperCase() === 'TOTAL';
    (row as HTMLElement).style.display = props.hideGrandTotals && isTotalRow ? 'none' : '';
  });

  return true;
}

function queueGrandTotalPolicyEnforcement() {
  if (queuedGrandTotalsFrame) return;

  queuedGrandTotalsFrame = window.requestAnimationFrame(() => {
    queuedGrandTotalsFrame = 0;
    enforceRenderedGrandTotalPolicy();
  });
}

function attachGrandTotalDomObserver() {
  if (!props.hideGrandTotals) {
    cleanupGrandTotalDomObserver();
    return false;
  }

  const datagrid = findDatagridElement();
  const shadowRoot = datagrid?.shadowRoot;
  if (!shadowRoot) return false;

  cleanupGrandTotalDomObserver();
  enforceRenderedGrandTotalPolicy();

  datagridContentObserver = new MutationObserver(() => {
    queueGrandTotalPolicyEnforcement();
    queuePolicySync();
  });
  datagridContentObserver.observe(shadowRoot, {
    subtree: true,
    childList: true,
  });

  const regularTableElement = shadowRoot.querySelector('regular-table');
  if (regularTableElement instanceof HTMLElement) {
    datagridScrollElement = regularTableElement;
    datagridScrollHandler = () => {
      queueGrandTotalPolicyEnforcement();
      queuePolicySync();
    };
    datagridScrollElement.addEventListener('scroll', datagridScrollHandler);
  }

  return true;
}

async function applyGrandTotalsPolicy() {
  if (!props.hideGrandTotals) {
    cleanupGrandTotalDomObserver();
    enforceRenderedGrandTotalPolicy();
    return true;
  }

  const attached = attachGrandTotalDomObserver();
  if (!attached) return false;

  const datagrid = findDatagridElement();
  const regularTable = datagrid?.regular_table as PerspectiveRegularTableApi | undefined;
  try {
    await regularTable?.draw?.({ cache: true, invalid_viewport: true });
  } catch (error) {
    return false;
  }
  return enforceRenderedGrandTotalPolicy();
}

async function applyGrandTotalsPolicyWithRetry() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let done = false;
    try {
      done = await applyGrandTotalsPolicy();
    } catch (error) {
      if (isPerspectiveViewNotFoundError(error)) return;
      throw error;
    }
    if (done) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

async function copyView() {
  if (!viewerRef.value) return;
  await viewerRef.value.copy();
  copyFeedback.value = 'done';
  window.setTimeout(() => {
    copyFeedback.value = 'idle';
  }, 1800);
}

async function downloadView(format: 'csv' | 'xlsx') {
  if (!viewerRef.value) return;
  await viewerRef.value.download(format);
}

watch(
  () => [props.data, props.rows, props.columns, props.measures],
  async () => {
    await rebuildViewer();
  },
  { deep: true },
);

watch(
  () => [
    props.allowRowSelection,
    props.allowMeasureSelection,
    props.allowAggregationSelection,
    props.allowSplitBySelection,
    props.groupRollupMode,
    props.allowGroupRollupModeSelection,
  ],
  async () => {
    await applyPolicyGuard();
    startPolicyBurst(1200);
  },
);

watch(
  () => [
    props.showDatagridToolbar,
    props.showResetControl,
    props.showPluginSelector,
    props.showPluginSettingsControl,
    props.showAllColumnsSection,
    props.showExpressionsSection,
    props.showStatusMetrics,
    props.showTitleField,
    props.allowSplitBySelection,
    props.allowMeasureSelection,
    props.groupRollupMode,
    props.allowGroupRollupModeSelection,
    props.hideGrandTotals,
    props.hideSingleMeasureHeader,
  ],
  async () => {
    startPolicyBurst(1200);
  },
);

onMounted(async () => {
  await nextTick();
  isSettingsPanelOpen.value = props.openSettingsByDefault;

  eventAbortController = new AbortController();
  viewerRef.value?.addEventListener('perspective-config-update', async () => {
    if (!viewerRef.value || isApplyingPolicy.value || isRebuilding || !hasLoadedTable) {
      return;
    }

    const saved = await viewerRef.value?.save();
    const nextConfig = {
      groupBy: normalizeStringArray(saved?.group_by),
      splitBy: normalizeStringArray(saved?.split_by),
      columns: normalizeConfigColumns(saved?.columns),
    };

    if (hasMeaningfulConfigChanged(nextConfig)) {
      lastMeaningfulConfig = nextConfig;
      emit('config-update', nextConfig);
      queueLayoutRefresh();
      queuePolicySync();
      await applyGrandTotalsPolicyWithRetry();
      await applySingleMeasureHeaderPolicyWithRetry();
    }
  }, { signal: eventAbortController.signal });
  viewerRef.value?.addEventListener('perspective-toggle-settings', async () => {
    isSettingsPanelOpen.value = !isSettingsPanelOpen.value;
    startLayoutBurst(1800);
    startPolicyBurst(1800);
    await applyGrandTotalsPolicyWithRetry();
    await applySingleMeasureHeaderPolicyWithRetry();
  }, { signal: eventAbortController.signal });

  if (hostRef.value) {
    hostResizeObserver?.disconnect();
    hostResizeObserver = new ResizeObserver(() => {
      startLayoutBurst(1200);
    });
    hostResizeObserver.observe(hostRef.value);

    hostIntersectionObserver?.disconnect();
    hostIntersectionObserver = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);

        if (isIntersecting && !wasHostIntersecting) {
          queueLayoutRefresh();
          startPolicyBurst(600);
        }

        wasHostIntersecting = isIntersecting;
      },
      {
        threshold: 0.01,
      },
    );
    hostIntersectionObserver.observe(hostRef.value);
  }

  const viewerRoot = viewerRef.value?.shadowRoot;
  if (viewerRoot) {
    viewerShadowObserver?.disconnect();
    viewerShadowObserver = new MutationObserver(() => {
      queuePolicySync();
    });
    viewerShadowObserver.observe(viewerRoot, {
      childList: true,
      subtree: true,
    });

      viewerSlotElement = viewerRoot.querySelector('slot');
      viewerSlotChangeHandler = () => {
        startLayoutBurst(1800);
        startPolicyBurst(1800);
        void applySingleMeasureHeaderPolicyWithRetry();
      };
    viewerSlotElement?.addEventListener('slotchange', viewerSlotChangeHandler);

    emptyColumnAssistHandler = (event: Event) => {
      promptEmptyColumnSelector(event.target);
    };
    viewerRoot.addEventListener('focusin', emptyColumnAssistHandler, true);
    viewerRoot.addEventListener('click', emptyColumnAssistHandler, true);
  }

  datagridMountObserver?.disconnect();
  datagridMountObserver = null;
  if (viewerRef.value) {
    datagridMountObserver = new MutationObserver(() => {
      queueLayoutRefresh();
      startPolicyBurst(1200);
      void applySingleMeasureHeaderPolicyWithRetry();
    });
    datagridMountObserver.observe(viewerRef.value, {
      childList: true,
    });
  }

  await rebuildViewer();
  startLayoutBurst(1800);
  startPolicyBurst(1800);
});

onBeforeUnmount(async () => {
  eventAbortController?.abort();
  eventAbortController = null;
  hostResizeObserver?.disconnect();
  hostResizeObserver = null;
  hostIntersectionObserver?.disconnect();
  hostIntersectionObserver = null;
  datagridMountObserver?.disconnect();
  datagridMountObserver = null;
  viewerShadowObserver?.disconnect();
  viewerShadowObserver = null;
  if (viewerSlotElement && viewerSlotChangeHandler) {
    viewerSlotElement.removeEventListener('slotchange', viewerSlotChangeHandler);
  }
  const viewerRoot = viewerRef.value?.shadowRoot;
  if (viewerRoot && emptyColumnAssistHandler) {
    viewerRoot.removeEventListener('focusin', emptyColumnAssistHandler, true);
    viewerRoot.removeEventListener('click', emptyColumnAssistHandler, true);
  }
  viewerSlotElement = null;
  viewerSlotChangeHandler = null;
  emptyColumnAssistHandler = null;
  lastEmptyColumnPromptTarget = null;
  lastEmptyColumnPromptAt = 0;
  if (queuedPolicyFrame) {
    window.cancelAnimationFrame(queuedPolicyFrame);
    queuedPolicyFrame = 0;
  }
  if (policyBurstFrame) {
    window.cancelAnimationFrame(policyBurstFrame);
    policyBurstFrame = 0;
  }
  if (queuedLayoutFrame) {
    window.cancelAnimationFrame(queuedLayoutFrame);
    queuedLayoutFrame = 0;
  }
  if (layoutBurstFrame) {
    window.cancelAnimationFrame(layoutBurstFrame);
    layoutBurstFrame = 0;
  }
  cleanupGrandTotalDomObserver();

  currentTable = null;
  lastMeaningfulConfig = null;
});
</script>

<template>
  <div class="ofx-perspective-native">
    <div v-if="props.showActions" class="ofx-perspective-actions">
      <button v-if="props.showCopyAction" type="button" class="ofx-perspective-action-button" @click="copyView">
        {{ copyFeedback === 'done' ? 'Copied' : 'Copy' }}
      </button>
      <button v-if="props.showExportActions" type="button" class="ofx-perspective-action-button" @click="downloadView('xlsx')">Export XLSX</button>
      <button v-if="props.showExportActions" type="button" class="ofx-perspective-action-button" @click="downloadView('csv')">Export CSV</button>
    </div>

    <div
      ref="hostRef"
      class="ofx-perspective-host"
      :style="{ height: hostHeightStyle }"
    >
      <perspective-viewer ref="viewerRef" class="ofx-perspective-viewer" />

      <div v-if="isLoading" class="ofx-perspective-overlay">Building pivot view...</div>
      <div v-else-if="errorMessage" class="ofx-perspective-overlay">{{ errorMessage }}</div>
    </div>
  </div>
</template>
