<script setup lang="ts">
import ReportPageLayout from './ReportPageLayout.vue';
import OfxPageHeader from './OfxPageHeader.vue';
import OfxSectionCard from './OfxSectionCard.vue';

const props = defineProps<{
  title: string;
  description: string;
  moduleName: string;
}>();
</script>

<template>
  <ReportPageLayout>
    <OfxPageHeader :eyebrow="props.moduleName" :title="props.title" :description="props.description" />
    <OfxSectionCard
      title="Module overview"
      description="Choose the planning or configuration page that matches the task you want to complete."
    >
      <p class="text-sm text-[color:var(--ofx-text-muted)]">Choose a page from the navigation to continue.</p>
    </OfxSectionCard>
  </ReportPageLayout>
</template>
