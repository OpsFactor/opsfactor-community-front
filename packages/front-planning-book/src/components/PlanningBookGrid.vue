<script setup lang="ts" generic="TRow = unknown">
import type { PlanningBookGridColumn, PlanningBookGridProps } from '../planning-book.model.js';
import { displayPlanningBookGridCellValue } from '../planning-book.presentation.js';

const props = withDefaults(defineProps<PlanningBookGridProps<TRow>>(), {
  rowKey: (_row: TRow, rowIndex: number) => rowIndex,
  emptyMessage: 'No Planning Book rows are available.',
});

defineSlots<{
  header?(properties: { column: PlanningBookGridColumn<TRow>; columnIndex: number }): unknown;
  cell?(properties: { row: TRow; rowIndex: number; column: PlanningBookGridColumn<TRow>; columnIndex: number; value: unknown }): unknown;
  empty?(): unknown;
}>();

function valueFor(row: TRow, column: PlanningBookGridColumn<TRow>): unknown {

  return column.getValue?.(row);
}

</script>

<template>
  <div class="planning-book-grid" role="region" aria-label="Planning Book grid">
    <table v-if="rows.length > 0">
      <thead>
        <tr>
          <th v-for="(column, columnIndex) in columns" :key="column.id" scope="col" :class="column.headerClass">
            <slot name="header" :column="column" :column-index="columnIndex">{{ column.label }}</slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowKey(row, rowIndex)">
          <td v-for="(column, columnIndex) in columns" :key="column.id" :class="column.cellClass">
            <slot name="cell" :row="row" :row-index="rowIndex" :column="column" :column-index="columnIndex" :value="valueFor(row, column)">
              {{ displayPlanningBookGridCellValue(valueFor(row, column)) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <slot v-else name="empty"><p class="planning-book-grid__empty">{{ emptyMessage }}</p></slot>
  </div>
</template>

<style scoped>
.planning-book-grid { overflow: auto; }
table { border-collapse: collapse; min-width: max-content; width: 100%; text-align: left; }
th, td { border-top: 1px solid #e2e7f0; padding: .65rem; vertical-align: middle; white-space: nowrap; }
th { color: var(--ofx-muted, #56657a); font-size: .75rem; text-transform: uppercase; }
.planning-book-grid__empty { color: var(--ofx-muted, #56657a); }
</style>
