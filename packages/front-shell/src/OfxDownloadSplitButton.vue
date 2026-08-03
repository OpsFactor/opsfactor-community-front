<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export interface OfxDownloadOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export type OfxDownloadActionVariant = 'default' | 'accent';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: OfxDownloadOption[];
    actionLabel?: string;
    actionVariant?: OfxDownloadActionVariant;
    disabled?: boolean;
    selectorVisible?: boolean;
    /** The host-owned visual mode; Community remains light by default. */
    themeMode?: 'light' | 'dark';
  }>(),
  {
    actionLabel: 'Download as',
    actionVariant: 'default',
    disabled: false,
    selectorVisible: true,
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  action: [];
}>();

const menuOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedOption = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? props.options[0] ?? null,
);

const isLightTheme = computed(() => props.themeMode === 'light');

const transitionClass = 'min-h-[38px] transition-colors duration-150';

const actionButtonClass = computed(() => {
  const radiusClass = props.selectorVisible ? 'rounded-l-[10px]' : 'rounded-[10px]';
  const baseClass = `${transitionClass} border px-3 text-sm font-semibold ${radiusClass}`;

  if (isLightTheme.value) {
    if (props.actionVariant === 'accent') {
      return `${baseClass} border-[color:var(--ofx-primary)] bg-[color:var(--ofx-primary)] text-[color:var(--ofx-primary-foreground)] shadow-[0_8px_18px_rgb(15_23_42_/_0.06)] hover:bg-[color:var(--ofx-primary-hover)] disabled:cursor-not-allowed disabled:border-[color:var(--ofx-border-strong)] disabled:bg-[color:var(--ofx-surface-strong)] disabled:text-[color:var(--ofx-text-muted)] disabled:shadow-none`;
    }

    return `${baseClass} border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text)] shadow-[0_8px_18px_rgb(15_23_42_/_0.06)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-muted)] disabled:cursor-not-allowed disabled:border-[color:var(--ofx-border-strong)] disabled:bg-[color:var(--ofx-surface-strong)] disabled:text-[color:var(--ofx-text-muted)] disabled:shadow-none`;
  }

  if (props.actionVariant === 'accent') {
    return `${baseClass} border-[color:rgb(112_148_255_/_0.46)] bg-[linear-gradient(180deg,rgb(59_88_156_/_0.78),rgb(41_63_116_/_0.72))] text-white hover:border-[color:rgb(94_110_140_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(45_57_78_/_0.98),rgb(33_43_60_/_0.98))] disabled:cursor-not-allowed disabled:opacity-45`;
  }

  return `${baseClass} border-[color:rgb(78_92_118_/_0.9)] bg-[linear-gradient(180deg,rgb(38_48_66_/_0.98),rgb(28_37_52_/_0.98))] text-[color:rgb(255_255_255_/_0.94)] hover:border-[color:rgb(94_110_140_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(45_57_78_/_0.98),rgb(33_43_60_/_0.98))] disabled:cursor-not-allowed disabled:opacity-45`;
});

const selectorButtonClass = computed(() => {
  const baseClass = `${transitionClass} rounded-r-[10px] border border-l-0 px-3 text-sm`;

  if (isLightTheme.value) {
    return `${baseClass} border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] shadow-[0_8px_18px_rgb(15_23_42_/_0.05)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-muted)] hover:text-[color:var(--ofx-text)] disabled:cursor-not-allowed disabled:border-[color:var(--ofx-border-strong)] disabled:bg-[color:var(--ofx-surface-strong)] disabled:text-[color:var(--ofx-text-muted)] disabled:shadow-none`;
  }

  return `${baseClass} border-[color:rgb(55_67_88_/_0.88)] bg-[linear-gradient(180deg,rgb(9_14_22_/_0.98),rgb(6_10_17_/_0.98))] text-[color:rgb(255_255_255_/_0.88)] hover:border-[color:rgb(94_110_140_/_0.96)] hover:bg-[linear-gradient(180deg,rgb(45_57_78_/_0.98),rgb(33_43_60_/_0.98))] disabled:cursor-not-allowed disabled:opacity-45`;
});

const menuClass = computed(() => {
  if (isLightTheme.value) {
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]';
  }

  return 'border-[color:rgb(255_255_255_/_0.1)] bg-[color:rgb(10_16_29_/_0.985)]';
});

const optionClass = computed(() => {
  if (isLightTheme.value) {
    return `${transitionClass} flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-sm text-[color:var(--ofx-text-muted)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)] disabled:cursor-not-allowed disabled:opacity-45`;
  }

  return `${transitionClass} flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-sm text-[color:rgb(255_255_255_/_0.84)] hover:bg-[color:rgb(255_255_255_/_0.06)] disabled:cursor-not-allowed disabled:opacity-45`;
});

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null;
  if (target && rootRef.value && !rootRef.value.contains(target)) {
    menuOpen.value = false;
  }
}

function selectOption(value: string) {
  emit('update:modelValue', value);
  menuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<template>
  <div ref="rootRef" class="ofx-download-split relative flex items-center">
    <button
      :class="actionButtonClass"
      :disabled="props.disabled"
      @click="emit('action')"
    >
      <span class="inline-flex items-center gap-2">
        <span aria-hidden="true">↓</span>
        <span>{{ props.actionLabel }}</span>
      </span>
    </button>

    <button
      v-if="props.selectorVisible"
      :class="selectorButtonClass"
      :disabled="props.disabled || props.options.length <= 1"
      @click="menuOpen = !menuOpen"
    >
      <span class="inline-flex items-center gap-2">
        <span>{{ selectedOption?.label ?? 'Select' }}</span>
        <span aria-hidden="true">▾</span>
      </span>
    </button>

    <div
      v-if="props.selectorVisible && menuOpen"
      :class="['absolute right-0 top-[calc(100%+0.35rem)] z-[calc(var(--ofx-z-dropdown)+8)] min-w-[120px] rounded-[10px] border p-1 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl', menuClass]"
    >
      <button
        v-for="option in props.options"
        :key="option.value"
        :class="optionClass"
        :disabled="option.disabled"
        @click="selectOption(option.value)"
      >
        <span>{{ option.label }}</span>
        <span v-if="props.modelValue === option.value">✓</span>
      </button>
    </div>
  </div>
</template>
