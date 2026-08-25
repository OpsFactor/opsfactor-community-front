<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Normal action label rendered while the request is idle. */
    label: string;
    /** Activates the shared, indeterminate processing affordance. */
    processing?: boolean;
    /** Keeps processing terminology consistent across submitted operations. */
    processingLabel?: string;
  }>(),
  {
    processing: false,
    processingLabel: 'Processing…',
  },
);
</script>

<template>
  <span class="inline-flex items-center justify-center gap-2">
    <span
      v-if="props.processing"
      class="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
    <span>{{ props.processing ? props.processingLabel : props.label }}</span>
  </span>
</template>
