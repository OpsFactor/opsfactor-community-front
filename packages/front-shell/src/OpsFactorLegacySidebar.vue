<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import OpsFactorNavigationIcon from './OpsFactorNavigationIcon.vue';
import { getModuleIconName, getPageIconName, getSectionIconName } from './navigation-icons';

export interface LegacyNavigationItem {
  key: string;
  label: string;
  path: string;
  availableInCurrentRuntime?: boolean;
}

export interface LegacyNavigationModule {
  key: string;
  label: string;
  path: string;
  accent: string;
  railGroup: 'planning' | 'platform';
  availableInCurrentRuntime?: boolean;
  sections: Array<{ label: string; items: LegacyNavigationItem[] }>;
}

const props = defineProps<{
  modules: LegacyNavigationModule[];
  themeMode: 'light' | 'dark';
}>();

const emit = defineEmits<{ logout: [] }>();
const route = useRoute();
const previewModuleKey = ref<string | null>(null);
const flyoutVisible = ref(false);
const railNavRef = ref<HTMLElement | null>(null);
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const isLightTheme = computed(() => props.themeMode === 'light');
const currentModule = computed(() => props.modules.find((module) => route.path.startsWith(module.path)) ?? null);
const planningModules = computed(() => props.modules.filter((module) => module.railGroup === 'planning'));
const platformModules = computed(() => props.modules.filter((module) => module.railGroup === 'platform'));
const previewModule = computed(() =>
  props.modules.find((module) => module.key === previewModuleKey.value)
  ?? currentModule.value
  ?? planningModules.value[0]
  ?? props.modules[0]
  ?? null,
);

function scrollModuleIntoView(moduleKey?: string | null) {

  if (!moduleKey || !railNavRef.value) return;
  railNavRef.value.querySelector<HTMLElement>(`[data-module-key="${moduleKey}"]`)?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  });

}

watch(
  () => currentModule.value?.key ?? null,
  (moduleKey) => {
    if ((!flyoutVisible.value || previewModuleKey.value === null) && moduleKey) previewModuleKey.value = moduleKey;
    void nextTick(() => scrollModuleIntoView(moduleKey));
  },
  { immediate: true },
);

function clearCloseTimer() {

  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

}

function openFlyout(moduleKey?: string) {

  clearCloseTimer();
  flyoutVisible.value = true;
  previewModuleKey.value = moduleKey ?? currentModule.value?.key ?? planningModules.value[0]?.key ?? null;

}

function closeFlyout() {

  clearCloseTimer();
  flyoutVisible.value = false;
  previewModuleKey.value = currentModule.value?.key ?? null;

}

function scheduleFlyoutClose() {

  clearCloseTimer();
  closeTimer = setTimeout(closeFlyout, 120);

}

function isActive(path: string) {

  return route.path === path || route.path.startsWith(`${path}/`);

}

function isSelected(path: string) {

  return flyoutVisible.value ? previewModule.value?.path === path : isActive(path);

}

function isUnavailable(entry: { availableInCurrentRuntime?: boolean }) {

  return entry.availableInCurrentRuntime === false;

}

function moduleLinkClass(path: string) {

  if (isLightTheme.value) {
    return isSelected(path)
      ? 'border-[color:var(--ofx-border-selected)] text-[color:var(--ofx-text)]'
      : 'border-transparent bg-transparent text-[color:var(--ofx-text-subtle)] hover:border-[color:var(--ofx-border)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]';
  }
  return isSelected(path)
    ? 'border-white/10 text-white'
    : 'border-transparent bg-transparent text-white/44 hover:border-white/8 hover:bg-white/6 hover:text-white/88';

}

function flyoutItemClass(path: string) {

  if (isLightTheme.value) {
    return isActive(path)
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.12)] text-[color:var(--ofx-text)]'
      : 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]';
  }
  return isActive(path)
    ? 'border-white/12 bg-white/[0.09] text-white'
    : 'border-white/7 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.06] hover:text-white/92';

}

function handleNavigation(event: MouseEvent, entry: { availableInCurrentRuntime?: boolean }) {

  if (isUnavailable(entry)) {
    event.preventDefault();
    return;
  }
  closeFlyout();

}

onBeforeUnmount(clearCloseTimer);
</script>

<template>
  <div class="hidden lg:block">
    <aside class="fixed inset-y-0 left-0 z-[var(--ofx-z-drawer)] w-[104px] overflow-visible pl-4 pt-4">
      <div class="relative flex h-[calc(100vh-2rem)] items-start" @mouseleave="scheduleFlyoutClose">
        <div class="sidebar-rail flex h-full min-h-0 w-[72px] flex-col items-center gap-4 overflow-hidden rounded-[28px] border px-3 py-4 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]' : 'border-white/8 bg-[color:rgb(8_13_23_/_0.92)]'" @mouseenter="clearCloseTimer">
          <nav ref="railNavRef" class="sidebar-module-nav flex min-h-0 w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto overflow-x-hidden py-1 pr-0.5">
            <RouterLink v-for="module in planningModules" :key="module.key" :to="module.path" :data-module-key="module.key" class="sidebar-module-link relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-150" :style="isSelected(module.path) ? { boxShadow: `0 10px 30px color-mix(in srgb, ${module.accent} 28%, transparent)` } : undefined" :class="[moduleLinkClass(module.path), isUnavailable(module) ? 'cursor-not-allowed opacity-45' : '']" :title="module.label" :aria-disabled="isUnavailable(module)" @mouseenter="openFlyout(module.key)" @focus="openFlyout(module.key)" @click="handleNavigation($event, module)">
              <span class="absolute inset-0 rounded-2xl" :style="isSelected(module.path) ? { background: `color-mix(in srgb, ${module.accent} 22%, transparent)` } : undefined"></span>
              <span class="absolute left-[-12px] h-6 w-1 rounded-full transition-opacity" :style="{ backgroundColor: module.accent, opacity: isSelected(module.path) ? 1 : 0 }"></span>
              <span class="relative"><OpsFactorNavigationIcon :name="getModuleIconName(module.key)" :size="18" /></span>
            </RouterLink>
            <div class="my-1.5 h-px w-7 shrink-0" :class="isLightTheme ? 'bg-[color:var(--ofx-border)]' : 'bg-white/10'"></div>
            <RouterLink v-for="module in platformModules" :key="module.key" :to="module.path" :data-module-key="module.key" class="sidebar-module-link relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-150" :style="isSelected(module.path) ? { boxShadow: `0 10px 30px color-mix(in srgb, ${module.accent} 28%, transparent)` } : undefined" :class="[moduleLinkClass(module.path), isUnavailable(module) ? 'cursor-not-allowed opacity-45' : '']" :title="module.label" :aria-disabled="isUnavailable(module)" @mouseenter="openFlyout(module.key)" @focus="openFlyout(module.key)" @click="handleNavigation($event, module)">
              <span class="absolute inset-0 rounded-2xl" :style="isSelected(module.path) ? { background: `color-mix(in srgb, ${module.accent} 22%, transparent)` } : undefined"></span>
              <span class="absolute left-[-12px] h-6 w-1 rounded-full transition-opacity" :style="{ backgroundColor: module.accent, opacity: isSelected(module.path) ? 1 : 0 }"></span>
              <span class="relative"><OpsFactorNavigationIcon :name="getModuleIconName(module.key)" :size="18" /></span>
            </RouterLink>
          </nav>
          <div class="sidebar-rail__footer flex w-full shrink-0 flex-col items-center border-t pt-3" :class="isLightTheme ? 'border-[color:var(--ofx-border)]' : 'border-white/8'">
            <button class="sidebar-logout-button flex h-10 w-10 items-center justify-center rounded-full border transition" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-danger)] hover:text-[color:var(--ofx-text-danger)]' : 'border-white/10 bg-white/6 text-white/72 hover:border-rose-300/20 hover:bg-rose-400/10 hover:text-rose-100'" type="button" title="Sign out" aria-label="Sign out" @click="emit('logout')"><OpsFactorNavigationIcon name="log-out" :size="16" /></button>
          </div>
        </div>
        <div v-if="previewModule" v-show="flyoutVisible" class="absolute left-[76px] top-0 w-[320px]" @mouseenter="clearCloseTimer" @mouseleave="scheduleFlyoutClose">
          <div class="h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] border shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]' : 'border-white/8 bg-[color:rgb(10_16_29_/_0.96)]'">
            <div class="border-b px-4 py-4" :class="isLightTheme ? 'border-[color:var(--ofx-border)]' : 'border-white/6'"><div class="flex items-center gap-3"><div class="flex h-9 w-9 items-center justify-center rounded-2xl border" :style="{ color: previewModule.accent, borderColor: `color-mix(in srgb, ${previewModule.accent} 20%, transparent)`, background: `color-mix(in srgb, ${previewModule.accent} 14%, transparent)` }"><OpsFactorNavigationIcon :name="getModuleIconName(previewModule.key)" :size="16" /></div><div><div class="text-lg font-semibold" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/94'">{{ previewModule.label }}</div></div></div></div>
            <div class="h-[calc(100%-74px)] overflow-y-auto px-3 py-3"><div v-for="section in previewModule.sections" :key="section.label" class="mb-3 rounded-[20px] border p-3 last:mb-0" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]' : 'border-white/7 bg-white/[0.025]'"><div class="px-1"><div class="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34'"><OpsFactorNavigationIcon :name="getSectionIconName(section.label)" :size="13" /><span>{{ section.label }}</span></div></div><div class="mt-3 space-y-2"><RouterLink v-for="item in section.items" :key="item.path" :to="item.path" class="block rounded-[16px] border px-3 py-2.5 transition" :class="[flyoutItemClass(item.path), isUnavailable(item) ? 'cursor-not-allowed opacity-50' : '']" :aria-disabled="isUnavailable(item)" @click="handleNavigation($event, item)"><div class="flex items-center gap-3"><div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border" :style="{ color: previewModule.accent, borderColor: `color-mix(in srgb, ${previewModule.accent} 18%, transparent)`, background: `color-mix(in srgb, ${previewModule.accent} 10%, transparent)` }"><OpsFactorNavigationIcon :name="getPageIconName(item.label)" :size="15" /></div><div class="min-w-0"><div class="text-sm font-medium">{{ item.label }}</div><div v-if="isUnavailable(item)" class="mt-0.5 text-[10px] uppercase tracking-[0.14em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/35'">Enterprise</div></div></div></RouterLink></div></div></div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.sidebar-module-nav { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ofx-text-muted) 42%, transparent) transparent; }
.sidebar-module-nav::-webkit-scrollbar { width: 6px; }
.sidebar-module-nav::-webkit-scrollbar-thumb { border-radius: 9999px; background: color-mix(in srgb, var(--ofx-text-muted) 42%, transparent); }
.sidebar-module-nav::-webkit-scrollbar-track { background: transparent; }
@media (max-height: 860px) { .sidebar-rail { gap: 0.75rem; padding-top: 0.875rem; padding-bottom: 0.875rem; } .sidebar-module-nav { gap: 0.375rem; } .sidebar-module-link { height: 2.375rem; width: 2.375rem; border-radius: 0.9375rem; } .sidebar-rail__footer { padding-top: 0.75rem; } .sidebar-logout-button { height: 2.25rem; width: 2.25rem; } }
</style>
