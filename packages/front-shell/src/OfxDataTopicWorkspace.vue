<script setup lang="ts">
import { computed } from 'vue';
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
  downloadFormat?: string;
  downloadOptions?: OfxDownloadOption[];
  downloadPresentation?: 'browser-file' | 'format-select' | 'server-file';
  /** Lets a host make the primary download action visually explicit in a light workspace. */
  downloadActionVariant?: 'default' | 'accent';
  importVisible?: boolean;
  importDisabled?: boolean;
  importLabel?: string;
  dangerVisible?: boolean;
  dangerDisabled?: boolean;
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

const importButtonClass = computed(() => (
  isLightTheme.value
    ? 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-[color:rgb(31_135_93_/_0.36)] bg-[color:rgb(31_135_93)] px-4 text-sm font-semibold text-white transition hover:bg-[color:rgb(22_98_65)] disabled:cursor-not-allowed disabled:opacity-45'
    : 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-emerald-400/34 bg-[linear-gradient(180deg,rgb(20_104_85_/_0.78),rgb(12_68_55_/_0.74))] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
));

const dangerButtonClass = computed(() =>
  isLightTheme.value
    ? props.warningTone === 'danger'
      ? 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-[color:rgb(208_69_102_/_0.36)] bg-[color:rgb(190_45_77)] px-4 text-sm font-semibold text-white transition hover:bg-[color:rgb(158_41_67)] disabled:cursor-not-allowed disabled:opacity-45'
      : 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-[color:rgb(211_155_42_/_0.36)] bg-[color:rgb(177_121_29)] px-4 text-sm font-semibold text-white transition hover:bg-[color:rgb(138_97_24)] disabled:cursor-not-allowed disabled:opacity-45'
    : props.warningTone === 'danger'
      ? 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-red-400/42 bg-[linear-gradient(180deg,rgb(144_44_54_/_0.78),rgb(106_31_38_/_0.74))] px-4 text-sm font-semibold text-red-50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
      : 'inline-flex h-[38px] items-center justify-center rounded-[12px] border border-amber-400/38 bg-[linear-gradient(180deg,rgb(154_102_31_/_0.78),rgb(111_71_21_/_0.74))] px-4 text-sm font-semibold text-amber-50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45',
);

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
            :selector-visible="props.downloadPresentation !== 'server-file'"
            :action-label="props.downloadPresentation === 'server-file' ? 'Download' : 'Download as'"
            :action-variant="resolvedDownloadActionVariant"
            @action="emit('download')"
            @update:model-value="emit('update:downloadFormat', $event)"
          />
        </div>

        <div v-else-if="props.importVisible" class="flex flex-wrap items-center gap-2">
          <button type="button" :class="importButtonClass" :disabled="props.importDisabled" @click="emit('import')">
            {{ props.importLabel ?? 'Import file' }}
          </button>
        </div>

        <template v-else-if="props.dangerVisible">
          <div :class="['rounded-[12px] border px-4 py-4', warningCardClass()]">
            <div class="text-xs font-semibold uppercase tracking-[0.16em]">Warning</div>
            <p class="mt-2 text-sm leading-6">{{ props.warningText }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              :class="dangerButtonClass"
              :disabled="props.dangerDisabled"
              @click="emit('danger')"
            >
              {{ props.processingLabel || props.dangerLabel }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
