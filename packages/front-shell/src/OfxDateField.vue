<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    helpText?: string;
    inputId?: string;
    disabled?: boolean;
  }>(),
  {
    label: '',
    helpText: '',
    inputId: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const displayValue = ref(formatDateForDisplay(props.modelValue));

watch(
  () => props.modelValue,
  (value) => {
    displayValue.value = formatDateForDisplay(value);
  },
);

function handleInput(value: string) {

  const formattedValue = formatDateDigits(value);
  displayValue.value = formattedValue;

  if (!formattedValue) {
    emit('update:modelValue', '');
    return;
  }

  const isoValue = parseDisplayDate(formattedValue);
  if (isoValue) {
    emit('update:modelValue', isoValue);
  }
}

function handleBlur() {

  if (!displayValue.value || parseDisplayDate(displayValue.value)) return;
  displayValue.value = formatDateForDisplay(props.modelValue);
}

function formatDateDigits(value: string) {

  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
}

function formatDateForDisplay(value: string) {

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function parseDisplayDate(value: string) {

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const isValidDate = parsed.getFullYear() === Number(year)
    && parsed.getMonth() === Number(month) - 1
    && parsed.getDate() === Number(day);
  return isValidDate ? `${year}-${month}-${day}` : '';
}
</script>

<template>
  <label class="flex flex-col gap-2">
    <span v-if="props.label" class="text-[13px] font-medium text-[color:var(--ofx-text)]">{{ props.label }}</span>
    <input
      :id="props.inputId"
      :value="displayValue"
      :disabled="props.disabled"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="dd/mm/yyyy"
      maxlength="10"
      class="h-10 rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-3.5 text-sm text-[color:var(--ofx-text)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] outline-none transition placeholder:text-[color:var(--ofx-text-subtle)] hover:border-[color:var(--ofx-border-strong)] focus:border-[color:var(--ofx-border-focus)] focus:ring-2 focus:ring-[color:rgb(75_124_255_/_0.14)] disabled:cursor-not-allowed disabled:border-[color:var(--ofx-border)] disabled:bg-[color:var(--ofx-muted)] disabled:text-[color:var(--ofx-text-subtle)]"
      @input="handleInput(($event.target as HTMLInputElement).value)"
      @blur="handleBlur"
    >
    <span v-if="props.helpText" class="text-xs text-[color:var(--ofx-text-muted)]">{{ props.helpText }}</span>
  </label>
</template>
