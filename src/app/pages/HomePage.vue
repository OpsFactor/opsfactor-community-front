<script setup lang="ts">
import { OpsFactorWorkspaceHome } from '@opsfactor/front-shell';
import { APP_MODULES } from '@/lib/constants/modules';
import { useThemeStore } from '@/stores/app/theme.store';

const themeStore = useThemeStore();
</script>

<template>
  <OpsFactorWorkspaceHome :modules="APP_MODULES" :theme-mode="themeStore.mode" />
</template>
