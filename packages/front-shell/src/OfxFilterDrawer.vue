<script setup lang="ts">
import OfxButton from './OfxButton.vue';
/**
 * Shared drawer frame for advanced filters. The edition host supplies the
 * filter controls through the slot and owns every mutation.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    applyLabel?: string;
    clearLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    title: 'Advanced filters',
    description: '',
    applyLabel: 'Apply filters',
    clearLabel: 'Clear',
    cancelLabel: 'Close',
  },
);

const emit = defineEmits<{
  close: [];
  apply: [];
  clear: [];
}>();
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-[var(--ofx-z-drawer)] flex justify-end bg-[color:rgb(11_18_32_/_0.45)]">
      <aside class="flex h-full w-full max-w-xl flex-col border-l border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] shadow-[var(--ofx-shadow-lg)]">
        <header class="border-b border-[color:var(--ofx-border)] px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-[color:var(--ofx-text)]">{{ props.title }}</h2>
              <p v-if="props.description" class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
            </div>
            <OfxButton size="compact" @click="emit('close')">
              {{ props.cancelLabel }}
            </OfxButton>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="grid gap-4 md:grid-cols-2">
            <slot />
          </div>
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ofx-border)] px-6 py-4">
          <OfxButton size="compact" @click="emit('clear')">{{ props.clearLabel }}</OfxButton>
          <div class="flex gap-3">
            <OfxButton size="compact" @click="emit('close')">{{ props.cancelLabel }}</OfxButton>
            <OfxButton size="compact" variant="filter" @click="emit('apply')">{{ props.applyLabel }}</OfxButton>
          </div>
        </footer>
      </aside>
    </div>
  </teleport>
</template>
