<script setup lang="ts">
import { OpsFactorDashboardPageLayout } from '@opsfactor/front-shell';
import { useNavigationStore } from '@/stores/app/navigation.store';

const navigationStore = useNavigationStore();
</script>

<template>
  <OpsFactorDashboardPageLayout :immersive-workspace="navigationStore.immersiveWorkspace">
    <slot />
  </OpsFactorDashboardPageLayout>
</template>
