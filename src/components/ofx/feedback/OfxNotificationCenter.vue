<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { OfxNotificationCenter } from '@opsfactor/front-shell';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { useThemeStore } from '@/stores/app/theme.store';

const notificationsStore = useNotificationsStore();
const themeStore = useThemeStore();
const { items } = storeToRefs(notificationsStore);
</script>

<template>
  <OfxNotificationCenter :items="items" :theme-mode="themeStore.mode" @dismiss="notificationsStore.dismiss" />
</template>
