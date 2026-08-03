<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-bg-subtle)] px-6 py-10 text-center">
    <div class="text-base font-semibold text-[color:var(--ofx-text)]">{{ title }}</div>
    <p class="max-w-lg text-sm text-[color:var(--ofx-text-muted)]">{{ description }}</p>
    <slot />
  </div>
</template>
