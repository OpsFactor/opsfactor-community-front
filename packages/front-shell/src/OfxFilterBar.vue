<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: 'Filters',
    description: '',
  },
);
</script>

<template>
  <section class="ofx-filter-bar flex flex-col gap-4 rounded-[12px] border px-5 py-4 shadow-[var(--ofx-shadow-md)]">
    <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text-subtle)]">{{ props.title }}</h2>
        <p v-if="props.description" class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
      </div>
      <div v-if="$slots.actions" class="ofx-filter-bar-actions"><slot name="actions" /></div>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.ofx-filter-bar {
  border-color: rgb(255 255 255 / 0.07);
  background: linear-gradient(180deg, rgb(16 24 41 / 0.96), rgb(8 14 25 / 0.94));
}

:global(:root[data-theme='light']) .ofx-filter-bar {
  border-color: var(--ofx-border);
  background: var(--ofx-surface);
}

/* Treat related actions as one header item; never distribute individual buttons across the page. */
.ofx-filter-bar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}
.ofx-filter-bar-actions :deep(> *) { max-width: 100%; }
</style>
