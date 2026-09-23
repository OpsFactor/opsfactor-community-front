<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<template>
  <header class="flex flex-col gap-2 pb-1">
    <div v-if="props.eyebrow" class="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ofx-text-subtle)]">
      {{ props.eyebrow }}
    </div>
    <div class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0 space-y-1.5">
        <h1 class="text-[1.85rem] font-semibold tracking-[-0.03em] text-[color:var(--ofx-text)] sm:text-[1.95rem]">{{ props.title }}</h1>
        <p v-if="props.description" class="max-w-3xl text-[0.95rem] leading-6 text-[color:var(--ofx-text-muted)]">
          {{ props.description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="ofx-page-header-actions"><slot name="actions" /></div>
    </div>
  </header>
</template>

<style scoped>
/* Treat related actions as one header item; never distribute individual buttons across the page. */
.ofx-page-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}
.ofx-page-header-actions :deep(> *) { max-width: 100%; }
</style>
