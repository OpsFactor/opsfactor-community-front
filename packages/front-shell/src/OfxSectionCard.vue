<script setup lang="ts">
import { computed, useSlots } from 'vue';

const props = defineProps<{
  title?: string;
  description?: string;
}>();

const slots = useSlots();
const hasHeader = computed(() => Boolean(props.title || props.description || slots.actions));
</script>

<template>
  <section class="ofx-section-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border shadow-[var(--ofx-shadow-md)]">
    <header v-if="hasHeader" class="ofx-section-card__header shrink-0 border-b px-4 py-3 sm:px-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 v-if="title" class="text-base font-semibold text-[color:var(--ofx-text)]">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm leading-6 text-[color:var(--ofx-text-muted)]">{{ description }}</p>
        </div>
        <slot name="actions" />
      </div>
    </header>
    <div class="ofx-section-card__body flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3 sm:px-5"><slot /></div>
  </section>
</template>

<style scoped>
.ofx-section-card { border-color: rgb(48 60 84 / 0.92); background: linear-gradient(180deg, rgb(17 23 34 / 0.98), rgb(11 16 26 / 0.98)); }
.ofx-section-card__header { border-color: rgb(43 55 77 / 0.9); background: linear-gradient(180deg, rgb(29 38 56 / 0.78), rgb(19 26 40 / 0.28)); }
.ofx-section-card__body { background: linear-gradient(180deg, rgb(17 24 39 / 0.42), rgb(11 16 26 / 0)); }
:global(:root[data-theme='light']) .ofx-section-card, :global(:root[data-theme='light']) .ofx-section-card__header, :global(:root[data-theme='light']) .ofx-section-card__body { border-color: var(--ofx-border); background: var(--ofx-surface); }
</style>
