<script setup lang="ts">
import { computed } from 'vue';
import OfxDateField from './OfxDateField.vue';

const model = defineModel<[Date | null, Date | null] | null>({ default: null });

const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    helpText?: string;
    inputId?: string;
    /** The host-owned visual mode; Community remains light by default. */
    themeMode?: 'light' | 'dark';
  }>(),
  {
    placeholder: 'Choose start and end dates',
    helpText: '',
    inputId: undefined,
    themeMode: 'light',
  },
);

const isLightTheme = computed(() => props.themeMode === 'light');

const startValue = computed({
  get: () => toDateInputValue(model.value?.[0] ?? null),
  set: (value: string) => {
    const [, endDate] = model.value ?? [null, null];
    syncModel(parseDateInput(value), endDate, 'start');
  },
});

const endValue = computed({
  get: () => toDateInputValue(model.value?.[1] ?? null),
  set: (value: string) => {
    const [startDate] = model.value ?? [null, null];
    syncModel(startDate, parseDateInput(value), 'end');
  },
});

const selectedStartDate = computed(() => model.value?.[0] ?? null);
const selectedEndDate = computed(() => model.value?.[1] ?? null);
const hasAnyDate = computed(() => Boolean(selectedStartDate.value || selectedEndDate.value));
const hasCompleteRange = computed(() => Boolean(selectedStartDate.value && selectedEndDate.value));
const rangeLengthInDays = computed(() => {
  if (!selectedStartDate.value || !selectedEndDate.value) return null;
  const diffInDays = Math.round((selectedEndDate.value.getTime() - selectedStartDate.value.getTime()) / 86400000);
  return diffInDays + 1;
});
const rangeSummary = computed(() => {
  if (hasCompleteRange.value) {
    return `Window from ${formatDateLabel(selectedStartDate.value)} to ${formatDateLabel(selectedEndDate.value)}.`;
  }

  if (selectedStartDate.value) {
    return `Start date selected: ${formatDateLabel(selectedStartDate.value)}. Choose an end date to complete the range.`;
  }

  if (selectedEndDate.value) {
    return `End date selected: ${formatDateLabel(selectedEndDate.value)}. Choose a start date to complete the range.`;
  }

  return props.placeholder;
});
const labelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/86'));
const connectorClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-subtle)]'
    : 'border-[color:rgb(58_70_92_/_0.88)] bg-[color:rgb(14_20_31_/_0.94)] text-white/42'
));
const summaryClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]'
    : 'border-[color:rgb(48_60_82_/_0.84)] bg-[linear-gradient(180deg,rgb(12_18_29_/_0.98),rgb(8_12_20_/_0.98))] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]'
));
const dateBadgeClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:rgb(75_124_255_/_0.28)] bg-[color:rgb(75_124_255_/_0.1)] text-[color:var(--ofx-primary)]'
    : 'border-[color:rgb(84_121_224_/_0.36)] bg-[color:rgb(47_72_129_/_0.18)] text-[color:rgb(210_224_255)]'
));
const rangeLengthBadgeClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/8 bg-white/[0.04] text-white/56'
));
const summaryTextClass = computed(() => (
  isLightTheme.value
    ? hasAnyDate.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-[color:var(--ofx-text-subtle)]'
    : hasAnyDate.value ? 'text-white/72' : 'text-white/44'
));
const helpTextClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/48'));
const clearButtonClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/8 bg-white/[0.03] text-white/68 hover:bg-white/[0.05]'
));

function syncModel(startDate: Date | null, endDate: Date | null, editedBoundary?: 'start' | 'end') {
  if (!startDate && !endDate) {
    model.value = null;
    return;
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    model.value = editedBoundary === 'end'
      ? [endDate, endDate]
      : [startDate, startDate];
    return;
  }

  model.value = [startDate, endDate];
}

function clearRange() {
  model.value = null;
}

function parseDateInput(value: string) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date: Date | null) {
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date | null) {
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span :class="['text-[13px] font-medium', labelClass]">{{ props.label }}</span>

    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
      <OfxDateField
        v-model="startValue"
        label="Start date"
        :input-id="props.inputId ? `${props.inputId}-start` : undefined"
      />

      <div class="hidden h-10 items-center justify-center md:flex">
        <span :class="['inline-flex items-center rounded-[10px] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', connectorClass]">
          to
        </span>
      </div>

      <OfxDateField
        v-model="endValue"
        label="End date"
        :input-id="props.inputId ? `${props.inputId}-end` : undefined"
      />
    </div>

    <div :class="['rounded-[12px] border px-3.5 py-3', summaryClass]">
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="selectedStartDate"
          :class="['inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', dateBadgeClass]"
        >
          Start {{ formatDateLabel(selectedStartDate) }}
        </span>

        <span
          v-if="selectedEndDate"
          :class="['inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', dateBadgeClass]"
        >
          End {{ formatDateLabel(selectedEndDate) }}
        </span>

        <span
          v-if="rangeLengthInDays"
          :class="['inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', rangeLengthBadgeClass]"
        >
          {{ rangeLengthInDays }} days
        </span>
      </div>

      <p :class="['mt-2 text-sm leading-6', summaryTextClass]">
        {{ rangeSummary }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span v-if="props.helpText" :class="['text-xs', helpTextClass]">{{ props.helpText }}</span>

      <button
        v-if="hasAnyDate"
        type="button"
        :class="['inline-flex items-center rounded-[10px] border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition', clearButtonClass]"
        @click="clearRange"
      >
        Clear range
      </button>
    </div>
  </div>
</template>
