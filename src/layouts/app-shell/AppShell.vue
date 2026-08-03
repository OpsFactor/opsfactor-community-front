<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import { APP_MODULES } from '@/lib/constants/modules';
import { useNavigationStore } from '@/stores/app/navigation.store';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import AppModuleSubnav from './AppModuleSubnav.vue';
import { OpsFactorLegacyAppFrame } from '@opsfactor/front-shell';

const route = useRoute();
const navigationStore = useNavigationStore();
const currentModule = computed(() => APP_MODULES.find((item) => item.key === route.meta.moduleKey));
const showShellChrome = computed(() => !navigationStore.immersiveWorkspace);
</script>

<template>
  <OpsFactorLegacyAppFrame :show-shell-chrome="showShellChrome">
    <template #sidebar>
      <AppSidebar />
    </template>
    <template #topbar>
      <AppTopbar :current-module="currentModule?.label" />
    </template>
    <template #module-subnav>
      <AppModuleSubnav :items="(route.meta.subnav as Array<{ label: string; to: string }> | undefined) ?? []" />
    </template>
    <RouterView />
  </OpsFactorLegacyAppFrame>
</template>
