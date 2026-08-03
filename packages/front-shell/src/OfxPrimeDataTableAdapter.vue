<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { OFX_TABLE_COMPACT_TEXT_SIZE } from './data-table.defaults.js';
import { formatDisplayValue } from './data-table.formatters.js';
import type { OfxTableColumn } from './data-table.types.js';

const props = withDefaults(
  defineProps<{
    rows: Record<string, unknown>[];
    columns: OfxTableColumn[];
    rowKey?: string;
    dense?: boolean;
    striped?: boolean;
    textSize?: 'sm' | 'xs';
  }>(),
  { rowKey: 'id', dense: true, striped: true, textSize: OFX_TABLE_COMPACT_TEXT_SIZE },
);

/**
 * The document attribute is the product-level theme contract. Observing it
 * keeps Enterprise user preferences live without coupling this neutral table
 * to either edition's Pinia store.
 */
const themeMode = ref<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
let themeObserver: MutationObserver | undefined;

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    themeMode.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

onBeforeUnmount(() => themeObserver?.disconnect());

const tableClasses = computed(() => ({
  table: 'min-w-full',
  thead: 'bg-[color:var(--ofx-bg-subtle)]',
  headerRow: 'border-b border-[color:var(--ofx-border)]',
  bodyRow: [
    themeMode.value === 'light'
      ? 'border-b border-[color:var(--ofx-border)] last:border-b-0 hover:bg-[color:var(--ofx-surface-elevated)]'
      : 'border-b border-[color:var(--ofx-border)] last:border-b-0 hover:bg-[rgb(19_30_49_/_0.96)]',
    props.striped
      ? themeMode.value === 'light'
        ? 'odd:bg-[color:var(--ofx-surface)] even:bg-[color:var(--ofx-surface-elevated)]'
        : 'odd:bg-[rgb(11_18_31_/_0.96)] even:bg-[rgb(16_24_39_/_0.92)]'
      : 'bg-transparent',
  ].join(' '),
  columnHeaderContent: 'flex items-center gap-2',
}));

function headerClass(column: OfxTableColumn) {
  const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
  const sizeClass = props.textSize === 'xs' ? 'text-[0.66rem] tracking-[0.11em]' : 'text-[0.72rem] tracking-[0.14em]';
  return ['px-4 font-medium text-[color:var(--ofx-text-subtle)] uppercase', sizeClass, align, props.dense ? 'py-1.5' : 'py-2.5'].join(' ');
}

function bodyClass(column: OfxTableColumn) {
  const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
  const sizeClass = props.textSize === 'xs' ? 'text-[0.82rem] leading-[1rem]' : 'text-[0.9rem] leading-[1.15rem]';
  return ['px-4 text-[color:var(--ofx-text)]', sizeClass, align, props.dense ? 'py-1.5' : 'py-2.5'].join(' ');
}
</script>

<template>
  <DataTable :value="props.rows" :data-key="props.rowKey" :pt="tableClasses" unstyled>
    <Column v-for="column in props.columns" :key="column.field" :field="column.field" :header="column.header" :style="column.width ? { width: column.width } : undefined" :pt="{ headerCell: { class: headerClass(column) }, bodyCell: { class: bodyClass(column) } }">
      <template #body="slotProps">
        <slot :name="`cell-${column.field}`" :row="slotProps.data" :value="slotProps.data[column.field]" :column="column">
          {{ formatDisplayValue(column.dataType, slotProps.data[column.field], column.emptyValueLabel) }}
        </slot>
      </template>
    </Column>
    <template #empty><slot name="empty"><div class="px-4 py-8 text-center text-sm text-[color:var(--ofx-text-muted)]">No rows available.</div></slot></template>
  </DataTable>
</template>
