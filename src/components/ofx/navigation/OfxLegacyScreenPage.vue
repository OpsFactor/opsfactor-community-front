<script setup lang="ts">
import { OpsFactorLegacyScreenPage } from '@opsfactor/front-shell';
import { useThemeStore } from '@/stores/app/theme.store';

type Tone = 'default' | 'success' | 'warning' | 'info';

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

const props = defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  legacyPath?: string;
  keywords?: string[];
  summary?: string[];
  metrics?: LegacyMetric[];
  sections?: LegacySection[];
  relatedLinks?: LegacyLink[];
}>();

const themeStore = useThemeStore();
</script>

<template>
  <OpsFactorLegacyScreenPage :theme-mode="themeStore.mode" v-bind="props" />
</template>
