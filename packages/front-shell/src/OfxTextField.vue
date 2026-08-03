<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  label: string;
  modelValue: string | number | undefined | null;
  type?: 'text' | 'number' | 'password';
  format?: 'plain' | 'fraction-percent';
  percentFractionDigits?: number;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  locked?: boolean;
  lockedLabel?: string;
}>(), {
  format: 'plain',
  percentFractionDigits: 6,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isFocused = ref(false);
const focusedDisplayValue = ref('');
const isFractionPercent = computed(() => props.format === 'fraction-percent');

function parseNumericText(value: string) {

  const normalized = value.trim().replace('%', '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseModelNumber(value: string | number | null | undefined) {

  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  return parseNumericText(value);
}

function formatPercentValue(value: string | number | null | undefined) {

  const parsed = parseModelNumber(value);
  if (parsed == null) return '';
  return (parsed * 100).toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: props.percentFractionDigits,
  });
}

const inputValue = computed(() => {

  if (!isFractionPercent.value) return props.modelValue ?? '';
  return isFocused.value ? focusedDisplayValue.value : formatPercentValue(props.modelValue);
});
const inputType = computed(() => (isFractionPercent.value ? 'text' : props.type ?? 'text'));
const inputMode = computed(() => (isFractionPercent.value || props.type === 'number' ? 'decimal' : undefined));

watch(
  () => props.modelValue,
  (value) => {
    if (isFractionPercent.value && !isFocused.value) {
      focusedDisplayValue.value = formatPercentValue(value);
    }
  },
);

function handleFocus() {

  isFocused.value = true;
  if (isFractionPercent.value) {
    focusedDisplayValue.value = formatPercentValue(props.modelValue);
  }
}

function handleBlur() {

  isFocused.value = false;
  if (isFractionPercent.value) {
    focusedDisplayValue.value = formatPercentValue(props.modelValue);
  }
}

function handleInput(event: Event) {

  if (props.locked || props.disabled) return;
  const value = (event.target as HTMLInputElement).value;

  if (!isFractionPercent.value) {
    emit('update:modelValue', value);
    return;
  }

  focusedDisplayValue.value = value;
  const parsed = parseNumericText(value);
  emit('update:modelValue', parsed == null ? '' : String(parsed / 100));
}
</script>

<template>
  <label class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-3">
      <span class="text-[13px] font-medium text-[color:var(--ofx-text)]">{{ label }}</span>
      <span v-if="locked" class="inline-flex items-center rounded-full border border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text)]">{{ lockedLabel ?? 'Auto-fit' }}</span>
    </div>
    <div class="relative">
      <input
        :value="inputValue"
        :type="inputType"
        :inputmode="inputMode"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="locked"
        class="h-10 w-full rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-3.5 text-sm text-[color:var(--ofx-text)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] outline-none transition placeholder:text-[color:var(--ofx-text-subtle)]"
        :class="[isFractionPercent ? 'pr-9' : '', locked ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.08)] text-[color:var(--ofx-text)] shadow-[inset_0_1px_0_rgb(75_124_255_/_0.1)]' : disabled ? 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-subtle)]' : 'hover:border-[color:var(--ofx-border-strong)] focus:border-[color:var(--ofx-border-focus)] focus:ring-2 focus:ring-[color:rgb(75_124_255_/_0.14)]']"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      >
      <span v-if="isFractionPercent" class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[color:var(--ofx-text-subtle)]">%</span>
    </div>
    <span v-if="helpText" class="text-xs text-[color:var(--ofx-text-muted)]">{{ helpText }}</span>
  </label>
</template>
