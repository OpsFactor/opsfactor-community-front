<script setup lang="ts">
import OfxButton from './OfxButton.vue';
import { computed } from 'vue';
import OfxActionLabel from './OfxActionLabel.vue';
import OfxOperationPanel, { type OfxOperationPanelOption } from './OfxOperationPanel.vue';
import OfxDownloadSplitButton, { type OfxDownloadOption } from './OfxDownloadSplitButton.vue';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  title: string;
  apiBasePath: string;
  operations: OfxOperationPanelOption[];
  showFilters?: boolean;
  showMissingRequiredFilters?: boolean;
  downloadVisible?: boolean;
  downloadDisabled?: boolean;
  downloadProcessing?: boolean;
  downloadFormat?: string;
  downloadOptions?: OfxDownloadOption[];
  downloadPresentation?: 'browser-file' | 'format-select' | 'server-file';
  /** Lets a host make the primary download action visually explicit in a light workspace. */
  downloadActionVariant?: 'default' | 'accent';
  importVisible?: boolean;
  importDisabled?: boolean;
  importProcessing?: boolean;
  importLabel?: string;
  dangerVisible?: boolean;
  dangerDisabled?: boolean;
  dangerProcessing?: boolean;
  warningTone?: 'warning' | 'danger';
  warningText?: string;
  dangerLabel?: string;
  processingLabel?: string;
  /** Host-owned theme policy: Community fixes light while Enterprise resolves its user preference. */
  themeMode?: 'light' | 'dark';
}>();

const emit = defineEmits<{
  download: [];
  import: [];
  danger: [];
  'update:downloadFormat': [value: string];
}>();

const isLightTheme = computed(() => props.themeMode === 'light');

/**
 * A download is the terminal action of every Data workspace.  In the light
 * product surface the neutral split button blends into the surrounding cards,
 * so make it an accent action by default.  Dark hosts keep their established
 * treatment unless they explicitly request the accent variant.
 */
const resolvedDownloadActionVariant = computed(() => (
  props.downloadActionVariant ?? (isLightTheme.value ? 'accent' : 'default')
));

const surfaceCardClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-white/8 bg-white/[0.018]'
));
const endpointCardClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-white/8 bg-white/[0.022]'
));
const dividerClass = computed(() => (isLightTheme.value ? 'border-[color:var(--ofx-border)]' : 'border-white/8'));
const eyebrowClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/48'));
const endpointCodeClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/82'));
const missingFiltersClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:rgb(211_155_42_/_0.32)] bg-[color:rgb(255_248_230_/_0.92)] text-[color:rgb(95_67_18)]'
    : 'border-amber-500/28 bg-amber-500/10 text-amber-100/88'
));


function warningCardClass() {
  if (isLightTheme.value) {
    return props.warningTone === 'danger'
      ? 'border-[color:rgb(208_69_102_/_0.34)] bg-[color:rgb(255_236_240_/_0.94)] text-[color:rgb(158_41_67)]'
      : 'border-[color:rgb(211_155_42_/_0.32)] bg-[color:rgb(255_248_230_/_0.94)] text-[color:rgb(138_97_24)]';
  }

  return props.warningTone === 'danger'
    ? 'border-red-500/55 bg-[color:rgb(115_18_28_/_0.5)] text-red-100/94'
    : 'border-amber-500/28 bg-amber-500/10 text-amber-100/82';
}
</script>

<template>
  <div :class="['space-y-6 border-t pt-6', dividerClass]">
    <div class="space-y-4">
      <div :class="['rounded-[12px] border px-4 py-4', endpointCardClass]">
        <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">Base API Endpoint</div>
        <code :class="['mt-3 block break-all text-sm', endpointCodeClass]">{{ apiBasePath }}</code>
      </div>
    </div>

    <div :class="['rounded-[14px] border p-4', surfaceCardClass]">
      <OfxOperationPanel
        v-model="model"
        :operations="operations"
        :theme-mode="props.themeMode"
        title="Operations"
        description=""
      >
        <template #default />
      </OfxOperationPanel>

      <div :class="['mt-4 space-y-4 border-t pt-4', dividerClass]">
        <slot name="filters" />

        <div v-if="props.showMissingRequiredFilters" :class="['rounded-[12px] border px-4 py-3 text-sm leading-6', missingFiltersClass]">
          Complete the required filters before running this action.
        </div>

        <div v-if="props.downloadVisible" class="flex flex-wrap items-center gap-2">
          <OfxDownloadSplitButton
            :model-value="props.downloadFormat ?? ''"
            :options="props.downloadOptions ?? []"
            :disabled="props.downloadDisabled"
            :processing="props.downloadProcessing"
            :selector-visible="props.downloadPresentation !== 'server-file'"
            :action-label="props.downloadPresentation === 'server-file' ? 'Download' : 'Download as'"
            :action-variant="resolvedDownloadActionVariant"
            @action="emit('download')"
            @update:model-value="emit('update:downloadFormat', $event)"
          />
        </div>

        <div v-else-if="props.importVisible" class="flex flex-wrap items-center gap-2">
          <OfxButton type="button" :disabled="props.importDisabled || props.importProcessing" @click="emit('import')" variant="primary" icon="upload" size="compact"><OfxActionLabel
              :label="props.importLabel ?? 'Import file'"
              :processing="props.importProcessing"
            /></OfxButton>
        </div>

        <template v-else-if="props.dangerVisible">
          <div :class="['rounded-[12px] border px-4 py-4', warningCardClass()]">
            <div class="text-xs font-semibold uppercase tracking-[0.16em]">Warning</div>
            <p class="mt-2 text-sm leading-6">{{ props.warningText }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <OfxButton type="button" :disabled="props.dangerDisabled || props.dangerProcessing" @click="emit('danger')" variant="danger" icon="delete" size="compact"><OfxActionLabel
                :label="props.dangerLabel ?? ''"
                :processing="props.dangerProcessing"
                :processing-label="props.processingLabel ?? 'Processing…'"
              /></OfxButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
