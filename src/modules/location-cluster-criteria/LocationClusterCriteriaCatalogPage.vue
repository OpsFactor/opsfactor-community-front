<script setup lang="ts">
import { computed, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { LocationClusterCriteriaCatalogService } from './location-cluster-criteria.service';
import type { CommunityLocationClusterCriterion } from './location-cluster-criteria.types';

const locationClusterCriteriaCatalogService = new LocationClusterCriteriaCatalogService(httpClient);
const criteria = ref<CommunityLocationClusterCriterion[] | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const hasSnapshot = computed(() => criteria.value !== null);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

/** Captures the server-owned allowed enum once; this catalog never changes cluster configuration. */
async function loadCriteria(): Promise<void> {

  if (loading.value || criteria.value !== null) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    criteria.value = await locationClusterCriteriaCatalogService.getCriteria();
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the Location Cluster criteria catalog.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <TaskPageLayout class="location-cluster-criteria-catalog-page">
    <OfxPageHeader
      eyebrow="Configuration"
      title="Location Cluster Criteria Catalog"
      description="Inspect the raw criterion names allowed by the Community server."
    />

    <OfxSectionCard class="boundary-card" title="Allowed values, not cluster state">
      <p>This explicit GET returns only allowed criterion names. It does not load clusters, saved rules, members, effective allocation or eligibility.</p>
      <button v-if="!hasSnapshot" class="primary-button" type="button" :disabled="loading" @click="loadCriteria">{{ loading ? 'Loading catalog…' : 'Load allowed criteria' }}</button>
      <p v-else class="captured-message" role="status">Catalog captured. Refresh is intentionally unavailable on this page.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="criteria" class="catalog-card" title="Published criteria">
      <div>
        <p class="eyebrow">Raw server enum</p>
      </div>
      <ul v-if="criteria.length > 0" class="criteria-list">
        <li v-for="criterion in criteria" :key="criterion">{{ criterion }}</li>
      </ul>
      <p v-else class="muted">The server published an empty Location Cluster criteria catalog.</p>
    </OfxSectionCard>
    <OfxSectionCard v-else-if="!loading" class="empty-state">Load the catalog to inspect the raw criterion enum.</OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .catalog-card { display: grid; gap: 1rem; margin-bottom: 1rem; }.boundary-card h2, .catalog-card h2 { margin: 0; }.boundary-card p, .catalog-card p { margin: 0; }.boundary-card p, .muted, .empty-state { color: var(--ofx-muted); }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .7rem 1rem; width: fit-content; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.captured-message { border-left: 3px solid #70b694; padding-left: .75rem; }.criteria-list { display: grid; gap: .65rem; list-style: none; margin: 0; padding: 0; }.criteria-list li { border-left: 3px solid #e7e2ff; font-family: monospace; font-weight: 700; overflow-wrap: anywhere; padding-left: .75rem; }.error { color: #b42318; }.empty-state { margin-bottom: 1rem; }.compact-hero { margin-bottom: 1rem; }
</style>
