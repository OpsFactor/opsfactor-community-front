<script setup lang="ts">
import { computed, ref, useSlots } from 'vue';
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
  'selection-change': [rows: Record<string, unknown>[]];
  'row-click': [row: Record<string, unknown>];
  'cell-click': [payload: { row: Record<string, unknown>; field: string; value: unknown }];
  'boolean-toggle-all': [payload: { field: string; value: boolean; rows: Record<string, unknown>[] }];
}>();

const agGridRef = ref<InstanceType<typeof OfxAgGridTableAdapter> | null>(null);
const slots = useSlots();
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
    <template v-if="props.rows.length === 0"><slot name="empty"><div class="px-4 py-8 text-center text-sm text-[color:var(--ofx-text-muted)]">No rows available.</div></slot></template>
    <OfxAgGridTableAdapter
      v-else-if="props.engine === 'ag-grid'" ref="agGridRef" :rows="props.rows" :columns="props.columns" :row-key="props.rowKey"
      :dense="props.dense" :striped="props.striped" :height="props.height" :pagination="props.pagination" :page-size="props.pageSize"
      :page-size-options="props.pageSizeOptions" :auto-page-size="props.autoPageSize" :min-visible-rows="props.minVisibleRows"
      :export-base-name="props.exportBaseName" :text-size="props.textSize" :selection-mode="props.selectionMode"
      :selection-checkboxes="props.selectionCheckboxes" :highlight-selected-row="props.highlightSelectedRow" :auto-size-columns="props.autoSizeColumns"
      :row-class-rules="props.rowClassRules" @selection-change="emit('selection-change', $event)" @row-click="emit('row-click', $event)"
      @cell-click="emit('cell-click', $event)" @boolean-toggle-all="emit('boolean-toggle-all', $event)"
    >
      <template v-for="column in slotColumns" :key="column.field" #[`cell-${column.field}`]="slotProps"><slot :name="`cell-${column.field}`" v-bind="slotProps">{{ slotProps.value }}</slot></template>
    </OfxAgGridTableAdapter>
    <OfxPrimeDataTableAdapter v-else :rows="props.rows" :columns="props.columns" :row-key="props.rowKey" :dense="props.dense" :striped="props.striped" :text-size="props.textSize">
      <template v-for="column in slotColumns" :key="column.field" #[`cell-${column.field}`]="slotProps"><slot :name="`cell-${column.field}`" v-bind="slotProps">{{ slotProps.value }}</slot></template>
    </OfxPrimeDataTableAdapter>
  </div>
</template>

<style scoped>
.ofx-data-table-shell { border-color: rgb(51 63 86 / 0.82); background: linear-gradient(180deg, rgb(11 16 25 / 0.98), rgb(7 11 18 / 0.98)); }
:global(:root[data-theme='light']) .ofx-data-table-shell { border-color: var(--ofx-border); background: var(--ofx-surface); box-shadow: var(--ofx-shadow-sm); }
</style>
