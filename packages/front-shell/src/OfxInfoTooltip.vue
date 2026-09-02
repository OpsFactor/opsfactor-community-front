<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  text: string;
}>();

const isOpen = ref(false);
</script>

<template>
  <span class="relative inline-flex">
    <button
      type="button"
      class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--ofx-border-strong)] text-[10px] font-bold text-[color:var(--ofx-text-muted)] outline-none transition hover:border-[color:var(--ofx-border-focus)] hover:text-[color:var(--ofx-text)] focus-visible:ring-2 focus-visible:ring-[color:rgb(75_124_255_/_0.28)]"
      aria-label="More information"
      @mouseenter="isOpen = true"
      @mouseleave="isOpen = false"
      @focus="isOpen = true"
      @blur="isOpen = false"
      @click.prevent="isOpen = !isOpen"
    >
      i
    </button>
    <span
      v-if="isOpen"
      role="tooltip"
      class="absolute left-0 top-6 z-30 w-72 rounded-[10px] border border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-surface-overlay)] px-3 py-2 text-xs font-normal leading-5 text-[color:var(--ofx-text)] shadow-[var(--ofx-shadow-lg)]"
    >
      {{ text }}
    </span>
  </span>
</template>
