<script setup lang="ts">
import { computed } from 'vue';
import { OpsFactorLegacyTopbar } from '@opsfactor/front-shell';
import { buildAppAssetPath } from '@/app/runtime/public-path';
import { useThemeStore } from '@/stores/app/theme.store';
import AppTopbarSearch from './AppTopbarSearch.vue';

defineProps<{ currentModule?: string }>();

const themeStore = useThemeStore();
const brandLogoUrl = computed(() => buildAppAssetPath(
  themeStore.mode === 'dark' ? 'brand/opsfactor-light.png' : 'brand/opsfactor-dark.png',
));
</script>

<template>
  <OpsFactorLegacyTopbar :brand-logo-url="brandLogoUrl" :current-module="currentModule" :theme-mode="themeStore.mode">
    <template #search><AppTopbarSearch class="min-w-0 flex-1" /></template>
  </OpsFactorLegacyTopbar>
</template>
