<script setup lang="ts">
import { computed } from 'vue';

export interface OfxOperationPanelOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

const model = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    apiBasePath?: string;
    operations: OfxOperationPanelOption[];
    apiPathLabel?: string;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    title: 'Operations',
    description: '',
    apiPathLabel: 'Service path',
    themeMode: 'light',
  },
);

const isLightTheme = computed(() => props.themeMode === 'light');
const selectedOperation = computed(
  () => props.operations.find((option) => option.value === model.value) ?? props.operations[0] ?? null,
);

function selectedOperationClasses(value: string) {

  if (isLightTheme.value) {
    switch (value) {
      case 'download':
        return 'border-[color:rgb(75_124_255_/_0.46)] bg-[color:rgb(232_239_255_/_0.96)] text-[color:rgb(33_71_160)] shadow-[0_10px_24px_rgb(37_58_109_/_0.10)]';
      case 'import':
        return 'border-[color:rgb(31_135_93_/_0.36)] bg-[color:rgb(226_247_239_/_0.96)] text-[color:rgb(22_98_65)] shadow-[0_10px_24px_rgb(31_135_93_/_0.10)]';
      case 'deactivate':
        return 'border-[color:rgb(211_155_42_/_0.36)] bg-[color:rgb(255_248_230_/_0.96)] text-[color:rgb(138_97_24)] shadow-[0_10px_24px_rgb(154_102_31_/_0.10)]';
      case 'delete':
        return 'border-[color:rgb(208_69_102_/_0.36)] bg-[color:rgb(255_236_240_/_0.96)] text-[color:rgb(158_41_67)] shadow-[0_10px_24px_rgb(208_69_102_/_0.10)]';
      default:
        return 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] text-[color:var(--ofx-primary)]';
    }
  }

  switch (value) {
    case 'download':
      return 'border-[color:rgb(112_148_255_/_0.56)] bg-[linear-gradient(180deg,rgb(55_83_148_/_0.62),rgb(37_58_109_/_0.54))] text-white shadow-[0_10px_28px_rgb(37_58_109_/_0.22)]';
    case 'import':
      return 'border-emerald-400/38 bg-[linear-gradient(180deg,rgb(18_95_78_/_0.6),rgb(11_57_50_/_0.48))] text-white shadow-[0_10px_28px_rgb(6_78_59_/_0.18)]';
    case 'deactivate':
      return 'border-amber-400/38 bg-[linear-gradient(180deg,rgb(120_77_20_/_0.5),rgb(74_49_17_/_0.42))] text-white shadow-[0_10px_28px_rgb(120_77_20_/_0.16)]';
    case 'delete':
      return 'border-red-400/40 bg-[linear-gradient(180deg,rgb(128_39_47_/_0.56),rgb(82_24_30_/_0.46))] text-white shadow-[0_10px_28px_rgb(104_28_34_/_0.16)]';
    default:
      return 'border-[color:rgb(90_128_255_/_0.42)] bg-[color:rgb(46_72_132_/_0.38)] text-white';
  }
}

const eyebrowClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/40'));
const descriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/60'));
const unselectedOperationClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/8 bg-white/[0.025] text-white/76 hover:bg-white/[0.045]'
));
const operationLabelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const operationDescriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/48'));
const infoBoxClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/8 bg-white/[0.018] text-white/62'
));
const apiCodeClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/82'));
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">{{ props.title }}</div>
      <p v-if="props.description" :class="['text-sm leading-6', descriptionClass]">{{ props.description }}</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="operation in props.operations"
        :key="operation.value"
        type="button"
        class="min-w-[140px] rounded-[12px] border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45"
        :class="model === operation.value
          ? selectedOperationClasses(operation.value)
          : unselectedOperationClass"
        :disabled="operation.disabled"
        @click="model = operation.value"
      >
        <div :class="['text-sm font-semibold', operationLabelClass]">{{ operation.label }}</div>
        <div v-if="operation.description" :class="['mt-1 text-xs leading-5', operationDescriptionClass]">
          {{ operation.description }}
        </div>
      </button>
    </div>

    <div v-if="props.apiBasePath" :class="['rounded-[12px] border px-4 py-3', infoBoxClass]">
      <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', eyebrowClass]">{{ props.apiPathLabel }}</div>
      <code :class="['mt-2 block break-all text-sm', apiCodeClass]">{{ props.apiBasePath }}</code>
    </div>

    <div
      v-if="selectedOperation?.description"
      :class="['rounded-[12px] border px-4 py-3 text-sm leading-6', infoBoxClass]"
    >
      {{ selectedOperation.description }}
    </div>

    <slot name="filters" :operation="model" />
    <slot :operation="model" />
  </div>
</template>
