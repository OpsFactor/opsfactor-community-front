<script setup lang="ts">
import { computed } from 'vue';
import MultiSelect from 'primevue/multiselect';

interface OfxSelectOption {
  label: string;
  value: string;
}

const model = defineModel<string[]>({ default: [] });

const props = withDefaults(
  defineProps<{
    options: OfxSelectOption[];
    placeholder?: string;
    inputId?: string;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    placeholder: 'Select options',
    inputId: undefined,
    themeMode: 'light',
  },
);

const isLightTheme = computed(() => props.themeMode === 'light');

const pt = computed(() => ({
  root: {
    class:
      'min-h-[var(--ofx-input-height-md)] rounded-lg border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] px-2 text-sm text-[color:var(--ofx-text)]',
  },
  labelContainer: { class: 'flex flex-wrap gap-1 py-2' },
  label: { class: 'text-sm text-[color:var(--ofx-text)]' },
  dropdown: { class: 'px-2 text-[color:var(--ofx-text-subtle)]' },
  overlay: {
    class: isLightTheme.value
      ? 'rounded-2xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] p-2 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl'
      : 'rounded-2xl border border-white/10 bg-[color:rgb(10_16_29_/_0.98)] p-2 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl',
  },
  header: { class: isLightTheme.value ? 'mb-2 space-y-2 border-b border-[color:var(--ofx-border)] px-2 pb-2' : 'mb-2 space-y-2 border-b border-white/6 px-2 pb-2' },
  pcFilterContainer: { root: { class: 'relative block' } },
  pcFilter: {
    root: {
      class: isLightTheme.value
        ? 'h-10 w-full rounded-xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-3 text-sm text-[color:var(--ofx-text)] placeholder:text-[color:var(--ofx-text-subtle)] focus:border-[color:var(--ofx-border-focus)] focus:outline-none'
        : 'h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/88 placeholder:text-white/28 focus:border-[color:var(--ofx-border-focus)] focus:outline-none',
    },
  },
  pcFilterIconContainer: { root: { class: isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34' } },
  listContainer: { class: 'max-h-72 overflow-auto pt-1' },
  list: { class: 'space-y-1' },
  option: {
    class: isLightTheme.value
      ? 'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[color:var(--ofx-text-muted)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
      : 'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/82 hover:bg-white/[0.06]',
  },
  optionLabel: { class: isLightTheme.value ? 'text-sm text-[color:var(--ofx-text)]' : 'text-sm text-white/82' },
  chipItem: { class: 'mr-1' },
  pcChip: {
    root: {
      class: isLightTheme.value
        ? 'rounded-[var(--ofx-radius-pill)] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-2 py-1 text-xs text-[color:var(--ofx-text-muted)]'
        : 'rounded-[var(--ofx-radius-pill)] border border-white/8 bg-white/[0.06] px-2 py-1 text-xs text-white/82',
    },
  },
  emptyMessage: { class: isLightTheme.value ? 'px-3 py-3 text-sm text-[color:var(--ofx-text-muted)]' : 'px-3 py-3 text-sm text-white/40' },
}));
</script>

<template>
  <MultiSelect
    v-model="model"
    :options="props.options"
    option-label="label"
    option-value="value"
    display="chip"
    filter
    :show-toggle-all="false"
    :input-id="props.inputId"
    :placeholder="props.placeholder"
    :max-selected-labels="2"
    :pt="pt"
    fluid
  />
</template>
