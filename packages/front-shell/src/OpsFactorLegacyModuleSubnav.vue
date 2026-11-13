<script setup lang="ts">
import { computed, ref, watchPostEffect } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const props = defineProps<{
  items: Array<{ label: string; to: string }>;
  themeMode: 'light' | 'dark';
}>();

const route = useRoute();

const scrollContainer = ref<HTMLElement | null>(null);
const activePath = computed(() => {
  let bestMatch = '';
  for (const { to } of props.items) {
    if (to.length > bestMatch.length && (route.path === to || route.path.startsWith(`${to}/`))) {
      bestMatch = to;
    }
  }
  return bestMatch;
});

watchPostEffect(() => {
  const container = scrollContainer.value;
  if (!container || !activePath.value) return;

  const activeLink = container.querySelector('[data-subnav-active="true"]');
  if (!activeLink) return;

  const { left, right } = activeLink.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  if (left < bounds.left) {
    container.scrollLeft -= bounds.left - left;
  } else if (right > bounds.right) {
    container.scrollLeft += right - bounds.right;
  }
});
</script>

<template>
  <div v-if="items.length" class="border-b" :class="themeMode === 'light' ? 'module-subnav' : 'border-white/6 bg-[color:rgb(7_12_22_/_0.48)]'">
    <div ref="scrollContainer" class="module-subnav-scroll mr-auto flex w-full max-w-none items-center overflow-x-auto px-3 sm:px-4 lg:px-5 xl:px-6" :class="themeMode === 'light' ? 'gap-2 py-2.5' : 'gap-3 py-3'">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" :data-subnav-active="activePath === item.to" class="whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium leading-5 transition-colors" :class="themeMode === 'light'
        ? [activePath === item.to ? 'border-[color:var(--ofx-border-selected)] bg-[color:color-mix(in_srgb,var(--ofx-primary)_10%,var(--ofx-surface))] text-[color:var(--ofx-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ofx-primary)_8%,transparent)]' : 'border-transparent bg-transparent text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border)] hover:bg-[color:color-mix(in_srgb,var(--ofx-surface-elevated)_84%,transparent)] hover:text-[color:var(--ofx-text)]']
        : ['rounded-full px-3 py-1.5 text-sm', activePath === item.to ? 'border-[color:rgb(75_124_255_/_0.42)] bg-[color:rgb(75_124_255_/_0.16)] text-white' : 'border-white/8 bg-white/[0.02] text-white/48 hover:border-white/12 hover:bg-white/[0.05] hover:text-white/82']"
      >{{ item.label }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.module-subnav { border-color: var(--ofx-border); background: color-mix(in srgb, var(--ofx-surface) 78%, var(--ofx-bg)); }
.module-subnav-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--ofx-border-strong) transparent;
}
</style>
