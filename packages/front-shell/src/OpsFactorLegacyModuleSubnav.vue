<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

defineProps<{
  items: Array<{ label: string; to: string }>;
  themeMode: 'light' | 'dark';
}>();

const route = useRoute();

function isActive(itemPath: string) {

  return route.path === itemPath || route.path.startsWith(`${itemPath}/`);

}
</script>

<template>
  <div v-if="items.length" class="border-b" :class="themeMode === 'light' ? 'module-subnav' : 'border-white/6 bg-[color:rgb(7_12_22_/_0.48)]'">
    <div class="module-subnav-scroll mr-auto flex w-full max-w-none items-center overflow-x-auto px-3 sm:px-4 lg:px-5 xl:px-6" :class="themeMode === 'light' ? 'gap-2 py-2.5' : 'gap-3 py-3'">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="whitespace-nowrap border transition-colors" :class="themeMode === 'light'
        ? ['module-subnav__link', isActive(item.to) ? 'module-subnav__link--active' : 'module-subnav__link--idle']
        : ['rounded-full px-3 py-1.5 text-sm', isActive(item.to) ? 'border-[color:rgb(75_124_255_/_0.42)] bg-[color:rgb(75_124_255_/_0.16)] text-white' : 'border-white/8 bg-white/[0.02] text-white/48 hover:border-white/12 hover:bg-white/[0.05] hover:text-white/82']"
      >{{ item.label }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.module-subnav { border-color: var(--ofx-border); background: color-mix(in srgb, var(--ofx-surface) 78%, var(--ofx-bg)); }
.module-subnav__link { border: 1px solid transparent; border-radius: 10px; padding: 7px 12px; color: var(--ofx-text-muted); font-size: 0.875rem; line-height: 1.25rem; transition: border-color 160ms ease, background 160ms ease, color 160ms ease; }
.module-subnav__link--idle { background: transparent; }
.module-subnav__link--idle:hover { border-color: var(--ofx-border); background: color-mix(in srgb, var(--ofx-surface-elevated) 84%, transparent); color: var(--ofx-text); }
.module-subnav__link--active { border-color: color-mix(in srgb, var(--ofx-border-selected) 70%, var(--ofx-border)); background: color-mix(in srgb, var(--ofx-primary) 10%, var(--ofx-surface)); color: var(--ofx-text); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ofx-primary) 8%, transparent); }
.module-subnav-scroll { scrollbar-width: none; }
.module-subnav-scroll::-webkit-scrollbar { display: none; }
</style>
