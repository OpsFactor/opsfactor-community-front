<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import OfxDateField from './OfxDateField.vue';
import OfxSelectField from './OfxSelectField.vue';

/** Option accepted by the shared select-field primitive. */
interface OfxSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    bucketSize?: string | null;
    yearRangePast?: number;
    yearRangeFuture?: number;
  }>(),
  {
    bucketSize: 'Daily',
    yearRangePast: 6,
    yearRangeFuture: 4,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const dailyValue = ref('');
const selectedYear = ref('');
const selectedMonth = ref('');
const selectedWeek = ref('');

const resolvedMode = computed<PeriodMode>(() => resolvePeriodMode(props.bucketSize));
const fallbackDate = computed(() => parseDate(props.modelValue) ?? new Date());

const yearOptions = computed<OfxSelectOption[]>(() => {
  const baseYear = resolvedMode.value === 'weekly'
    ? getIsoWeekInfo(fallbackDate.value).year
    : fallbackDate.value.getFullYear();
  const startYear = baseYear - props.yearRangePast;
  const endYear = baseYear + props.yearRangeFuture;

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
    const year = String(startYear + index);
    return { value: year, label: year };
  });
});

const monthOptions = computed<OfxSelectOption[]>(() =>
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      value: String(month),
      label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2026, index, 1)),
    };
  }),
);

const weekOptions = computed<OfxSelectOption[]>(() => {
  const year = Number(selectedYear.value);
  if (!Number.isFinite(year)) return [];

  return Array.from({ length: getIsoWeeksInYear(year) }, (_, index) => {
    const week = index + 1;
    const startDate = getDateFromIsoWeek(year, week);
    return {
      value: String(week),
      label: `W${String(week).padStart(2, '0')} - starts ${toDateInputValue(startDate)}`,
    };
  });
});

watch(
  () => [props.modelValue, resolvedMode.value] as const,
  () => {
    const currentDate = parseDate(props.modelValue) ?? new Date();
    dailyValue.value = toDateInputValue(currentDate);

    if (resolvedMode.value === 'weekly') {
      const isoWeek = getIsoWeekInfo(currentDate);
      selectedYear.value = String(isoWeek.year);
      selectedWeek.value = String(isoWeek.week);
      return;
    }

    selectedYear.value = String(currentDate.getFullYear());
    selectedMonth.value = String(currentDate.getMonth() + 1);
  },
  { immediate: true },
);

watch(
  () => [selectedYear.value, resolvedMode.value] as const,
  () => {
    if (resolvedMode.value !== 'weekly') return;
    if (!weekOptions.value.some((option) => option.value === selectedWeek.value)) {
      selectedWeek.value = weekOptions.value[0]?.value ?? '1';
    }
  },
  { immediate: true },
);

watch(
  () => [dailyValue.value, selectedYear.value, selectedMonth.value, selectedWeek.value, resolvedMode.value] as const,
  () => {
    const normalizedValue = buildNormalizedValue();
    if (normalizedValue && normalizedValue !== props.modelValue) {
      emit('update:modelValue', normalizedValue);
    }
  },
);

function buildNormalizedValue() {
  if (resolvedMode.value === 'daily') {
    return dailyValue.value || toDateInputValue(new Date());
  }

  const year = Number(selectedYear.value);
  if (!Number.isFinite(year)) return '';

  if (resolvedMode.value === 'yearly') {
    return toDateInputValue(new Date(year, 0, 1));
  }

  if (resolvedMode.value === 'monthly') {
    const month = Number(selectedMonth.value);
    if (!Number.isFinite(month)) return '';
    return toDateInputValue(new Date(year, month - 1, 1));
  }

  const week = Number(selectedWeek.value);
  if (!Number.isFinite(week)) return '';
  return toDateInputValue(getDateFromIsoWeek(year, week));
}

function resolvePeriodMode(bucketSize?: string | null): PeriodMode {
  const normalized = normalizeBucketLabel(bucketSize);
  if (normalized.includes('year') || normalized.includes('annual') || normalized.includes('anual')) return 'yearly';
  if (normalized.includes('month') || normalized.includes('mens')) return 'monthly';
  if (normalized.includes('week') || normalized.includes('seman')) return 'weekly';
  return 'daily';
}

function normalizeBucketLabel(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getIsoWeekInfo(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setHours(0, 0, 0, 0);

  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() + 3 - day);

  const isoYear = copy.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() + 3 - firstThursdayDay);

  const diffInDays = Math.round((copy.getTime() - firstThursday.getTime()) / 86400000);
  return {
    year: isoYear,
    week: 1 + Math.floor(diffInDays / 7),
  };
}

function getIsoWeeksInYear(year: number) {
  return getIsoWeekInfo(new Date(year, 11, 28)).week;
}

function getDateFromIsoWeek(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const weekOneStart = new Date(year, 0, 4 - jan4Day);
  weekOneStart.setDate(weekOneStart.getDate() + (week - 1) * 7);
  return weekOneStart;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-[13px] font-medium text-[color:var(--ofx-text)]">{{ props.label }}</span>

    <OfxDateField
      v-if="resolvedMode === 'daily'"
      v-model="dailyValue"
    />

    <div v-else-if="resolvedMode === 'yearly'" class="grid gap-3 md:grid-cols-[220px]">
      <OfxSelectField
        v-model="selectedYear"
        label="Year"
        :options="yearOptions"
        placeholder-label="Select year"
      />
    </div>

    <div v-else-if="resolvedMode === 'monthly'" class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <OfxSelectField
        v-model="selectedMonth"
        label="Month"
        :options="monthOptions"
        placeholder-label="Select month"
      />
      <OfxSelectField
        v-model="selectedYear"
        label="Year"
        :options="yearOptions"
        placeholder-label="Select year"
      />
    </div>

    <div v-else class="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
      <OfxSelectField
        v-model="selectedYear"
        label="ISO Year"
        :options="yearOptions"
        placeholder-label="Select ISO year"
      />
      <OfxSelectField
        v-model="selectedWeek"
        label="ISO Week"
        :options="weekOptions"
        placeholder-label="Select ISO week"
      />
    </div>
  </div>
</template>
