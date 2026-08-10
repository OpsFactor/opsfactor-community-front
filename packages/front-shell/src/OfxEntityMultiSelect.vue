<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { OfxSelectOption } from './OfxSelectOption';
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';
import OfxLockedControlIcon from './OfxLockedControlIcon.vue';

const model = defineModel<string[]>({ default: [] });

const props = withDefaults(
  defineProps<{
    label: string;
    options: OfxSelectOption[];
    placeholder?: string;
    helpText?: string;
    inputId?: string;
    disabled?: boolean;
    requiredEdition?: 'Enterprise' | 'Pro / Enterprise';
    /** The host-owned visual mode; Community remains light by default. */
    themeMode?: 'light' | 'dark';
  }>(),
  {
    placeholder: 'Select values',
    helpText: '',
    inputId: undefined,
    disabled: false,
    themeMode: 'light',
  },
);

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref('');
const dropdownStyle = ref<Record<string, string>>({});
const isLightTheme = computed(() => props.themeMode === 'light');
const isEditionLocked = computed(() => props.disabled && Boolean(props.requiredEdition));

const filteredOptions = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return props.options;
  return props.options.filter((option) => option.label.toLowerCase().includes(term));
});

const selectedOptions = computed(() => props.options.filter((option) => model.value.includes(option.value)));
const summaryText = computed(() => {
  if (!selectedOptions.value.length) {
    return props.placeholder;
  }
  if (selectedOptions.value.length <= 2) {
    return selectedOptions.value.map((option) => option.label).join(', ');
  }
  return `${selectedOptions.value.length} selected`;
});
const triggerAriaLabel = computed(() => (
  isEditionLocked.value
    ? `${props.label}: ${summaryText.value}. Locked control.`
    : `${props.label}: ${summaryText.value}`
));

const labelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/88'));
const triggerBaseClass = computed(() => (
  isLightTheme.value
    ? 'bg-[color:var(--ofx-surface)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_10px_20px_rgb(15_23_42_/_0.08)]'
    : 'bg-[color:rgb(8_13_24_/_0.98)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035),0_14px_28px_rgb(0_0_0_/_0.24)]'
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
const summaryClass = computed(() => {
  if (isEditionLocked.value) {
    return selectedOptions.value.length
      ? 'text-[color:var(--ofx-text)]'
      : 'text-[color:var(--ofx-text-muted)]';
  }

  if (props.disabled) {
    return isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/32';
  }

  if (selectedOptions.value.length) {
    return isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/88';
  }

  return isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/54';
});
const clearButtonClass = computed(() => (
  isLightTheme.value
    ? 'text-[color:var(--ofx-text-muted)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'text-white/54 hover:bg-white/[0.07] hover:text-white/86'
));
const caretClass = computed(() => (
  isEditionLocked.value
    ? 'text-[color:var(--ofx-text-muted)]'
    : props.disabled
    ? isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/28'
    : isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/62'
));
const optionClass = computed(() => (
  isLightTheme.value
    ? 'text-[color:var(--ofx-text-muted)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'text-white/74 hover:bg-white/[0.065] hover:text-white/94'
));
const emptyClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/56'));

function triggerStateClass() {
  if (isEditionLocked.value) {
    return 'cursor-not-allowed border-[color:var(--ofx-border-strong)] bg-[linear-gradient(180deg,var(--ofx-surface-elevated),var(--ofx-muted))] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7)]';
  }

  if (props.disabled) {
    return isLightTheme.value
      ? 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]'
      : 'cursor-not-allowed border-white/8 bg-white/[0.025]';
  }

  if (open.value) {
    return isLightTheme.value
      ? 'cursor-pointer border-[color:var(--ofx-border-focus)] ring-2 ring-[color:rgb(75_124_255_/_0.14)]'
      : 'cursor-pointer border-[color:rgb(75_124_255_/_0.78)] ring-2 ring-[color:rgb(75_124_255_/_0.16)]';
  }

  return isLightTheme.value
    ? 'cursor-pointer border-[color:var(--ofx-border)] hover:border-[color:var(--ofx-border-strong)]'
    : 'cursor-pointer border-white/10 hover:border-white/18';
}

function checkboxClass(value: string) {
  if (isSelected(value)) {
    return isLightTheme.value
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:var(--ofx-accent)] text-[color:var(--ofx-accent-foreground)]'
      : 'border-[color:rgb(108_143_255_/_0.72)] bg-[color:rgb(75_124_255_/_0.88)] text-white';
  }

  return isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-transparent'
    : 'border-white/12 bg-white/[0.025] text-transparent';
}

function toggleOpen() {
  if (props.disabled) return;
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function clearSelection() {
  if (props.disabled) return;
  model.value = [];
}

function toggleOption(value: string) {
  if (props.disabled) return;
  if (model.value.includes(value)) {
    model.value = model.value.filter((item) => item !== value);
    return;
  }
  model.value = [...model.value, value];
}

function isSelected(value: string) {
  return model.value.includes(value);
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
  const contentHeight = Math.min(naturalHeight, 320);
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
  window.addEventListener('scroll', syncDropdownPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
  window.removeEventListener('resize', syncDropdownPosition);
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
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      close();
    }
  },
);
</script>

<template>
  <div ref="rootRef" class="relative flex min-w-0 flex-col gap-2">
    <label v-if="props.inputId" :for="props.inputId" class="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium" :class="labelClass"><span class="truncate">{{ props.label }}</span><OfxEditionAvailabilityMark v-if="props.requiredEdition" :edition-label="props.requiredEdition" :theme-mode="props.themeMode" :size="12" /></label>
    <span v-else class="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium" :class="labelClass"><span class="truncate">{{ props.label }}</span><OfxEditionAvailabilityMark v-if="props.requiredEdition" :edition-label="props.requiredEdition" :theme-mode="props.themeMode" :size="12" /></span>

    <div ref="triggerRef" class="relative min-w-0">
      <div
        :id="props.inputId"
        class="flex h-10 min-w-0 items-center justify-between gap-3 rounded-[12px] border px-3.5 text-left transition"
        :class="[triggerBaseClass, triggerStateClass()]"
        :data-locked="isEditionLocked ? 'true' : undefined"
        :aria-expanded="open"
        :aria-disabled="props.disabled"
        :aria-label="triggerAriaLabel"
        role="button"
        :tabindex="props.disabled ? -1 : 0"
        @click="toggleOpen"
        @keydown.enter.prevent="toggleOpen"
        @keydown.space.prevent="toggleOpen"
      >
        <div class="min-w-0 flex-1 truncate text-sm font-medium" :class="summaryClass">
          {{ summaryText }}
        </div>
        <div class="flex items-center gap-2 text-xs">
          <button
            v-if="selectedOptions.length && !props.disabled"
            type="button"
            class="rounded px-1.5 py-0.5"
            :class="clearButtonClass"
            @click.stop="clearSelection"
          >
            Clear
          </button>
          <span
            v-if="isEditionLocked"
            class="-my-px -mr-3.5 flex h-10 w-10 items-center justify-center rounded-r-[11px] border-l border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)]"
            :class="caretClass"
          >
            <OfxLockedControlIcon />
          </span>
          <span v-else :class="caretClass">{{ open ? '▴' : '▾' }}</span>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="open"
          ref="dropdownRef"
          class="fixed z-[9999] flex flex-col overflow-hidden rounded-[12px] border p-2 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl"
          :class="dropdownClass"
          :style="dropdownStyle"
        >
          <div ref="searchRef" class="border-b px-1 pb-2" :class="dividerClass">
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
              v-for="option in filteredOptions"
              :key="option.value"
              type="button"
              class="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm transition"
              :class="optionClass"
              @click="toggleOption(option.value)"
            >
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border text-[10px] font-bold leading-none transition-colors"
                :class="checkboxClass(option.value)"
              >✓</span>
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            </button>

            <div v-if="filteredOptions.length === 0" class="px-2 py-2 text-sm" :class="emptyClass">
              No values match the current search.
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <span v-if="props.helpText" class="text-xs" :class="emptyClass">{{ props.helpText }}</span>
  </div>
</template>
