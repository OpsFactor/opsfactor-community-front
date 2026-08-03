<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { AppModuleSummary } from './legacy-navigation';
import OpsFactorModuleWorkspace from './OpsFactorModuleWorkspace.vue';

const route = useRoute();
let themeObserver: MutationObserver | undefined;

/** Reads the host theme before the first shared workspace paint. */
function resolveThemeMode(): 'light' | 'dark' {

  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

}

const themeMode = ref<'light' | 'dark'>(resolveThemeMode());

const moduleInfo = computed(() => route.meta.navigationModule as AppModuleSummary | undefined);
const description = computed(() => (typeof route.meta.description === 'string' ? route.meta.description : undefined));
const title = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : moduleInfo.value?.label ?? 'Workspace'));

/** Keeps the shared route surface aligned with the host's persisted theme without a host store dependency. */
function synchronizeThemeMode() {

  themeMode.value = resolveThemeMode();
}

onMounted(() => {
  synchronizeThemeMode();
  themeObserver = new MutationObserver(synchronizeThemeMode);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
});
</script>

<template>
  <OpsFactorModuleWorkspace
    :module-info="moduleInfo"
    :title="title"
    :description="description"
    :theme-mode="themeMode"
  />
</template>
