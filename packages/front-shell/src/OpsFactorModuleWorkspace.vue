<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { AppModuleCardLink, AppModuleSummary } from './legacy-navigation';
import { getPageIconName, getSectionIconName } from './navigation-icons';
import { unavailableEditionLabel } from './edition-navigation-policy';
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';
import OfxNavigationIcon from './OpsFactorNavigationIcon.vue';
import OfxPageHeader from './OfxPageHeader.vue';
import OfxSectionCard from './OfxSectionCard.vue';
import ReportPageLayout from './ReportPageLayout.vue';

const props = defineProps<{
  moduleInfo?: AppModuleSummary;
  title: string;
  description?: string;
  themeMode: 'light' | 'dark';
}>();

const moduleAccent = computed(() => props.moduleInfo?.accent ?? '#5b8cff');
const isLightTheme = computed(() => props.themeMode === 'light');
const headerIconStyle = computed(() => ({
  color: moduleAccent.value,
  borderColor: `color-mix(in srgb, ${moduleAccent.value} 22%, transparent)`,
  background: `color-mix(in srgb, ${moduleAccent.value} 14%, transparent)`,
}));
const sectionCardStyle = computed(() => ({
  borderColor: isLightTheme.value
    ? `color-mix(in srgb, ${moduleAccent.value} 18%, var(--ofx-border))`
    : `color-mix(in srgb, ${moduleAccent.value} 16%, rgba(255,255,255,0.08))`,
  background: isLightTheme.value
    ? `linear-gradient(180deg, color-mix(in srgb, ${moduleAccent.value} 6%, var(--ofx-surface)), var(--ofx-surface))`
    : `linear-gradient(180deg, color-mix(in srgb, ${moduleAccent.value} 7%, rgb(13 20 35 / 0.82)), rgb(13 20 35 / 0.82))`,
}));

function itemCardStyle() {

  return {
    borderColor: isLightTheme.value
      ? `color-mix(in srgb, ${moduleAccent.value} 16%, var(--ofx-border))`
      : `color-mix(in srgb, ${moduleAccent.value} 14%, rgba(255,255,255,0.08))`,
    background: isLightTheme.value
      ? `linear-gradient(180deg, color-mix(in srgb, ${moduleAccent.value} 8%, var(--ofx-surface-elevated)), var(--ofx-surface))`
      : `linear-gradient(180deg, color-mix(in srgb, ${moduleAccent.value} 10%, rgba(255,255,255,0.04)), rgba(255,255,255,0.03))`,
  };
}

function itemIconStyle() {

  return {
    color: moduleAccent.value,
    borderColor: `color-mix(in srgb, ${moduleAccent.value} 20%, transparent)`,
    background: `color-mix(in srgb, ${moduleAccent.value} 12%, transparent)`,
  };
}

function isUnavailable(item: AppModuleCardLink): boolean {

  return item.availableInCurrentRuntime === false;
}

function handleItemNavigation(event: MouseEvent, item: AppModuleCardLink) {

  if (isUnavailable(item)) {
    event.preventDefault();
  }
}
</script>

<template>
  <ReportPageLayout>
    <OfxPageHeader :eyebrow="props.moduleInfo?.label" :title="props.title" :description="props.description" />

    <div class="grid gap-6">
      <OfxSectionCard
        v-for="section in props.moduleInfo?.sections ?? []"
        :key="section.label"
        :title="section.label"
        :style="sectionCardStyle"
      >
        <template #header-actions>
          <div class="flex items-center justify-center rounded-xl border p-2" :style="headerIconStyle">
            <OfxNavigationIcon :name="getSectionIconName(section.label)" :size="16" />
          </div>
        </template>

        <div class="grid gap-4 xl:grid-cols-2">
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="group rounded-[14px] border p-4 transition hover:-translate-y-0.5"
            :class="[isLightTheme ? 'hover:border-[color:var(--ofx-border-strong)]' : 'hover:border-white/14', isUnavailable(item) ? 'cursor-not-allowed' : '']"
            :style="itemCardStyle()"
            :aria-disabled="isUnavailable(item)"
            @click="handleItemNavigation($event, item)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 items-start gap-3">
                <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border" :style="itemIconStyle()">
                  <OfxNavigationIcon :name="getPageIconName(item.label)" :size="17" />
                </div>
                <div class="min-w-0">
                  <div class="text-base font-semibold" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/92 group-hover:text-white'">{{ item.label }}</div>
                  <div class="mt-2 text-sm leading-6" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/54'">{{ item.description }}</div>
                </div>
              </div>
              <OfxEditionAvailabilityMark v-if="isUnavailable(item)" :edition-label="unavailableEditionLabel(props.moduleInfo?.key ?? '')" :theme-mode="props.themeMode" />
            </div>
          </RouterLink>
        </div>
      </OfxSectionCard>
    </div>
  </ReportPageLayout>
</template>
