<script setup lang="ts">
import { OfxButton } from '@opsfactor/front-shell';
import { computed, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { MaterialStatusesInspectorService } from './material-statuses.service';
import type { CommunityMaterialStatus } from './material-statuses.types';

const materialStatusesInspectorService = new MaterialStatusesInspectorService(httpClient);
const statuses = ref<CommunityMaterialStatus[] | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const hasSnapshot = computed(() => statuses.value !== null);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

/** Captures the server-owned enum once; this inspector does not refresh or mutate it. */
async function loadStatuses(): Promise<void> {

  if (loading.value || statuses.value !== null) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    statuses.value = await materialStatusesInspectorService.getStatuses();
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the Material Status catalog.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <TaskPageLayout class="material-statuses-inspector-page">
    <OfxPageHeader
      eyebrow="Configuration"
      title="Material Status Catalog"
      description="Inspect the raw status names accepted by the service."
    />

    <OfxSectionCard class="boundary-card" title="Allowed values, not effective lifecycle">
      <p>This explicit GET returns only the allowed status names. It does not load materials, resolve a lifecycle status or expose a material list.</p>
      <OfxButton variant="secondary" icon="open" v-if="!hasSnapshot" type="button" :disabled="loading" @click="loadStatuses">{{ loading ? 'Loading catalog…' : 'Load Material Status Catalog' }}</OfxButton>
      <p v-else class="captured-message" role="status">Catalog captured. Refresh is intentionally unavailable on this page.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="statuses" class="catalog-card" title="Published statuses">
      <div>
        <p class="eyebrow">Raw server enum</p>
      </div>
      <ul v-if="statuses.length > 0" class="status-list">
        <li v-for="status in statuses" :key="status">{{ status }}</li>
      </ul>
      <p v-else class="muted">The server published an empty Material Status catalog.</p>
    </OfxSectionCard>
    <OfxSectionCard v-else-if="!loading" class="empty-state">Load the catalog to inspect the raw status enum.</OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .catalog-card { display: grid; gap: 1rem; margin-bottom: 1rem; }.boundary-card h2, .catalog-card h2 { margin: 0; }.boundary-card p, .catalog-card p { margin: 0; }.boundary-card p, .muted, .empty-state { color: var(--ofx-muted); }.captured-message { border-left: 3px solid #70b694; padding-left: .75rem; }.status-list { display: grid; gap: .65rem; list-style: none; margin: 0; padding: 0; }.status-list li { border-left: 3px solid #e7e2ff; font-family: monospace; font-weight: 700; overflow-wrap: anywhere; padding-left: .75rem; }.error { color: #b42318; }.empty-state { margin-bottom: 1rem; }.compact-hero { margin-bottom: 1rem; }
</style>
