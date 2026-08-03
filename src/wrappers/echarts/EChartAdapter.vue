<script setup lang="ts">
import { EChartAdapter } from '@opsfactor/front-shell';
import { useThemeStore } from '@/stores/app/theme.store';

withDefaults(
  defineProps<{
    option: Record<string, unknown>;
    height?: number | string;
  }>(),
  { height: 320 },
);

const themeStore = useThemeStore();
</script>

<template>
  <EChartAdapter :option="option" :height="height" :theme-mode="themeStore.mode" />
</template>
