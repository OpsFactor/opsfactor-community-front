<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import TaskPageLayout from './TaskPageLayout.vue';
import OfxPageHeader from './OfxPageHeader.vue';
import OfxSectionCard from './OfxSectionCard.vue';

type Tone = 'default' | 'success' | 'warning' | 'info';
type ThemeMode = 'light' | 'dark';

interface LegacyMetric {
  label: string;
  value: string;
  tone?: Tone;
}

interface LegacySection {
  title: string;
  description?: string;
  items?: string[];
  note?: string;
}

interface LegacyLink {
  label: string;
  to: string;
}

const props = withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  themeMode?: ThemeMode;
  legacyPath?: string;
  keywords?: string[];
  summary?: string[];
  metrics?: LegacyMetric[];
  sections?: LegacySection[];
  relatedLinks?: LegacyLink[];
}>(), {
  themeMode: 'light',
});

const isLightTheme = computed(() => props.themeMode === 'light');

function toneClasses(tone: Tone = 'default') {

  if (isLightTheme.value) {
    if (tone === 'success') return 'border-[color:rgb(31_135_93_/_0.26)] bg-[color:rgb(232_248_241_/_0.96)] text-[color:rgb(22_98_65)]';
    if (tone === 'warning') return 'border-[color:rgb(211_155_42_/_0.3)] bg-[color:rgb(255_248_230_/_0.96)] text-[color:rgb(138_97_24)]';
    if (tone === 'info') return 'border-[color:rgb(75_124_255_/_0.28)] bg-[color:rgb(239_244_255_/_0.96)] text-[color:rgb(33_71_160)]';
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]';
  }

  if (tone === 'success') return 'border-[color:rgb(70_160_118_/_0.28)] bg-[color:rgb(70_160_118_/_0.14)] text-[color:rgb(179_245_206)]';
  if (tone === 'warning') return 'border-[color:rgb(211_155_42_/_0.24)] bg-[color:rgb(211_155_42_/_0.12)] text-[color:rgb(246_214_133)]';
  if (tone === 'info') return 'border-[color:rgb(84_119_214_/_0.28)] bg-[color:rgb(84_119_214_/_0.14)] text-[color:rgb(196_213_255)]';
  return 'border-white/10 bg-white/[0.04] text-white/82';
}

const legacyPathClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/10 bg-white/[0.03] text-white/56'
));
const metricValueClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/94'));
const bodyTextClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/60'));
const bodyItemClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-white/8 bg-white/[0.025]'
));
const keywordClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/8 bg-white/[0.035] text-white/56'
));
const relatedLabelClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/34'));
const relatedLinkClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/8 bg-white/[0.03] text-white/74 hover:bg-white/[0.05] hover:text-white/92'
));
const noteClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/48'));
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader :eyebrow="props.eyebrow" :title="props.title" :description="props.description">
      <template #actions>
        <div v-if="props.legacyPath" :class="['rounded-[10px] border px-3 py-2 text-xs', legacyPathClass]">
          Legacy: {{ props.legacyPath }}
        </div>
      </template>
    </OfxPageHeader>

    <div v-if="props.metrics?.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="metric in props.metrics" :key="metric.label" :class="['rounded-[14px] border px-4 py-4', toneClasses(metric.tone)]">
        <div class="text-[11px] uppercase tracking-[0.16em]">{{ metric.label }}</div>
        <div :class="['mt-3 text-xl font-semibold', metricValueClass]">{{ metric.value }}</div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <OfxSectionCard title="What lives here" description="This page is already positioned in the new SPA navigation and now describes the legacy workflow in a more task-oriented structure.">
        <ul v-if="props.summary?.length" :class="['space-y-3 text-sm leading-6', bodyTextClass]">
          <li v-for="item in props.summary" :key="item" :class="['rounded-[12px] border px-4 py-3', bodyItemClass]">{{ item }}</li>
        </ul>
        <p v-else :class="['text-sm leading-6', bodyTextClass]">This route is available in the new shell and ready for deeper migration work.</p>
      </OfxSectionCard>

      <OfxSectionCard title="Search keywords" description="Keywords feed the topbar search and make this route easier to find by legacy and business vocabulary.">
        <div class="flex flex-wrap gap-2"><span v-for="keyword in props.keywords ?? []" :key="keyword" :class="['rounded-full border px-2.5 py-1 text-[11px]', keywordClass]">{{ keyword }}</span></div>
        <div v-if="props.relatedLinks?.length" class="mt-5 space-y-2">
          <div :class="['text-[11px] uppercase tracking-[0.16em]', relatedLabelClass]">Related pages</div>
          <RouterLink v-for="link in props.relatedLinks" :key="link.to" :to="link.to" :class="['block rounded-[10px] border px-3 py-2 text-sm transition', relatedLinkClass]">{{ link.label }}</RouterLink>
        </div>
      </OfxSectionCard>
    </div>

    <div v-if="props.sections?.length" class="grid gap-6 xl:grid-cols-2">
      <OfxSectionCard v-for="section in props.sections" :key="section.title" :title="section.title" :description="section.description">
        <ul v-if="section.items?.length" :class="['space-y-3 text-sm leading-6', bodyTextClass]">
          <li v-for="item in section.items" :key="item" :class="['rounded-[12px] border px-4 py-3', bodyItemClass]">{{ item }}</li>
        </ul>
        <p v-if="section.note" :class="['mt-4 text-sm leading-6', noteClass]">{{ section.note }}</p>
      </OfxSectionCard>
    </div>
  </TaskPageLayout>
</template>
