<script setup lang="ts">
import { computed } from 'vue';

/**
 * Neutral placement contract for operational filter controls. Domain-specific
 * selectors remain slots supplied by the edition host.
 */
type FilterSlotName =
  | 'date'
  | 'materials'
  | 'material-characteristics'
  | 'locations'
  | 'location-characteristics'
  | 'custom-selectors';

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    showDate?: boolean;
    showMaterials?: boolean;
    showMaterialCharacteristics?: boolean;
    showLocations?: boolean;
    showLocationCharacteristics?: boolean;
    showCustomSelectors?: boolean;
    slotOrder?: FilterSlotName[];
  }>(),
  {
    title: 'Filters',
    description: '',
    showDate: true,
    showMaterials: true,
    showMaterialCharacteristics: true,
    showLocations: true,
    showLocationCharacteristics: true,
    showCustomSelectors: true,
    slotOrder: () => ['date', 'materials', 'material-characteristics', 'locations', 'location-characteristics', 'custom-selectors'],
  },
);

const slotVisibilityByName = computed<Record<FilterSlotName, boolean>>(() => ({
  date: props.showDate,
  materials: props.showMaterials,
  'material-characteristics': props.showMaterialCharacteristics,
  locations: props.showLocations,
  'location-characteristics': props.showLocationCharacteristics,
  'custom-selectors': props.showCustomSelectors,
}));

const orderedVisibleSlots = computed(() =>
  props.slotOrder.filter((slotName) => slotVisibilityByName.value[slotName]),
);
</script>

<template>
  <div class="ofx-operation-filters space-y-4 rounded-[14px] border px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
    <div class="grid gap-4 md:grid-cols-2">
      <template v-for="slotName in orderedVisibleSlots" :key="slotName">
        <slot :name="slotName" />
      </template>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ofx-operation-filters {
  border-color: rgb(255 255 255 / 0.08);
  background: linear-gradient(180deg, rgb(122 128 138 / 0.08), rgb(20 28 43 / 0.88));
}

:global(:root[data-theme='light']) .ofx-operation-filters {
  border-color: var(--ofx-border);
  background: linear-gradient(180deg, var(--ofx-surface-elevated), var(--ofx-surface));
}
</style>
