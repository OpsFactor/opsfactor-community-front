<script setup lang="ts">
defineProps<{
  label: string;
  description?: string;
  modelValue?: boolean | null;
  disabled?: boolean;
  locked?: boolean;
  lockedLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <label
    class="flex items-start justify-between gap-4 rounded-[14px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_10px_20px_rgb(15_23_42_/_0.08)] transition"
    :class="locked ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.08)] shadow-[inset_0_1px_0_rgb(75_124_255_/_0.1),0_10px_20px_rgb(15_23_42_/_0.08)]' : disabled ? 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]' : 'hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)]'"
  >
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <div class="text-sm font-semibold text-[color:var(--ofx-text)]">{{ label }}</div>
        <span v-if="locked" class="inline-flex items-center rounded-full border border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text)]">{{ lockedLabel ?? 'Auto-fit' }}</span>
      </div>
      <p v-if="description" class="text-xs leading-5 text-[color:var(--ofx-text-muted)]">{{ description }}</p>
    </div>
    <button
      type="button"
      :disabled="disabled || locked"
      class="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition"
      :class="locked ? (modelValue ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.28)]' : 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]') : disabled ? (modelValue ? 'cursor-not-allowed border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.18)]' : 'cursor-not-allowed border-[color:var(--ofx-border)] bg-[color:var(--ofx-muted)]') : (modelValue ? 'border-[color:var(--ofx-border-selected)] bg-[color:var(--ofx-accent)] shadow-[0_10px_22px_rgb(33_71_160_/_0.2)]' : 'border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-muted)]')"
      @click="locked || disabled ? undefined : emit('update:modelValue', !modelValue)"
    >
      <span class="inline-flex h-5 w-5 rounded-full bg-[color:var(--ofx-surface-overlay)] shadow-[0_6px_20px_rgb(15_23_42_/_0.22)] transition-transform" :class="[modelValue ? 'translate-x-[24px]' : 'translate-x-[3px]', locked || disabled ? 'opacity-70' : '']" />
    </button>
  </label>
</template>
