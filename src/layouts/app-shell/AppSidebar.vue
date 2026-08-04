<script setup lang="ts">
import { ref } from 'vue';
import { OpsFactorLegacySidebar } from '@opsfactor/front-shell';
import { APP_MODULES } from '@/lib/constants/modules';
import { ROUTE_NAMES } from '@/router/route-names';
import { useSessionStore } from '@/stores/app/session.store';
import { useThemeStore } from '@/stores/app/theme.store';
import { getAppRouter } from '@/app/providers/router';

const router = getAppRouter();
const sessionStore = useSessionStore();
const themeStore = useThemeStore();
const isLoggingOut = ref(false);

async function handleLogout() {

  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await sessionStore.logout();
  } catch (error) {
    console.warn('Logout request failed; local session state was cleared.', error);
  } finally {
    isLoggingOut.value = false;
    await router.push({ name: ROUTE_NAMES.login });
  }

}
</script>

<template>
  <OpsFactorLegacySidebar :modules="APP_MODULES" :theme-mode="themeStore.mode" @logout="handleLogout" />
</template>
