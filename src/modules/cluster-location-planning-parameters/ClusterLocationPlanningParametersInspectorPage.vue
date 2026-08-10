<script setup lang="ts">
import { computed, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { ClusterLocationPlanningParametersInspectorService } from './cluster-location-planning-parameters.service';
import type { CommunityClusterLocationPlanningParameter } from './cluster-location-planning-parameters.types';

const clusterLocationPlanningParametersInspectorService =
  new ClusterLocationPlanningParametersInspectorService(httpClient);
const parameters = ref<CommunityClusterLocationPlanningParameter[] | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const hasSnapshot = computed(() => parameters.value !== null);

function formatRawValue(value: string | number | boolean | null | undefined): string {

  return value === null || value === undefined || value === '' ? 'Not informed' : String(value);
}

/** Captures the full administrative snapshot once; it intentionally has no refresh action. */
async function loadParameters(): Promise<void> {

  if (loading.value || parameters.value !== null) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    parameters.value = await clusterLocationPlanningParametersInspectorService.getParameters();
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Unable to load Location Cluster planning parameters.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <TaskPageLayout class="cluster-location-planning-parameters-page">
    <OfxPageHeader eyebrow="Administration" title="Location Cluster Planning Parameters" description="Inspect the registered Demand Planning inclusion flags for Location Clusters." />

    <OfxSectionCard class="boundary-card" title="Read-only administrative snapshot">
      <p>This explicit GET returns the complete administrative list and is not paginated. It is not a list of members, DFUs, or currently eligible records.</p>
      <button v-if="!hasSnapshot" class="primary-button" type="button" :disabled="loading" @click="loadParameters">
        {{ loading ? 'Loading parameters…' : 'Load Location Cluster Parameters' }}
      </button>
      <p v-else class="captured-message" role="status">Administrative snapshot captured. Refresh is intentionally unavailable on this page.</p>
      <p class="boundary-note">Pricing is not editable in this view. The published value is shown as returned by the service.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <template v-if="parameters">
      <OfxSectionCard v-if="parameters.length === 0" class="empty-state">
        The server returned no Location Cluster planning parameters.
      </OfxSectionCard>

      <OfxSectionCard v-else class="results-card">
        <header class="results-header">
          <div>
            <h2>Registered parameters</h2>
            <p>Raw server values only. This page does not resolve cluster members, DFUs, allocation, or effective planning eligibility.</p>
          </div>
          <span>{{ parameters.length }} cluster{{ parameters.length === 1 ? '' : 's' }}</span>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parameter ID</th>
                <th>Location Cluster</th>
                <th>Location Cluster ID</th>
                <th>Plan Demand Planning</th>
                <th>Plan Pricing</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="parameter in parameters" :key="`${parameter.id}-${parameter.clusterLocationsID ?? ''}`">
                <td>{{ formatRawValue(parameter.id) }}</td>
                <td>{{ formatRawValue(parameter.clusterLocations) }}</td>
                <td>{{ formatRawValue(parameter.clusterLocationsID) }}</td>
                <td>{{ formatRawValue(parameter.planejaDP) }}</td>
                <td>{{ formatRawValue(parameter.planejaPricing) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </OfxSectionCard>
    </template>

    <OfxSectionCard v-else-if="!loading" class="empty-state">
      Load the administrative snapshot to inspect Location Cluster planning parameters.
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .results-card { display: grid; gap: 1rem; }.boundary-card h2, .results-card h2, .boundary-card p, .results-card p { margin: 0; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .7rem 1rem; width: fit-content; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.boundary-note, .results-card p, .empty-state { color: var(--ofx-text-muted); }.captured-message { border-left: 3px solid #70b694; padding-left: .75rem; }.error { color: var(--ofx-text-danger); }.results-header { align-items: start; display: flex; gap: 1rem; justify-content: space-between; }.results-header span { color: var(--ofx-text-muted); white-space: nowrap; }.table-wrap { overflow-x: auto; }table { border-collapse: collapse; min-width: 55rem; width: 100%; }th, td { border-bottom: 1px solid var(--ofx-border); padding: .65rem; text-align: left; vertical-align: top; }th { background: var(--ofx-surface-muted); color: var(--ofx-text-muted); font-size: .78rem; }td { overflow-wrap: anywhere; }
</style>
