<script setup lang="ts">
defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="space-y-3 rounded-xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-5 py-6 shadow-sm">
    <div class="h-4 w-32 animate-pulse rounded bg-[color:var(--ofx-bg-subtle)]"></div>
    <div class="h-4 w-3/4 animate-pulse rounded bg-[color:var(--ofx-bg-subtle)]"></div>
    <div class="h-28 animate-pulse rounded-lg bg-[color:var(--ofx-bg-subtle)]"></div>
    <p v-if="label" class="text-xs text-[color:var(--ofx-text-muted)]">{{ label }}</p>
  </div>
</template>
