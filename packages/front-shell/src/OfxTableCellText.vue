<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value?: string | number | null;
    fallback?: string;
    weight?: 'regular' | 'medium' | 'semibold';
    tone?: 'default' | 'muted' | 'danger';
  }>(),
  {
    value: '',
    fallback: '',
    weight: 'regular',
    tone: 'default',
  },
);

const resolvedValue = `${props.value ?? ''}`.trim() || props.fallback;

function weightClass() {

  if (props.weight === 'semibold') return 'font-semibold';
  if (props.weight === 'medium') return 'font-medium';
  return '';
}

function toneClass() {

  if (props.tone === 'danger') return 'text-[color:var(--ofx-text-danger)]';
  if (props.tone === 'muted') return 'text-[color:var(--ofx-text-muted)]';
  return 'text-[color:var(--ofx-text)]';
}
</script>

<template>
  <div
    class="truncate text-sm"
    :class="[weightClass(), toneClass()]"
    :title="resolvedValue"
  >
    {{ resolvedValue }}
  </div>
</template>
