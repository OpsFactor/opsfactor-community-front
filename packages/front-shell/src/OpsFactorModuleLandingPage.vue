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
      title="Foundation Placeholder"
      description="This module route is available inside the new OpsFactor shell. Phase 1 intentionally stops at layout, routing, and shared foundation components."
    >
      <p class="text-sm text-[color:var(--ofx-text-muted)]">Business pages will be added in Phase 3 after wrappers and backend assumptions are validated.</p>
    </OfxSectionCard>
  </ReportPageLayout>
</template>
