<script setup lang="ts">
import { computed } from 'vue';
import OfxDownloadSplitButton, { type OfxDownloadOption } from './OfxDownloadSplitButton.vue';

export type OfxExportFormat = 'csv' | 'xlsx';

const props = withDefaults(
  defineProps<{
    resultsLabel?: string;
    downloadFormat?: OfxExportFormat;
    /** The host-owned visual mode; Community remains light by default. */
    themeMode?: 'light' | 'dark';
  }>(),
  {
    resultsLabel: '',
    downloadFormat: 'xlsx',
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  download: [];
  'update:downloadFormat': [value: OfxExportFormat];
}>();

const hasResultsLabel = computed(() => Boolean(props.resultsLabel?.trim()));
const downloadOptions = computed<OfxDownloadOption[]>(() => [
  { label: 'XLSX', value: 'xlsx' },
  { label: 'CSV', value: 'csv' },
]);
</script>

<template>
  <div
    class="flex border-b border-[color:var(--ofx-border)] px-4 lg:flex-row lg:items-center"
    :class="hasResultsLabel ? 'flex-col gap-2 py-3 lg:justify-between' : 'justify-end py-2'"
  >
    <p v-if="hasResultsLabel" class="text-sm text-[color:var(--ofx-text-muted)]">{{ props.resultsLabel }}</p>
    <div class="flex items-center gap-2">
      <slot name="actions" />
      <OfxDownloadSplitButton
        :model-value="props.downloadFormat"
        :options="downloadOptions"
        action-label="Download as"
        :theme-mode="props.themeMode"
        @update:model-value="emit('update:downloadFormat', $event as OfxExportFormat)"
        @action="emit('download')"
      />
    </div>
  </div>
</template>
