<script setup lang="ts">
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';

defineProps<{
  label: string;
  value: string;
  trend?: string;
  tone?: 'default' | 'success' | 'warning';
  requiredEdition?: 'Enterprise' | 'Pro / Enterprise';
}>();
</script>

<template>
  <article class="ofx-kpi-card rounded-[12px] border px-4 py-3.5 shadow-[0_14px_32px_rgb(2_8_20_/_0.22)]">
    <p class="ofx-kpi-card__label flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]">
      {{ label }}
      <OfxEditionAvailabilityMark v-if="requiredEdition" :edition-label="requiredEdition" :size="12" />
    </p>
    <div class="mt-2.5 flex items-end justify-between gap-3">
      <div class="ofx-kpi-card__value text-2xl font-semibold tracking-[-0.03em]">{{ value }}</div>
      <span
        v-if="trend"
        class="rounded-full border px-2.5 py-1 text-xs font-medium"
        :class="tone === 'success'
          ? 'border-[color:rgb(47_155_113_/_0.24)] bg-[color:rgb(47_155_113_/_0.12)] text-[color:var(--ofx-text-success)]'
          : tone === 'warning'
            ? 'border-[color:rgb(211_155_42_/_0.24)] bg-[color:rgb(211_155_42_/_0.12)] text-[color:var(--ofx-text-warning)]'
            : 'border-white/10 bg-white/[0.04] text-white/62'"
      >
        {{ trend }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.ofx-kpi-card {
  border-color: rgb(54 67 91 / 0.82);
  background: linear-gradient(180deg, rgb(24 32 47 / 0.98), rgb(14 20 31 / 0.98));
}

.ofx-kpi-card__label {
  color: rgb(176 191 214 / 0.76);
}

.ofx-kpi-card__value {
  color: rgb(255 255 255 / 0.94);
}

:global(:root[data-theme='light']) .ofx-kpi-card {
  border-color: var(--ofx-border);
  background: linear-gradient(180deg, var(--ofx-surface), var(--ofx-surface-elevated));
  box-shadow: var(--ofx-shadow-sm);
}

:global(:root[data-theme='light']) .ofx-kpi-card__label {
  color: var(--ofx-text-subtle);
}

:global(:root[data-theme='light']) .ofx-kpi-card__value {
  color: var(--ofx-text);
}
</style>
