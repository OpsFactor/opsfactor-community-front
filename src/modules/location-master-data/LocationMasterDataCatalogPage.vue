<script setup lang="ts">
import { computed, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { LocationMasterDataCatalogService } from './location-master-data.service';
import type { CommunityLocationMasterData } from './location-master-data.types';

const locationMasterDataCatalogService = new LocationMasterDataCatalogService(httpClient);
const locations = ref<CommunityLocationMasterData[] | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const locationCountLabel = computed(() => locations.value === null ? '' : `${locations.value.length} locations`);

function formatValue(value: string | boolean | null): string {

  if (value === null || value === '') return '—';
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;

}

/** Reads the single complete backend snapshot only after an explicit user action. */
async function loadLocations(): Promise<void> {

  if (isLoading.value) return;

  isLoading.value = true;
  errorMessage.value = null;
  try {
    locations.value = await locationMasterDataCatalogService.getLocations();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load locations.';
  } finally {
    isLoading.value = false;
  }

}
</script>

<template>
  <TaskPageLayout class="location-master-data-catalog-page">
    <OfxPageHeader
      eyebrow="Master Data"
      title="Location Master-Data Catalog"
      description="Read the published Community location snapshot without duplicating Data lifecycle operations."
    />

    <OfxSectionCard class="boundary-card" title="Bounded Community scope">
      <p>This catalog is read-only. Creation, update, activation, deactivation, and import remain in Data Operations.</p>
      <p>It excludes clusters, members, allocation, characteristics, coordinates, deployment, and Enterprise geography.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="catalog-card" title="Locations">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Community catalog</p>
          <p v-if="locations !== null" class="muted">{{ locationCountLabel }} returned by the authoritative snapshot.</p>
          <p v-else class="muted">The catalog remains unloaded until requested.</p>
        </div>
        <button class="primary-button" type="button" :disabled="isLoading" @click="void loadLocations()">
          {{ isLoading ? 'Loading…' : locations === null ? 'Load locations' : 'Reload locations' }}
        </button>
      </div>

      <div v-if="locations !== null" class="table-scroll">
        <p v-if="locations.length === 0" class="empty-state">No locations were returned.</p>
        <table v-else>
          <thead>
            <tr>
              <th>Location</th><th>Description</th><th>Type</th><th>Active</th><th>Country</th><th>State</th><th>City</th>
              <th>Supply Planning Book</th><th>Production Planning Book</th><th>Inbound constraints</th>
              <th>Safety-stock indirect demand</th><th>Production constraints</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="location in locations" :key="location.id">
              <td>{{ formatValue(location.id) }}</td><td>{{ formatValue(location.description) }}</td><td>{{ formatValue(location.locationType) }}</td><td>{{ formatValue(location.active) }}</td>
              <td>{{ formatValue(location.country) }}</td><td>{{ formatValue(location.state) }}</td><td>{{ formatValue(location.city) }}</td>
              <td>{{ formatValue(location.showInSupplyPlanningBook) }}</td><td>{{ formatValue(location.showInProductionPlanningBook) }}</td>
              <td>{{ formatValue(location.applyInboundConstraints) }}</td><td>{{ formatValue(location.safetyStockConsiderIndirectDemand) }}</td><td>{{ formatValue(location.applyProductionConstraints) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">Load locations to retrieve the complete Community catalog.</p>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .catalog-card { display: grid; gap: 1rem; }
.section-heading { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }
.muted, .empty-state, .boundary-card p { color: var(--ofx-text-muted); }
.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .8rem; }
.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.table-scroll { overflow: auto; }
.table-scroll table { border-collapse: collapse; min-width: 105rem; width: 100%; }
.table-scroll th, .table-scroll td { border-bottom: 1px solid var(--ofx-border); padding: .7rem; text-align: left; vertical-align: top; white-space: nowrap; }
.table-scroll th { color: var(--ofx-text-muted); font-size: .72rem; text-transform: uppercase; }
@media (max-width: 56rem) { .section-heading { align-items: stretch; flex-direction: column; }.primary-button { width: 100%; } }
</style>
