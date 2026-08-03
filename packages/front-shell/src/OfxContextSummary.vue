<script setup lang="ts">
/**
 * Edition-neutral context banner. Hosts choose the domain metrics; the shared
 * shell owns the visual hierarchy and semantic tones.
 */
interface OfxContextMetric {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const props = defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  metrics?: OfxContextMetric[];
}>();

function toneClasses(tone?: OfxContextMetric['tone']) {
  if (tone === 'success') return 'border-[color:rgb(47_155_113_/_0.22)] bg-[color:rgb(47_155_113_/_0.08)] text-[color:var(--ofx-text-success)]';
  if (tone === 'warning') return 'border-[color:rgb(211_155_42_/_0.24)] bg-[color:rgb(211_155_42_/_0.08)] text-[color:var(--ofx-text-warning)]';
  if (tone === 'danger') return 'border-[color:rgb(208_69_95_/_0.24)] bg-[color:rgb(208_69_95_/_0.08)] text-[color:var(--ofx-text-danger)]';
  return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-bg-subtle)] text-[color:var(--ofx-text)]';
}
</script>

<template>
  <section class="rounded-xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-5 py-5 shadow-sm">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div v-if="props.eyebrow" class="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--ofx-text-subtle)]">{{ props.eyebrow }}</div>
        <h2 class="text-xl font-semibold text-[color:var(--ofx-text)]">{{ props.title }}</h2>
        <p v-if="props.description" class="max-w-3xl text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
      </div>
      <div v-if="props.metrics?.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="metric in props.metrics" :key="metric.label" :class="['min-w-[132px] rounded-lg border px-4 py-3', toneClasses(metric.tone)]">
          <div class="text-xs uppercase tracking-[0.14em] text-current/75">{{ metric.label }}</div>
          <div class="mt-1 text-lg font-semibold text-current">{{ metric.value }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
