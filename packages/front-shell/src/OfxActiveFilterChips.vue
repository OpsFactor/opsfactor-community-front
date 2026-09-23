<script setup lang="ts">
import OfxButton from './OfxButton.vue';
/**
 * Visual contract shared by every edition for the active filters of a workspace.
 * The host owns the filters and their mutations; this component only renders
 * their current state and exposes the explicit user actions.
 */
interface OfxFilterChip {
  key: string;
  label: string;
}

const props = defineProps<{
  chips: OfxFilterChip[];
}>();

const emit = defineEmits<{
  remove: [key: string];
  clear: [];
}>();
</script>

<template>
  <div v-if="props.chips.length" class="flex flex-wrap items-center gap-2">
    <button
      v-for="chip in props.chips"
      :key="chip.key"
      class="inline-flex items-center gap-2 rounded-[var(--ofx-radius-pill)] border border-[color:var(--ofx-border-selected)] bg-[color:rgb(40_115_217_/_0.08)] px-3 py-1.5 text-sm text-[color:var(--ofx-text)]"
      @click="emit('remove', chip.key)"
    >
      <span>{{ chip.label }}</span>
      <span class="text-[color:var(--ofx-text-subtle)]">x</span>
    </button>
    <OfxButton @click="emit('clear')" variant="filter" icon="close" size="compact">Clear all</OfxButton>
  </div>
</template>
