<script setup lang="ts">
import { OfxColumnManagerDrawer } from '@opsfactor/front-shell';
import type { OfxColumnManagerItem } from '@opsfactor/front-shell';
import { useThemeStore } from '@/stores/app/theme.store';

export type { OfxColumnManagerItem } from '@opsfactor/front-shell';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    items: OfxColumnManagerItem[];
  }>(),
  {
    title: 'Column Selection',
    description: '',
  },
);

const emit = defineEmits<{
  close: [];
  toggle: [columnId: string, visible: boolean];
  move: [columnId: string, direction: 'up' | 'down'];
}>();

const themeStore = useThemeStore();
</script>

<template>
  <OfxColumnManagerDrawer
    v-bind="props"
    :theme-mode="themeStore.mode"
    @close="emit('close')"
    @toggle="(columnId, visible) => emit('toggle', columnId, visible)"
    @move="(columnId, direction) => emit('move', columnId, direction)"
  />
</template>
