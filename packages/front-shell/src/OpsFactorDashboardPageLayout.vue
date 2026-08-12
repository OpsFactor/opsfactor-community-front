<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  immersiveWorkspace: boolean;
}>();

const layoutClassName = computed(() => (
  props.immersiveWorkspace
    ? 'flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden'
    : 'mr-auto flex min-w-0 w-full max-w-none flex-col gap-5 px-3 py-4 sm:px-4 lg:px-5 xl:px-6'
));
</script>

<template>
  <div :class="layoutClassName">
    <slot />
  </div>
</template>
