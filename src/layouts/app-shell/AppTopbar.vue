<script setup lang="ts">
import { computed, ref } from 'vue';
import { OpsFactorLegacyTopbar } from '@opsfactor/front-shell';
import { buildAppAssetPath } from '@/app/runtime/public-path';
import { useThemeStore } from '@/stores/app/theme.store';
import AppTopbarSearch from './AppTopbarSearch.vue';

defineProps<{ currentModule?: string }>();

const themeStore = useThemeStore();
const quickActionsRequest = ref(0);
const brandLogoUrl = computed(() => buildAppAssetPath(
  themeStore.mode === 'dark' ? 'brand/opsfactor-horizontal-on-dark.svg' : 'brand/opsfactor-horizontal-on-light.svg',
));
</script>

<template>
  <OpsFactorLegacyTopbar :brand-logo-url="brandLogoUrl" :current-module="currentModule" :theme-mode="themeStore.mode" @quick-actions="quickActionsRequest += 1">
    <template #search><AppTopbarSearch class="min-w-0 flex-1" :quick-actions-request="quickActionsRequest" /></template>
  </OpsFactorLegacyTopbar>
</template>
