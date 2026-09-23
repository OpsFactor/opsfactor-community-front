<script setup lang="ts">
import { computed } from 'vue';

/** Creation, duplication, saving, and removal have distinct action colors across the editions. */
const props = withDefaults(defineProps<{
  icon?: 'new' | 'save' | 'delete' | 'run' | 'filter' | 'refresh' | 'download' | 'edit' | 'open' | 'add' | 'close' | 'check' | 'upload' | 'copy';
  variant?: 'primary' | 'create' | 'copy' | 'secondary' | 'danger' | 'ghost' | 'filter';
  size?: 'compact' | 'regular' | 'table';
  type?: 'button' | 'submit' | 'reset';
}>(), {
  variant: 'secondary',
  size: 'regular',
  type: 'button',
});

/** Decorative action icons complement visible labels without duplicating accessible names. */
const iconPaths = {
  "new": "M12 5v14M5 12h14",
  "add": "M12 5v14M5 12h14",
  "save": "M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8",
  "delete": "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  "run": "m8 4 12 8-12 8V4Z",
  "filter": "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  "refresh": "M20 7a9 9 0 1 0 1 7M20 3v5h-5",
  "download": "M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6",
  "upload": "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  "edit": "m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z",
  "open": "M14 3h7v7M21 3l-11 11M10 5H3v16h16v-7",
  "close": "m6 6 12 12M6 18 18 6",
  "check": "m4 12 5 5L20 6",
  "copy": "M9 9h12v12H9V9ZM5 15H3V3h12v2"
};

const buttonClass = computed(() => [
  `ofx-button--${props.variant}`,
  `ofx-button--${props.size}`,
]);
</script>

<template>
  <button class="ofx-button" :class="buttonClass" :type="type">
    <svg v-if="icon" class="ofx-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="iconPaths[icon]" /></svg>
    <slot />
  </button>
</template>

<style scoped>
.ofx-button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: .5rem;
  cursor: pointer;
  display: inline-flex;
  font-size: .875rem;
  font-weight: 650;
  justify-content: center;
  gap: .5rem;
  vertical-align: middle;
  line-height: 1.25;
  min-width: 0;
  max-width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease, filter 150ms ease, transform 150ms ease;
}
.ofx-button__icon { width: 1rem; height: 1rem; flex: 0 0 auto; }
.ofx-button--regular { min-height: 2.5rem; padding: .5rem .875rem; }
.ofx-button--compact { min-height: 2rem; padding: .35rem .7rem; font-size: .78rem; }
.ofx-button--table { height: 1.5rem; padding: 0 .65rem; font-size: .75rem; border-radius: .4rem; }
.ofx-button--secondary {
  background: color-mix(in srgb, var(--ofx-text) 12%, var(--ofx-surface-elevated));
  border-color: var(--ofx-border-strong);
  color: var(--ofx-text);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .08);
}
.ofx-button--primary {
  background: color-mix(in srgb, var(--ofx-primary) 75%, #16357a);
  color: white;
  border-color: color-mix(in srgb, var(--ofx-primary) 85%, #16357a);
  box-shadow: 0 1px 2px rgb(0 0 0 / .12);
}
.ofx-button--create {
  background: #16774a;
  border-color: #11623c;
  color: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / .12);
}
.ofx-button--copy {
  background: #70d49b;
  border-color: #56bd83;
  color: #10321f;
  box-shadow: 0 1px 2px rgb(0 0 0 / .12);
}
.ofx-button--danger {
  background: #b63d4e;
  border-color: #943142;
  color: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / .12);
}
.ofx-button--filter {
  background: color-mix(in srgb, #169aa6 24%, var(--ofx-surface-elevated));
  border-color: color-mix(in srgb, #169aa6 65%, var(--ofx-border-strong));
  color: var(--ofx-text);
}
.ofx-button--ghost { background: var(--ofx-surface-elevated); border-color: var(--ofx-border); color: var(--ofx-text-muted); }
.ofx-button:hover:not(:disabled) { filter: brightness(1.12); }
.ofx-button:focus-visible { outline: 2px solid var(--ofx-accent); outline-offset: 2px; }
.ofx-button:disabled { cursor: not-allowed; filter: saturate(.6); opacity: .6; transform: none; }
</style>
