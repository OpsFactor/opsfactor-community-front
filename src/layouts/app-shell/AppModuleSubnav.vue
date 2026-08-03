<script setup lang="ts">
import { OpsFactorLegacyModuleSubnav } from '@opsfactor/front-shell';
import { useThemeStore } from '@/stores/app/theme.store';

defineProps<{ items: Array<{ label: string; to: string }> }>();

const themeStore = useThemeStore();
</script>

<template>
  <OpsFactorLegacyModuleSubnav :items="items" :theme-mode="themeStore.mode" />
</template>
