<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type SelectValue = string | number;

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: SelectValue | undefined | null;
    options: Array<{ label: string; value: SelectValue }>;
    helpText?: string;
    placeholderLabel?: string;
    showPlaceholderOption?: boolean;
    disabled?: boolean;
    locked?: boolean;
    lockedLabel?: string;
    loading?: boolean;
    loadingLabel?: string;
    maxRenderedOptions?: number;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    helpText: '',
    placeholderLabel: 'Select value',
    showPlaceholderOption: true,
    disabled: false,
    locked: false,
    lockedLabel: 'Auto-fit',
    loading: false,
    loadingLabel: 'Loading values...',
    maxRenderedOptions: 120,
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const displayLabelRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref('');
const dropdownStyle = ref<Record<string, string>>({});
const selectedLabelOverflows = ref(false);
const selectedLabelTooltipVisible = ref(false);
const isLightTheme = computed(() => props.themeMode === 'light');

const placeholderOption = computed(() => props.options.find((option) => option.value === ''));
const syntheticPlaceholderOption = computed(() => (
  props.showPlaceholderOption && !placeholderOption.value && props.options.length
    ? { value: '' as SelectValue, label: props.placeholderLabel }
    : null
));
const resolvedOptions = computed(() => syntheticPlaceholderOption.value ? [syntheticPlaceholderOption.value, ...props.options] : props.options);
const selectedOption = computed(() => resolvedOptions.value.find((option) => String(option.value) === String(props.modelValue ?? '')) ?? null);
const displayLabel = computed(() => (
  props.loading
    ? props.loadingLabel
    : selectedOption.value?.label
      ?? placeholderOption.value?.label
      ?? props.placeholderLabel
      ?? (props.options.length ? props.placeholderLabel : 'No values available')
));
const hasValue = computed(() => props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined);
const isPlaceholderSelected = computed(() => !hasValue.value && Boolean(placeholderOption.value ?? syntheticPlaceholderOption.value));
const showSearch = computed(() => resolvedOptions.value.length > 7);
const isNonInteractive = computed(() => props.disabled || props.locked || props.loading);
const filteredOptions = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return resolvedOptions.value;
  return resolvedOptions.value.filter((option) => option.label.toLowerCase().includes(term));
});
const visibleOptions = computed(() => {
  const renderedOptions = filteredOptions.value.slice(0, props.maxRenderedOptions);

  if (!selectedOption.value || renderedOptions.some((option) => String(option.value) === String(selectedOption.value?.value))) {
    return renderedOptions;
  }

  return [selectedOption.value, ...renderedOptions];
});
const hiddenOptionsCount = computed(() => Math.max(0, filteredOptions.value.length - visibleOptions.value.length));
const labelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/88'));
const triggerBaseClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_10px_20px_rgb(15_23_42_/_0.08)]'
    : 'border-white/10 bg-[color:rgb(8_13_24_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035),0_14px_28px_rgb(0_0_0_/_0.24)]'
));
const dropdownClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgb(15_23_39_/_0.98),rgb(9_14_26_/_0.98))]'
));
const dividerClass = computed(() => (isLightTheme.value ? 'border-[color:var(--ofx-border)]' : 'border-white/8'));
const searchInputClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text)] placeholder:text-[color:var(--ofx-text-subtle)] focus:border-[color:var(--ofx-border-focus)]'
    : 'border-white/8 bg-white/[0.035] text-white/88 placeholder:text-white/34 focus:border-[color:rgb(75_124_255_/_0.58)] focus:bg-white/[0.055]'
));
const tooltipClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] text-[color:var(--ofx-text)]'
    : 'border-white/10 bg-[color:rgb(10_16_29_/_0.98)] text-white/88'
));
const helperClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/56'));

function triggerStateClass() {
  if (props.locked) {
    return isLightTheme.value
      ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.08)] shadow-[inset_0_1px_0_rgb(75_124_255_/_0.1)]'
      : 'cursor-not-allowed border-[color:rgb(75_124_255_/_0.42)] bg-[color:rgb(75_124_255_/_0.10)] shadow-[inset_0_1px_0_rgb(75_124_255_/_0.12)]';
  }

  if (props.loading) {
    return isLightTheme.value
      ? 'cursor-wait border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-subtle)]'
      : 'cursor-wait border-white/8 bg-white/[0.025] text-white/42';
  }

  if (props.disabled) {
    return isLightTheme.value
      ? 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-subtle)]'
      : 'cursor-not-allowed border-white/8 bg-white/[0.025] text-white/32';
  }

  if (open.value) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border-focus)] ring-2 ring-[color:rgb(75_124_255_/_0.14)]'
      : 'border-[color:rgb(75_124_255_/_0.78)] ring-2 ring-[color:rgb(75_124_255_/_0.16)]';
  }

  return isLightTheme.value ? 'hover:border-[color:var(--ofx-border-strong)]' : 'hover:border-white/18';
}

function displayValueClass() {
  if (props.disabled || props.loading) {
    return isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/32';
  }

  if (hasValue.value) {
    return isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/88';
  }

  return isLightTheme.value ? 'text-[color:var(--ofx-text-muted)] italic' : 'text-white/54 italic';
}

function caretContainerClass() {
  if (props.locked) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.1)] text-[color:var(--ofx-text)]'
      : 'border-[color:rgb(75_124_255_/_0.34)] bg-[color:rgb(75_124_255_/_0.12)] text-white/88';
  }

  if (props.loading) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-subtle)]'
      : 'border-white/8 bg-white/[0.025] text-white/42';
  }

  if (props.disabled) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-subtle)]'
      : 'border-white/8 bg-white/[0.025] text-white/30';
  }

  if (open.value) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border-focus)] text-[color:var(--ofx-text)]'
      : 'border-[color:rgb(75_124_255_/_0.58)] text-white/88';
  }

  return isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/10 bg-white/[0.035] text-white/62';
}

function optionClass(option: { value: SelectValue; label: string }) {
  const isSelectedOption = String(option.value) === String(props.modelValue ?? '');

  if (isSelectedOption) {
    if (isPlaceholderOption(option.value)) {
      return isLightTheme.value
        ? 'border border-dashed border-[color:rgb(211_155_42_/_0.34)] bg-[color:rgb(211_155_42_/_0.14)] text-[color:var(--ofx-text-warning)]'
        : 'border border-dashed border-amber-300/30 bg-amber-300/[0.09] text-amber-100/88';
    }

    return isLightTheme.value
      ? 'border border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] text-[color:var(--ofx-text)]'
      : 'border border-[color:rgb(75_124_255_/_0.52)] bg-[color:rgb(75_124_255_/_0.14)] text-white/92';
  }

  if (isPlaceholderOption(option.value)) {
    return isLightTheme.value
      ? 'border border-dashed border-transparent text-[color:var(--ofx-text-muted)] italic hover:border-[color:rgb(211_155_42_/_0.22)] hover:bg-[color:rgb(211_155_42_/_0.08)] hover:text-[color:var(--ofx-text-warning)]'
      : 'border border-dashed border-transparent text-white/56 italic hover:border-amber-300/20 hover:bg-amber-300/[0.06] hover:text-amber-100/84';
  }

  return isLightTheme.value
    ? 'text-[color:var(--ofx-text-muted)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'text-white/74 hover:bg-white/[0.065] hover:text-white/94';
}

function toggleOpen() {
  if (isNonInteractive.value) return;
  hideSelectedLabelTooltip();
  open.value = !open.value;
}

function close() {
  open.value = false;
  query.value = '';
}

function selectOption(value: SelectValue) {
  if (isNonInteractive.value) return;
  emit('update:modelValue', String(value));
  close();
}

function isPlaceholderOption(value: SelectValue) {
  return String(value) === '';
}

function measureSelectedLabelOverflow() {
  const displayLabelElement = displayLabelRef.value;
  selectedLabelOverflows.value = Boolean(displayLabelElement && displayLabelElement.scrollWidth > displayLabelElement.clientWidth + 1);
}

async function showSelectedLabelTooltip() {
  await nextTick();
  measureSelectedLabelOverflow();
  selectedLabelTooltipVisible.value = selectedLabelOverflows.value;
}

function hideSelectedLabelTooltip() {
  selectedLabelTooltipVisible.value = false;
}

function handleDocumentClick(event: MouseEvent) {
  if (!rootRef.value) return;
  const target = event.target as Node | null;
  const clickedInsideRoot = Boolean(target && rootRef.value.contains(target));
  const clickedInsideDropdown = Boolean(target && dropdownRef.value?.contains(target));

  if (target && !clickedInsideRoot && !clickedInsideDropdown) {
    close();
  }
}

function syncDropdownPosition() {
  if (!open.value || !triggerRef.value || !dropdownRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const gap = 4;
  const viewportPadding = 12;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom - viewportPadding - gap;
  const spaceAbove = rect.top - viewportPadding - gap;
  const panelPadding = 16;
  const searchHeight = searchRef.value?.offsetHeight ?? 0;
  const listHeight = listRef.value?.scrollHeight ?? 0;
  const naturalHeight = panelPadding + searchHeight + listHeight;
  const contentHeight = Math.min(naturalHeight, 360);
  const shouldOpenUpwards = spaceBelow < contentHeight && spaceAbove > spaceBelow;
  const availableHeight = Math.max(
    96,
    Math.min(contentHeight, shouldOpenUpwards ? spaceAbove : spaceBelow),
  );

  dropdownStyle.value = {
    top: shouldOpenUpwards ? `${Math.max(viewportPadding, rect.top - gap - availableHeight)}px` : `${rect.bottom + gap}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${availableHeight}px`,
  };
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
  window.addEventListener('resize', syncDropdownPosition);
  window.addEventListener('resize', measureSelectedLabelOverflow);
  window.addEventListener('scroll', syncDropdownPosition, true);
  measureSelectedLabelOverflow();
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
  window.removeEventListener('resize', syncDropdownPosition);
  window.removeEventListener('resize', measureSelectedLabelOverflow);
  window.removeEventListener('scroll', syncDropdownPosition, true);
});

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  syncDropdownPosition();
});

watch(
  () => [query.value, filteredOptions.value.length],
  async () => {
    if (!open.value) return;
    await nextTick();
    syncDropdownPosition();
  },
);

watch(
  displayLabel,
  async () => {
    hideSelectedLabelTooltip();
    await nextTick();
    measureSelectedLabelOverflow();
  },
);

watch(
  isNonInteractive,
  (disabled) => {
    if (disabled) {
      close();
    }
  },
);
</script>

<template>
  <div ref="rootRef" class="relative flex min-w-0 flex-col gap-2">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <span class="min-w-0 truncate text-[13px] font-medium" :class="labelClass">{{ props.label }}</span>
      <span
        v-if="props.locked"
        class="inline-flex items-center rounded-full border border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text)]"
      >
        {{ props.lockedLabel }}
      </span>
    </div>

    <div ref="triggerRef" class="relative min-w-0">
      <div
        class="flex h-10 min-w-0 cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-3.5 text-left transition"
        :class="[triggerBaseClass, triggerStateClass()]"
        :aria-expanded="open"
        :aria-disabled="isNonInteractive"
        :aria-busy="props.loading"
        :aria-label="displayLabel"
        role="button"
        :tabindex="isNonInteractive ? -1 : 0"
        @click="toggleOpen"
        @mouseenter="showSelectedLabelTooltip"
        @mouseleave="hideSelectedLabelTooltip"
        @focusin="showSelectedLabelTooltip"
        @focusout="hideSelectedLabelTooltip"
        @keydown.enter.prevent="toggleOpen"
        @keydown.space.prevent="toggleOpen"
        @keydown.esc.prevent="close"
      >
        <div class="flex min-w-0 flex-1 items-center text-sm font-medium" :class="displayValueClass()">
          <span v-if="isPlaceholderSelected && !props.loading" class="mr-2 inline-flex rounded-full border border-[color:rgb(211_155_42_/_0.32)] bg-[color:rgb(211_155_42_/_0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text-warning)] not-italic">
            Not Selected
          </span>
          <span ref="displayLabelRef" class="min-w-0 flex-1 truncate">{{ displayLabel }}</span>
        </div>
        <span
          class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[10px] border transition"
          :class="caretContainerClass()"
        >
          <svg v-if="props.loading" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 animate-spin" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="26 14" />
          </svg>
          <svg v-else viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>

      <div
        v-if="selectedLabelTooltipVisible"
        class="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-[10000] max-w-[min(520px,calc(100vw-2rem))] rounded-[8px] border px-3 py-2 text-xs font-medium leading-5 shadow-[var(--ofx-shadow-lg)]"
        :class="tooltipClass"
        role="tooltip"
      >
        {{ displayLabel }}
      </div>

      <Teleport to="body">
        <div
          v-if="open"
          ref="dropdownRef"
          class="fixed z-[9999] flex flex-col overflow-hidden rounded-[12px] border p-2 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl"
          :class="dropdownClass"
          :style="dropdownStyle"
        >
          <div v-if="showSearch" ref="searchRef" class="border-b px-1 pb-2" :class="dividerClass">
            <input
              v-model="query"
              type="search"
              placeholder="Filter values"
              class="h-8 w-full rounded-[10px] border px-3 text-sm outline-none"
              :class="searchInputClass"
            />
          </div>

          <div ref="listRef" class="min-h-0 flex-1 overflow-auto px-1 py-2">
            <button
              v-for="option in visibleOptions"
              :key="String(option.value)"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition"
              :class="optionClass(option)"
              @click="selectOption(option.value)"
            >
              <span class="min-w-0 flex-1 truncate" :title="option.label">{{ option.label }}</span>
              <span
                v-if="String(option.value) === String(props.modelValue ?? '')"
                class="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ofx-accent)]"
              >
                Selected
              </span>
            </button>

            <div v-if="filteredOptions.length === 0" class="px-2 py-2 text-sm" :class="helperClass">
              {{ resolvedOptions.length ? 'No values match the current search.' : 'No values are available for this field yet.' }}
            </div>

            <div v-else-if="hiddenOptionsCount > 0" class="px-3 py-2 text-xs" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/42'">
              {{ hiddenOptionsCount }} more values. Use the filter to narrow the list.
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <span v-if="props.helpText" class="text-xs" :class="helperClass">{{ props.helpText }}</span>
  </div>
</template>
