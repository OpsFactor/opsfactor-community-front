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
  /** Lets a host explain a bounded non-file import without changing the shared action structure. */
  importDescription?: string;
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

const actionTone = computed(() => {
  if (props.downloadVisible) return 'download';
  if (props.importVisible) return 'import';
  if (props.warningTone === 'danger') return 'delete';
  return 'deactivate';
});

const actionCardClass = computed(() => {
  if (isLightTheme.value) {
    switch (actionTone.value) {
      case 'download':
        return 'border-[color:rgb(75_124_255_/_0.28)] bg-[color:rgb(241_246_255_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]';
      case 'import':
        return 'border-[color:rgb(31_135_93_/_0.26)] bg-[color:rgb(238_250_245_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]';
      case 'delete':
        return 'border-[color:rgb(208_69_102_/_0.28)] bg-[color:rgb(255_242_245_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]';
      default:
        return 'border-[color:rgb(211_155_42_/_0.28)] bg-[color:rgb(255_250_237_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]';
    }
  }

  switch (actionTone.value) {
    case 'download':
      return 'border-[color:rgb(112_148_255_/_0.28)] bg-[linear-gradient(180deg,rgb(73_102_182_/_0.18),rgb(21_31_53_/_0.94))]';
    case 'import':
      return 'border-emerald-400/24 bg-[linear-gradient(180deg,rgb(21_94_79_/_0.18),rgb(20_33_34_/_0.92))]';
    case 'delete':
      return 'border-red-400/26 bg-[linear-gradient(180deg,rgb(122_37_45_/_0.2),rgb(37_19_24_/_0.92))]';
    default:
      return 'border-amber-400/24 bg-[linear-gradient(180deg,rgb(126_80_23_/_0.18),rgb(38_29_18_/_0.92))]';
  }
});

const actionEyebrow = computed(() => {
  switch (actionTone.value) {
    case 'download':
      return 'Run Download';
    case 'import':
      return 'Run Import';
    case 'delete':
      return 'Run Deletion';
    default:
      return 'Run Deactivation';
  }
});

const actionDescription = computed(() => {
  switch (actionTone.value) {
    case 'download':
      return props.downloadPresentation === 'server-file'
        ? 'Download the current data in the selected format.'
        : 'Choose the export format and run the extract from this highlighted action area.';
    case 'import':
      return props.importDescription ?? 'Use this entry point to upload the file for the selected topic.';
    case 'delete':
      return 'This destructive action is separated here on purpose so it is clearly different from scoping controls.';
    default:
      return 'Review the scope above and then trigger the status change from this dedicated action area.';
  }
});

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
const textClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/76'));
const endpointCodeClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/82'));
const missingFiltersClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:rgb(211_155_42_/_0.32)] bg-[color:rgb(255_248_230_/_0.92)] text-[color:rgb(95_67_18)]'
    : 'border-amber-500/28 bg-amber-500/10 text-amber-100/88'
));

const importButtonClass = computed(() => (
  isLightTheme.value
    ? 'rounded-[12px] border border-[color:rgb(31_135_93_/_0.36)] bg-[color:rgb(31_135_93)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:rgb(22_98_65)] disabled:cursor-not-allowed disabled:opacity-45'
    : 'rounded-[12px] border border-emerald-400/34 bg-[linear-gradient(180deg,rgb(20_104_85_/_0.78),rgb(12_68_55_/_0.74))] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
));

const dangerButtonClass = computed(() =>
  isLightTheme.value
    ? props.warningTone === 'danger'
      ? 'rounded-[12px] border border-[color:rgb(208_69_102_/_0.36)] bg-[color:rgb(190_45_77)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:rgb(158_41_67)] disabled:cursor-not-allowed disabled:opacity-45'
      : 'rounded-[12px] border border-[color:rgb(211_155_42_/_0.36)] bg-[color:rgb(177_121_29)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:rgb(138_97_24)] disabled:cursor-not-allowed disabled:opacity-45'
    : props.warningTone === 'danger'
      ? 'rounded-[12px] border border-red-400/42 bg-[linear-gradient(180deg,rgb(144_44_54_/_0.78),rgb(106_31_38_/_0.74))] px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
      : 'rounded-[12px] border border-amber-400/38 bg-[linear-gradient(180deg,rgb(154_102_31_/_0.78),rgb(111_71_21_/_0.74))] px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45',
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
  <div class="space-y-6">
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

        <div v-if="props.downloadVisible" class="rounded-[14px] border px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]" :class="actionCardClass">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-[540px] space-y-2">
              <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">{{ actionEyebrow }}</div>
              <p :class="['text-sm leading-6', textClass]">{{ actionDescription }}</p>
            </div>
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
        </div>

        <div v-else-if="props.importVisible" class="rounded-[14px] border px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]" :class="actionCardClass">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-[540px] space-y-2">
              <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">{{ actionEyebrow }}</div>
              <p :class="['text-sm leading-6', textClass]">{{ actionDescription }}</p>
            </div>
            <button type="button" :class="importButtonClass" :disabled="props.importDisabled" @click="emit('import')">
              {{ props.importLabel ?? 'Import file' }}
            </button>
          </div>
        </div>

        <template v-else-if="props.dangerVisible">
          <div :class="['rounded-[12px] border px-4 py-4', warningCardClass()]">
            <div class="text-xs font-semibold uppercase tracking-[0.16em]">Warning</div>
            <p class="mt-2 text-sm leading-6">{{ props.warningText }}</p>
          </div>

          <div class="rounded-[14px] border px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]" :class="actionCardClass">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="max-w-[540px] space-y-2">
                <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">{{ actionEyebrow }}</div>
                <p :class="['text-sm leading-6', textClass]">{{ actionDescription }}</p>
              </div>

              <button
                type="button"
                :class="dangerButtonClass"
                :disabled="props.dangerDisabled"
                @click="emit('danger')"
              >
                {{ props.processingLabel || props.dangerLabel }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
