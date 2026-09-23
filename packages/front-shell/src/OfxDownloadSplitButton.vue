<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import OfxActionLabel from './OfxActionLabel.vue';

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
    processing?: boolean;
    processingLabel?: string;
    selectorVisible?: boolean;
    /** The host-owned visual mode; Community remains light by default. */
    themeMode?: 'light' | 'dark';
  }>(),
  {
    actionLabel: 'Download',
    actionVariant: 'default',
    disabled: false,
    processing: false,
    processingLabel: 'Processing…',
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
const selectorRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

const selectedOption = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? props.options[0] ?? null,
);

const isLightTheme = computed(() => props.themeMode === 'light');

const transitionClass = 'min-h-[38px] transition-colors duration-150';

/** Keep the action and format selector visibly connected in either theme. */
const actionButtonClass = computed(() => [
  'ofx-download-command',
  props.selectorVisible ? 'rounded-l-lg' : 'rounded-lg',
  props.actionVariant === 'accent' ? 'is-primary' : '',
]);
const selectorButtonClass = computed(() => 'ofx-download-command ofx-download-selector rounded-r-lg');

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

/** Positions the format menu outside overflow-clipped cards and inside the viewport. */
function syncMenuPosition() {

  if (!menuOpen.value || !selectorRef.value || !menuRef.value) return;

  const triggerRect = selectorRef.value.getBoundingClientRect();
  const menuWidth = menuRef.value.offsetWidth;
  const menuHeight = menuRef.value.offsetHeight;
  const gap = 6;
  const viewportPadding = 12;
  const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding - gap;
  const spaceAbove = triggerRect.top - viewportPadding - gap;
  const openUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const availableHeight = Math.max(80, Math.min(menuHeight, openUpwards ? spaceAbove : spaceBelow));
  const left = Math.max(
    viewportPadding,
    Math.min(triggerRect.right - menuWidth, window.innerWidth - viewportPadding - menuWidth),
  );

  menuStyle.value = {
    top: openUpwards
      ? `${Math.max(viewportPadding, triggerRect.top - gap - availableHeight)}px`
      : `${triggerRect.bottom + gap}px`,
    left: `${left}px`,
    maxHeight: `${availableHeight}px`,
  };

}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
  window.addEventListener('resize', syncMenuPosition);
  window.addEventListener('scroll', syncMenuPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
  window.removeEventListener('resize', syncMenuPosition);
  window.removeEventListener('scroll', syncMenuPosition, true);
});

watch(menuOpen, async (isOpen) => {

  if (!isOpen) return;
  await nextTick();
  syncMenuPosition();

});

watch(() => props.processing, (isProcessing) => {

  if (isProcessing) {
    menuOpen.value = false;
  }

});
</script>

<template>
  <div ref="rootRef" class="ofx-download-split relative flex items-center">
    <button
      :class="actionButtonClass"
      :disabled="props.disabled || props.processing"
      @click="emit('action')"
    >
      <span class="inline-flex items-center gap-2">
        <span v-if="!props.processing" aria-hidden="true">↓</span>
        <OfxActionLabel
          :label="props.actionLabel"
          :processing="props.processing"
          :processing-label="props.processingLabel"
        />
      </span>
    </button>

    <button
      v-if="props.selectorVisible"
      ref="selectorRef"
      :class="selectorButtonClass"
      :disabled="props.disabled || props.processing || props.options.length <= 1"
      @click="menuOpen = !menuOpen"
    >
      <span class="inline-flex items-center gap-2">
        <span>{{ selectedOption?.label ?? 'Select' }}</span>
        <span aria-hidden="true">▾</span>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="props.selectorVisible && menuOpen"
        ref="menuRef"
        :class="['fixed z-[9999] min-w-[120px] overflow-y-auto rounded-[10px] border p-1 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl', menuClass]"
        :style="menuStyle"
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
    </Teleport>
  </div>
</template>

<style scoped>
.ofx-download-command {
  min-height: 2.5rem;
  padding: .5rem .875rem;
  border: 1px solid var(--ofx-border-strong);
  background: color-mix(in srgb, var(--ofx-text) 12%, var(--ofx-surface-elevated));
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
}
.ofx-download-selector { border-left: 0; }
.ofx-download-command.is-primary { background: color-mix(in srgb, var(--ofx-primary) 75%, #16357a); color: white; }
.ofx-download-command:hover:not(:disabled) { filter: brightness(1.1); }
.ofx-download-command:focus-visible { outline: 2px solid var(--ofx-accent); outline-offset: 2px; }
.ofx-download-command:disabled { opacity: .6; cursor: not-allowed; }
</style>
