<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'compact' | 'regular';
  type?: 'button' | 'submit' | 'reset';
}>(), {
  variant: 'secondary',
  size: 'regular',
  type: 'button',
});

const buttonClass = computed(() => [
  `ofx-button--${props.variant}`,
  `ofx-button--${props.size}`,
]);
</script>

<template>
  <button class="ofx-button" :class="buttonClass" :type="type">
    <slot />
  </button>
</template>

<style scoped>
.ofx-button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: .7rem;
  cursor: pointer;
  display: inline-flex;
  font-size: .875rem;
  font-weight: 650;
  justify-content: center;
  line-height: 1;
  min-width: max-content;
  transition: border-color 150ms ease, box-shadow 150ms ease, filter 150ms ease, transform 150ms ease;
}
.ofx-button--regular { height: 2.5rem; padding: 0 1rem; }
.ofx-button--compact { height: 2rem; padding: 0 .72rem; font-size: .78rem; }
.ofx-button--secondary {
  background: linear-gradient(180deg, var(--ofx-surface-overlay), var(--ofx-surface));
  border-color: var(--ofx-border-strong);
  color: var(--ofx-text);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .42), 0 5px 14px rgb(15 23 42 / .06);
}
.ofx-button--primary {
  background: linear-gradient(135deg, color-mix(in srgb, var(--ofx-accent) 88%, #244ea3), var(--ofx-accent));
  color: white;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--ofx-accent) 22%, transparent);
}
.ofx-button--danger {
  background: color-mix(in srgb, var(--ofx-text-danger) 6%, var(--ofx-surface));
  border-color: color-mix(in srgb, var(--ofx-text-danger) 42%, var(--ofx-border));
  color: var(--ofx-text-danger);
}
.ofx-button--ghost { background: transparent; border-color: var(--ofx-border); color: var(--ofx-text-muted); }
.ofx-button:hover:not(:disabled) { filter: brightness(1.025); transform: translateY(-1px); }
.ofx-button:focus-visible { outline: 2px solid var(--ofx-accent); outline-offset: 2px; }
.ofx-button:disabled { cursor: not-allowed; filter: saturate(.6); opacity: .46; transform: none; }
</style>
