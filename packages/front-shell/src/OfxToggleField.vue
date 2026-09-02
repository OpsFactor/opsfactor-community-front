<script setup lang="ts">
import { computed } from 'vue';
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';
import OfxLockedControlIcon from './OfxLockedControlIcon.vue';

const props = defineProps<{
  label: string;
  description?: string;
  modelValue?: boolean | null;
  disabled?: boolean;
  locked?: boolean;
  lockedLabel?: string;
  lockedTone?: 'accent' | 'neutral';
  requiredEdition?: 'Enterprise' | 'Pro / Enterprise';
  themeMode?: 'light' | 'dark';
}>();

const lockedEdition = computed<'Enterprise' | 'Pro / Enterprise' | null>(() => {

  if (!props.locked) return null;
  if (/^enterprise$/i.test(props.lockedLabel ?? '')) return 'Enterprise';
  if (/^pro\s*\/\s*enterprise$/i.test(props.lockedLabel ?? '')) return 'Pro / Enterprise';
  return null;

});
const isLockedVisual = computed(() => props.locked || Boolean(props.disabled && props.requiredEdition));

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <label
    class="flex items-start justify-between gap-4 rounded-[14px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_10px_20px_rgb(15_23_42_/_0.08)] transition"
    :class="isLockedVisual ? 'cursor-not-allowed border-[color:var(--ofx-border-strong)] bg-[linear-gradient(180deg,var(--ofx-surface-elevated),var(--ofx-muted))] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7),0_10px_20px_rgb(15_23_42_/_0.08)]' : disabled ? 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]' : 'hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)]'"
  >
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <div class="text-sm font-semibold text-[color:var(--ofx-text)]">{{ label }}</div>
        <OfxEditionAvailabilityMark v-if="requiredEdition" :edition-label="requiredEdition" :theme-mode="themeMode ?? 'light'" :size="12" />
        <OfxEditionAvailabilityMark v-if="lockedEdition" :edition-label="lockedEdition" :theme-mode="themeMode ?? 'light'" :size="12" />
        <span
          v-else-if="locked"
          class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          :class="lockedTone === 'neutral' ? 'border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-muted)]' : 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] text-[color:var(--ofx-text)]'"
        >{{ lockedLabel ?? 'Auto-fit' }}</span>
      </div>
      <p v-if="description" class="text-xs leading-5 text-[color:var(--ofx-text-muted)]">{{ description }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <span
        v-if="isLockedVisual"
        class="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)] text-[color:var(--ofx-text-muted)]"
      >
        <OfxLockedControlIcon />
      </span>
      <button
        type="button"
        :disabled="disabled || locked"
        :data-locked="isLockedVisual ? 'true' : undefined"
        :aria-label="isLockedVisual ? `${label}: ${modelValue ? 'On' : 'Off'}, locked` : label"
        class="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition"
        :class="isLockedVisual ? (modelValue ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.28)]' : 'cursor-not-allowed border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)]') : disabled ? (modelValue ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.18)]' : 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]') : (modelValue ? 'border-[color:var(--ofx-border-selected)] bg-[color:var(--ofx-accent)] shadow-[0_10px_22px_rgb(33_71_160_/_0.2)]' : 'border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)]')"
        @click="locked || disabled ? undefined : emit('update:modelValue', !modelValue)"
      >
        <span class="inline-flex h-5 w-5 rounded-full bg-[color:var(--ofx-surface-overlay)] shadow-[0_6px_20px_rgb(15_23_42_/_0.22)] transition-transform" :class="[modelValue ? 'translate-x-[24px]' : 'translate-x-[3px]', locked || disabled ? 'opacity-70' : '']" />
      </button>
    </div>
  </label>
</template>
