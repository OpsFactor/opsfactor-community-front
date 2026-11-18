<script setup lang="ts">
import { computed, ref, useSlots, watch } from 'vue';
import OfxTextField from './OfxTextField.vue';
import OfxButton from './OfxButton.vue';
import type { RowClassRules } from 'ag-grid-community';
import OfxAgGridTableAdapter from './OfxAgGridTableAdapter.vue';
import OfxPrimeDataTableAdapter from './OfxPrimeDataTableAdapter.vue';
import { OFX_TABLE_COMPACT_TEXT_SIZE } from './data-table.defaults.js';
import type { OfxExportFormat } from './data-table.export.js';
import type { OfxTableColumn } from './data-table.types.js';

const props = withDefaults(
  defineProps<{
    rows: Record<string, unknown>[];
    columns: OfxTableColumn[];
    rowKey?: string;
    dense?: boolean;
    striped?: boolean;
    engine?: 'ag-grid' | 'prime';
    height?: number | string;
    pagination?: boolean;
    /** Keys identify text filters backed by the full report; values reflect the last successful query. */
    remoteFilters?: Record<string, string>;
    remoteFiltersBusy?: boolean;
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
    rowKey: 'id', dense: true, striped: true, engine: 'ag-grid', height: undefined,
    pagination: false, pageSize: 8, pageSizeOptions: false, autoPageSize: true,
    minVisibleRows: 4, exportBaseName: 'opsfactor-data', textSize: OFX_TABLE_COMPACT_TEXT_SIZE,
    selectionMode: false, selectionCheckboxes: false, highlightSelectedRow: false,
    autoSizeColumns: true, rowClassRules: undefined,
  },
);

const emit = defineEmits<{
  /** The data owner must re-query from the first server page when applying these filters. */
  'apply-remote-filters': [filters: Record<string, string>];
  'selection-change': [rows: Record<string, unknown>[]];
  'row-click': [row: Record<string, unknown>];
  'cell-click': [payload: { row: Record<string, unknown>; field: string; value: unknown }];
  'boolean-toggle-all': [payload: { field: string; value: boolean; rows: Record<string, unknown>[] }];
}>();

const agGridRef = ref<InstanceType<typeof OfxAgGridTableAdapter> | null>(null);
const slots = useSlots();
const remoteFilterDraft = ref<Record<string, string>>({});
const remoteFilterColumns = computed(() => props.columns.filter(
  (column) => Object.prototype.hasOwnProperty.call(props.remoteFilters ?? {}, column.field),
));
// Keep the column menu from reapplying a whole-report filter to just the current page.
const tableColumns = computed(() => remoteFilterColumns.value.length
  ? props.columns.map((column) => Object.prototype.hasOwnProperty.call(props.remoteFilters ?? {}, column.field)
    ? { ...column, filterable: false, agGridColDef: { ...column.agGridColDef, filter: false, suppressHeaderFilterButton: true } }
    : column)
  : props.columns);
const remoteFilterKey = computed(() => JSON.stringify(props.remoteFilters ?? {}));

watch(() => props.remoteFilters, (filters) => {
  remoteFilterDraft.value = { ...filters };
}, { immediate: true });

function applyRemoteFilters() {
  if (props.remoteFiltersBusy) return;
  const filters = Object.fromEntries(remoteFilterColumns.value.map(({ field }) => [
    field, (remoteFilterDraft.value[field] ?? '').trim(),
  ]));
  emit('apply-remote-filters', filters);
}
const slotColumns = computed(() => props.columns.filter((column) => Boolean(slots[`cell-${column.field}`])));
function exportData(format: OfxExportFormat) { agGridRef.value?.exportData(format); }
function sizeColumnsToFit() { agGridRef.value?.sizeColumnsToFit(); }
function autoSizeColumns() { agGridRef.value?.autoSizeColumns(); }
function clearSelection() { agGridRef.value?.clearSelection(); }
function getSelectedRows() { return agGridRef.value?.getSelectedRows() ?? []; }
defineExpose({ exportData, sizeColumnsToFit, autoSizeColumns, clearSelection, getSelectedRows });
</script>

<template>
  <div class="ofx-data-table-shell overflow-hidden rounded-[12px] border shadow-[0_16px_34px_rgb(1_6_16_/_0.22)]" :class="props.height === '100%' ? 'flex min-h-0 flex-1 flex-col' : ''">
    <form
      v-if="remoteFilterColumns.length"
      class="border-b border-[color:var(--ofx-border)] px-4 py-3"
      @submit.prevent="applyRemoteFilters"
    >
      <div class="flex flex-wrap items-end gap-3">
        <OfxTextField
          v-for="column in remoteFilterColumns"
          :key="column.field"
          v-model="remoteFilterDraft[column.field]"
          :label="column.header"
          placeholder="Contains…"
          :disabled="props.remoteFiltersBusy"
        />
        <OfxButton type="submit" variant="secondary" :disabled="props.remoteFiltersBusy">
          Filter report
        </OfxButton>
      </div>
      <p class="mt-2 text-xs text-[color:var(--ofx-text-muted)]">
        Search the entire report here. Column filters apply only to the loaded rows.
      </p>
    </form>
    <template v-if="props.rows.length === 0"><slot name="empty"><div class="px-4 py-8 text-center text-sm text-[color:var(--ofx-text-muted)]">No rows available.</div></slot></template>
    <OfxAgGridTableAdapter
      :key="remoteFilterKey"
      v-else-if="props.engine === 'ag-grid'" ref="agGridRef" :rows="props.rows" :columns="tableColumns" :row-key="props.rowKey"
      :dense="props.dense" :striped="props.striped" :height="props.height" :pagination="props.pagination" :page-size="props.pageSize"
      :page-size-options="props.pageSizeOptions" :auto-page-size="props.autoPageSize" :min-visible-rows="props.minVisibleRows"
      :export-base-name="props.exportBaseName" :text-size="props.textSize" :selection-mode="props.selectionMode"
      :selection-checkboxes="props.selectionCheckboxes" :highlight-selected-row="props.highlightSelectedRow" :auto-size-columns="props.autoSizeColumns"
      :row-class-rules="props.rowClassRules" @selection-change="emit('selection-change', $event)" @row-click="emit('row-click', $event)"
      @cell-click="emit('cell-click', $event)" @boolean-toggle-all="emit('boolean-toggle-all', $event)"
    >
      <template v-for="column in slotColumns" :key="column.field" #[`cell-${column.field}`]="slotProps"><slot :name="`cell-${column.field}`" v-bind="slotProps">{{ slotProps.value }}</slot></template>
    </OfxAgGridTableAdapter>
    <OfxPrimeDataTableAdapter v-else :key="remoteFilterKey" :rows="props.rows" :columns="tableColumns" :row-key="props.rowKey" :dense="props.dense" :striped="props.striped" :text-size="props.textSize">
      <template v-for="column in slotColumns" :key="column.field" #[`cell-${column.field}`]="slotProps"><slot :name="`cell-${column.field}`" v-bind="slotProps">{{ slotProps.value }}</slot></template>
    </OfxPrimeDataTableAdapter>
  </div>
</template>

<style scoped>
.ofx-data-table-shell { border-color: rgb(51 63 86 / 0.82); background: linear-gradient(180deg, rgb(11 16 25 / 0.98), rgb(7 11 18 / 0.98)); }
:global(:root[data-theme='light']) .ofx-data-table-shell { border-color: var(--ofx-border); background: var(--ofx-surface); box-shadow: var(--ofx-shadow-sm); }
</style>
