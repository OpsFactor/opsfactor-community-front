<script setup lang="ts">
import { computed, onMounted } from 'vue';
import OfxPageHeader from './OfxPageHeader.vue';
import OfxSectionCard from './OfxSectionCard.vue';
import TaskPageLayout from './TaskPageLayout.vue';

/**
 * Opens the backend-owned OpenAPI documentation without coupling either
 * edition host to a copied routing screen.
 */
const swaggerUrl = computed(() => '/app/swagger-ui');

onMounted(() => {
  window.location.assign(swaggerUrl.value);
});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader eyebrow="Data" title="Opening API Documentation" />

    <OfxSectionCard class="max-w-2xl">
      <p class="text-sm leading-7 text-[color:var(--ofx-text-muted)]">
        Redirecting to the backend Swagger UI.
      </p>
      <a
        :href="swaggerUrl"
        class="mt-6 inline-flex rounded-xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] px-4 py-2.5 text-sm font-medium text-[color:var(--ofx-text)] transition hover:border-[color:var(--ofx-border-strong)]"
      >
        Open Swagger UI
      </a>
    </OfxSectionCard>
  </TaskPageLayout>
</template>
