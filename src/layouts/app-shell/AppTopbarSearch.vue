<script setup lang="ts">
import { OpsFactorTopbarSearch } from '@opsfactor/front-shell';
import { APP_SEARCH_INDEX } from '@/app/navigation.config';
import { useThemeStore } from '@/stores/app/theme.store';
import { getAppRouter } from '@/app/providers/router';

const router = getAppRouter();
const route = router.currentRoute;
const themeStore = useThemeStore();

function navigate(path: string) {

  void router.push(path);

}
</script>

<template>
  <OpsFactorTopbarSearch
    :entries="APP_SEARCH_INDEX"
    :current-path="route.fullPath"
    :theme-mode="themeStore.mode"
    @navigate="navigate"
  />
</template>
