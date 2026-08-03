<script setup lang="ts" generic="TRow extends PlanningBookVirtualGridRow">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { PlanningBookVirtualGridColumn, PlanningBookVirtualGridRow } from '../planning-book.virtual-grid';

const ROW_HEIGHT = 42;
const OVERSCAN_ROWS = 8;
const props = withDefaults(defineProps<{ rows: readonly TRow[]; columns: readonly PlanningBookVirtualGridColumn<TRow>[]; emptyMessage?: string; busy?: boolean }>(), { emptyMessage: 'No Planning Book rows are available.', busy: false });
defineSlots<{ cell?(properties: { row: TRow; column: PlanningBookVirtualGridColumn<TRow>; value: unknown }): unknown; empty?(): unknown; }>();
const viewportElement = ref<HTMLElement | null>(null);
const viewportHeight = ref(520);
const scrollTop = ref(0);
const filterText = ref('');
const expandedByRowKey = reactive<Record<string, boolean>>({});
let resizeObserver: ResizeObserver | undefined;
watch(() => props.rows, (rows) => {
  const availableRowKeys = new Set(rows.map((row) => row.rowKey));
  Object.keys(expandedByRowKey).forEach((rowKey) => { if (!availableRowKeys.has(rowKey)) delete expandedByRowKey[rowKey]; });
  rows.forEach((row) => { if (row.hierarchyExpandable && expandedByRowKey[row.rowKey] === undefined) expandedByRowKey[row.rowKey] = true; });
}, { immediate: true });
const parentByRowKey = computed(() => new Map(props.rows.filter((row) => row.hierarchyParentRowKey !== undefined).map((row) => [row.rowKey, row.hierarchyParentRowKey!])));
function valueFor(row: TRow, column: PlanningBookVirtualGridColumn<TRow>): unknown { return column.getValue?.(row); }
function matchesFilter(row: TRow): boolean { const expected = filterText.value.trim().toLocaleLowerCase(); return expected.length === 0 || props.columns.some((column) => String(valueFor(row, column) ?? '').toLocaleLowerCase().includes(expected)); }
const filteredRowKeys = computed(() => { const matching = new Set(props.rows.filter(matchesFilter).map((row) => row.rowKey)); if (filterText.value.trim().length === 0) return matching; [...matching].forEach((rowKey) => { let parent = parentByRowKey.value.get(rowKey); while (parent !== undefined) { matching.add(parent); parent = parentByRowKey.value.get(parent); } }); return matching; });
function isExpandedThroughAncestors(row: TRow): boolean { let parent = row.hierarchyParentRowKey; while (parent !== undefined) { if (expandedByRowKey[parent] === false) return false; parent = parentByRowKey.value.get(parent); } return true; }
const visibleRows = computed(() => props.rows.filter((row) => filteredRowKeys.value.has(row.rowKey) && isExpandedThroughAncestors(row)));
const dataScrollTop = computed(() => Math.max(0, scrollTop.value - ROW_HEIGHT));
const firstVisibleRowIndex = computed(() => Math.max(0, Math.floor(dataScrollTop.value / ROW_HEIGHT) - OVERSCAN_ROWS));
const lastVisibleRowIndex = computed(() => Math.min(visibleRows.value.length, Math.ceil((dataScrollTop.value + Math.max(0, viewportHeight.value - ROW_HEIGHT)) / ROW_HEIGHT) + OVERSCAN_ROWS));
const renderedRows = computed(() => visibleRows.value.slice(firstVisibleRowIndex.value, lastVisibleRowIndex.value));
const gridTemplateColumns = computed(() => props.columns.map((column) => column.width ?? '9rem').join(' '));
function isPeriodColumn(column: PlanningBookVirtualGridColumn<TRow>): boolean { return column.id.startsWith('period:'); }
function toggleHierarchy(row: TRow): void { if (row.hierarchyExpandable) expandedByRowKey[row.rowKey] = !(expandedByRowKey[row.rowKey] ?? true); }
function onViewportScroll(event: Event): void { scrollTop.value = (event.currentTarget as HTMLElement).scrollTop; }
function updateViewportHeight(): void { viewportHeight.value = Math.max(viewportElement.value?.clientHeight ?? 0, ROW_HEIGHT * 3); }
watch([visibleRows, filterText], () => { scrollTop.value = 0; if (viewportElement.value !== null) viewportElement.value.scrollTop = 0; void nextTick(updateViewportHeight); });
onMounted(() => { updateViewportHeight(); resizeObserver = new ResizeObserver(updateViewportHeight); if (viewportElement.value !== null) resizeObserver.observe(viewportElement.value); });
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>
<template>
  <section class="planning-book-virtual-grid" aria-label="Planning Book grid">
    <header class="grid-toolbar"><span>{{ visibleRows.length }} rows in view</span><label>Filter visible book<input v-model="filterText" type="search" placeholder="Material, location or key figure" :disabled="busy"></label></header>
    <div v-if="visibleRows.length > 0" ref="viewportElement" class="grid-viewport" @scroll="onViewportScroll"><div class="grid-content" :style="{ height: `${(visibleRows.length + 1) * ROW_HEIGHT}px`, minWidth: 'max-content' }"><div class="grid-row grid-header" :style="{ gridTemplateColumns }"><div v-for="column in columns" :key="column.id" :class="column.headerClass">{{ column.label }}</div></div><div v-for="(row, rowIndex) in renderedRows" :key="row.rowKey" class="grid-row grid-data-row" :style="{ gridTemplateColumns, transform: `translateY(${ROW_HEIGHT + (firstVisibleRowIndex + rowIndex) * ROW_HEIGHT}px)` }"><div v-for="column in columns" :key="column.id" :class="[column.cellClass, { 'period-cell': isPeriodColumn(column), 'crosshatched-cell': row.additionalClasses[column.id.slice('period:'.length)]?.includes('crosshatch') }]"><template v-if="column.hierarchy"><div class="hierarchy-cell" :style="{ paddingInlineStart: `${row.hierarchyDepth * 1.35 + .35}rem` }"><button v-if="row.hierarchyExpandable" class="tree-toggle" type="button" :aria-expanded="expandedByRowKey[row.rowKey] !== false" @click="toggleHierarchy(row)">{{ expandedByRowKey[row.rowKey] === false ? '›' : '⌄' }}</button><span v-else class="tree-spacer" aria-hidden="true"></span><slot name="cell" :row="row" :column="column" :value="valueFor(row, column)">{{ valueFor(row, column) }}</slot></div></template><slot v-else name="cell" :row="row" :column="column" :value="valueFor(row, column)">{{ valueFor(row, column) }}</slot></div></div></div></div>
    <slot v-else name="empty"><p class="grid-empty">{{ emptyMessage }}</p></slot>
  </section>
</template>
<style scoped>
.planning-book-virtual-grid{border:1px solid #dce3ed;border-radius:.75rem;display:grid;grid-template-rows:auto minmax(0,1fr);height:clamp(24rem,65vh,48rem);overflow:hidden}.grid-toolbar{align-items:center;border-bottom:1px solid #dce3ed;color:var(--ofx-muted,#56657a);display:flex;font-size:.78rem;gap:1rem;justify-content:space-between;padding:.55rem .75rem}.grid-toolbar label{align-items:center;display:flex;gap:.5rem;font-weight:600}.grid-toolbar input{border:1px solid #c8d0de;border-radius:.4rem;padding:.35rem .55rem;width:min(20rem,46vw)}.grid-viewport{min-height:0;overflow:auto;position:relative}.grid-content{position:relative}.grid-row{display:grid;min-width:max-content}.grid-header{background:#f7f9fc;border-bottom:1px solid #dce3ed;font-size:.72rem;font-weight:700;inset:0 0 auto;line-height:42px;position:sticky;text-transform:uppercase;z-index:2}.grid-header>div{border-right:1px solid #e7ecf3;overflow:hidden;padding:0 .7rem;text-overflow:ellipsis;white-space:nowrap}.grid-data-row{border-bottom:1px solid #edf0f5;height:42px;left:0;position:absolute;right:0}.grid-data-row>div{align-items:center;border-right:1px solid #f0f2f6;display:flex;min-width:0;overflow:hidden;padding:.35rem .7rem;text-overflow:ellipsis;white-space:nowrap}.grid-data-row>div.period-cell{font-variant-numeric:tabular-nums;justify-content:flex-end}.grid-data-row>div.crosshatched-cell{background:repeating-linear-gradient(135deg,rgba(148,163,184,.15),rgba(148,163,184,.15) 6px,transparent 6px,transparent 12px)}.hierarchy-cell{align-items:center;display:flex;min-width:0;width:100%}.tree-toggle,.tree-spacer{align-items:center;border:0;display:inline-flex;flex:0 0 1.25rem;height:1.25rem;justify-content:center;margin-right:.2rem;width:1.25rem}.tree-toggle{background:transparent;border-radius:.25rem;color:var(--ofx-accent,#2563eb);cursor:pointer;font-size:1.1rem}.tree-toggle:hover{background:#e8effc}.grid-empty{color:var(--ofx-muted,#56657a);margin:1rem}
</style>
