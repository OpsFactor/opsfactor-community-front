<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { getModuleIconName } from './navigation-icons';
import { unavailableEditionLabel } from './edition-navigation-policy';
import type { AppModuleSummary } from './legacy-navigation';
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';
import OpsFactorNavigationIcon from './OpsFactorNavigationIcon.vue';

const props = defineProps<{
  modules: AppModuleSummary[];
  themeMode: 'light' | 'dark';
}>();

const planningModules = computed(() => props.modules.filter((module) => module.railGroup === 'planning'));
const platformModules = computed(() => props.modules.filter((module) => module.railGroup === 'platform'));
const isLightTheme = computed(() => props.themeMode === 'light');

function moduleSurface(accent: string) {

  if (isLightTheme.value) {
    return {
      borderColor: `color-mix(in srgb, ${accent} 24%, var(--ofx-border))`,
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 9%, var(--ofx-surface)), color-mix(in srgb, ${accent} 5%, var(--ofx-surface-elevated)))`,
      boxShadow: `0 28px 80px color-mix(in srgb, ${accent} 12%, transparent)`,
    };
  }

  return {
    borderColor: `color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.08))`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 11%, rgb(14 20 35 / 0.94)), rgb(9 14 26 / 0.96))`,
    boxShadow: `0 28px 80px color-mix(in srgb, ${accent} 12%, transparent)`,
  };
}

function iconSurface(accent: string) {

  return {
    color: accent,
    borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
  };
}

function isUnavailable(module: AppModuleSummary): boolean {

  return module.availableInCurrentRuntime === false;
}

function handleModuleNavigation(event: MouseEvent, module: AppModuleSummary) {

  if (isUnavailable(module)) {
    event.preventDefault();
  }
}
</script>

<template>
  <div class="relative overflow-hidden px-3 py-5 sm:px-4 lg:px-5 xl:px-6">
    <div v-if="!isLightTheme" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute left-[-10%] top-[-8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(91,140,255,0.18),transparent_68%)] blur-3xl"></div>
      <div class="absolute right-[-8%] top-[12%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(111,211,163,0.14),transparent_68%)] blur-3xl"></div>
      <div class="absolute bottom-[-18%] left-[22%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,140,102,0.12),transparent_70%)] blur-3xl"></div>
    </div>

    <div class="relative mx-auto flex w-full max-w-none flex-col gap-8">
      <section
        class="overflow-hidden rounded-[26px] border p-6 sm:p-7"
        :class="isLightTheme
          ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] shadow-[var(--ofx-shadow-md)]'
          : 'border-white/8 bg-[linear-gradient(135deg,rgb(13_19_34_/_0.9),rgb(7_11_21_/_0.96))] shadow-[var(--ofx-shadow-lg)]'"
      >
        <div class="space-y-2">
          <div class="space-y-2">
            <div class="text-[11px] font-medium uppercase tracking-[0.18em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34'">Workspace Home</div>
            <h1 class="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/94'">Select a module</h1>
            <p class="max-w-3xl text-sm leading-7" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/52'">
              Open a module overview to continue into planning, visibility, data, configuration, or administration.
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
        <div class="space-y-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-[11px] font-medium uppercase tracking-[0.18em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34'">Planning</div>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/94'">Core workspaces</h2>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <RouterLink
              v-for="module in planningModules"
              :key="module.key"
              :to="module.path"
              class="group relative overflow-hidden rounded-[26px] border p-6 transition duration-200 hover:-translate-y-0.5"
              :class="[isLightTheme ? 'hover:border-[color:var(--ofx-border-strong)]' : 'hover:border-white/14', isUnavailable(module) ? 'cursor-not-allowed' : '']"
              :style="moduleSurface(module.accent)"
              :aria-disabled="isUnavailable(module)"
              @click="handleModuleNavigation($event, module)"
            >
              <div class="absolute inset-x-0 top-0 h-px opacity-60" :class="isLightTheme ? 'bg-[linear-gradient(90deg,transparent,var(--ofx-border-strong),transparent)]' : 'bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]'"></div>
              <div class="flex h-full flex-col gap-5">
                <div class="flex items-start gap-4"><div class="flex h-12 w-12 items-center justify-center rounded-2xl border" :style="iconSurface(module.accent)"><OpsFactorNavigationIcon :name="getModuleIconName(module.key)" :size="20" /></div></div>
                <div class="space-y-3">
                  <h3 class="inline-flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em]" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/96'">
                    <span>{{ module.label }}</span>
                    <OfxEditionAvailabilityMark v-if="isUnavailable(module)" :edition-label="unavailableEditionLabel(module.key)" :theme-mode="props.themeMode" />
                  </h3>
                  <p class="text-sm leading-7" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/56'">{{ module.description }}</p>
                </div>
                <div class="mt-auto flex flex-wrap gap-2"><span v-for="preview in module.previewItems.slice(0, 3)" :key="preview" class="rounded-full border px-3 py-1.5 text-[11px]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]' : 'border-white/8 bg-white/[0.035] text-white/56'">{{ preview }}</span></div>
              </div>
            </RouterLink>
          </div>
        </div>

        <div class="space-y-5">
          <div><div class="text-[11px] font-medium uppercase tracking-[0.18em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34'">Platform</div><h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/94'">Support workspaces</h2></div>
          <div class="space-y-4">
            <RouterLink
              v-for="module in platformModules"
              :key="module.key"
              :to="module.path"
              class="group block overflow-hidden rounded-[24px] border p-5 transition duration-200 hover:-translate-y-0.5"
              :class="[isLightTheme ? 'hover:border-[color:var(--ofx-border-strong)]' : 'hover:border-white/14', isUnavailable(module) ? 'cursor-not-allowed' : '']"
              :style="moduleSurface(module.accent)"
              :aria-disabled="isUnavailable(module)"
              @click="handleModuleNavigation($event, module)"
            >
              <div class="flex items-start gap-4">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" :style="iconSurface(module.accent)"><OpsFactorNavigationIcon :name="getModuleIconName(module.key)" :size="18" /></div>
                <div class="min-w-0">
                  <div class="inline-flex items-center gap-2 text-lg font-semibold" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/94'">
                    <span>{{ module.label }}</span>
                    <OfxEditionAvailabilityMark v-if="isUnavailable(module)" :edition-label="unavailableEditionLabel(module.key)" :theme-mode="props.themeMode" />
                  </div>
                  <div class="mt-2 text-sm leading-6" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/54'">{{ module.description }}</div>
                  <div class="mt-3 flex flex-wrap gap-2"><span v-for="preview in module.previewItems.slice(0, 2)" :key="preview" class="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]' : 'border-white/8 bg-white/[0.035] text-white/48'">{{ preview }}</span></div>
                </div>
              </div>
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
