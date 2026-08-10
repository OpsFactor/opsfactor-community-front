<script setup lang="ts">
import { computed, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { RouterLink } from 'vue-router';
import { httpClient } from '../../services/community-authentication.service';
import { MaterialMasterDataCatalogService } from './material-master-data.service';
import type {
  CommunityMaterial,
  CommunityMaterialCluster,
  MaterialMasterDataCatalogTab,
} from './material-master-data.types';

const materialMasterDataCatalogService = new MaterialMasterDataCatalogService(httpClient);
const activeTab = ref<MaterialMasterDataCatalogTab>('materials');
const materials = ref<CommunityMaterial[] | null>(null);
const materialClusters = ref<CommunityMaterialCluster[] | null>(null);
const selectedMaterialClusterId = ref<number | null>(null);
const selectedMaterialClusterMembers = ref<CommunityMaterial[] | null>(null);
const loadingScope = ref<'materials' | 'clusters' | 'members' | null>(null);
const errorMessage = ref<string | null>(null);

const isLoadingMaterials = computed(() => loadingScope.value === 'materials');
const isLoadingClusters = computed(() => loadingScope.value === 'clusters');
const isLoadingMembers = computed(() => loadingScope.value === 'members');
const selectedMaterialCluster = computed(() => materialClusters.value?.find((cluster) => cluster.id === selectedMaterialClusterId.value) ?? null);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function formatValue(value: unknown): string {

  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function selectTab(tab: MaterialMasterDataCatalogTab): void {

  if (loadingScope.value !== null) return;

  activeTab.value = tab;
  errorMessage.value = null;
}

/** Loads the complete material catalog only after the user requests this tab's data. */
async function loadMaterials(): Promise<void> {

  loadingScope.value = 'materials';
  errorMessage.value = null;
  try {
    materials.value = await materialMasterDataCatalogService.getMaterials();
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load materials.');
  } finally {
    loadingScope.value = null;
  }
}

/** Loads cluster headers only; cluster-member requests are intentionally separate. */
async function loadMaterialClusters(): Promise<void> {

  loadingScope.value = 'clusters';
  errorMessage.value = null;
  selectedMaterialClusterId.value = null;
  selectedMaterialClusterMembers.value = null;
  try {
    materialClusters.value = await materialMasterDataCatalogService.getMaterialClusters();
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load material clusters.');
  } finally {
    loadingScope.value = null;
  }
}

/** A changed selection invalidates the old snapshot without triggering a new request. */
function selectMaterialCluster(clusterId: number): void {

  if (loadingScope.value !== null) return;

  selectedMaterialClusterId.value = clusterId;
  selectedMaterialClusterMembers.value = null;
  errorMessage.value = null;
}

/** Reads members for exactly the selected cluster after a distinct user command. */
async function loadSelectedMaterialClusterMembers(): Promise<void> {

  const cluster = selectedMaterialCluster.value;
  if (cluster === null || loadingScope.value !== null) return;

  loadingScope.value = 'members';
  errorMessage.value = null;
  try {
    selectedMaterialClusterMembers.value = await materialMasterDataCatalogService.getMaterialClusterMembers(cluster.id);
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load material-cluster members.');
  } finally {
    loadingScope.value = null;
  }
}
</script>

<template>
  <TaskPageLayout class="material-master-data-catalog-page">
    <OfxPageHeader eyebrow="Master data" title="Material Master-Data Catalog" description="Read materials and material-cluster membership without duplicating the Data lifecycle.">
      <template #actions><RouterLink class="link-button" to="/data">Open Data Operations</RouterLink></template>
    </OfxPageHeader>
    <OfxSectionCard class="boundary-card" title="Available information"><p>This catalog is read-only. Creation, update, activation, import and deletion stay in Data Operations.</p><p>It does not load filters, characteristics, Pricing, material succession, global allocation or DFU combinations.</p></OfxSectionCard>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="catalog-card" aria-labelledby="material-master-data-title">
      <div class="section-heading"><div><p class="eyebrow">Catalog</p><h2 id="material-master-data-title">{{ activeTab === 'materials' ? 'Materials' : 'Material clusters' }}</h2></div><div class="actions"><button v-if="activeTab === 'materials'" class="primary-button" type="button" :disabled="loadingScope !== null" @click="void loadMaterials()">{{ isLoadingMaterials ? 'Loading…' : materials === null ? 'Load materials' : 'Reload materials' }}</button><button v-else class="primary-button" type="button" :disabled="loadingScope !== null" @click="void loadMaterialClusters()">{{ isLoadingClusters ? 'Loading…' : materialClusters === null ? 'Load material clusters' : 'Reload material clusters' }}</button></div></div>
      <div class="tabs" role="tablist" aria-label="Material master-data catalogs"><button class="tab-button" :class="{ active: activeTab === 'materials' }" type="button" role="tab" :aria-selected="activeTab === 'materials'" :disabled="loadingScope !== null" @click="selectTab('materials')">Materials</button><button class="tab-button" :class="{ active: activeTab === 'clusters' }" type="button" role="tab" :aria-selected="activeTab === 'clusters'" :disabled="loadingScope !== null" @click="selectTab('clusters')">Material clusters</button></div>
      <p class="muted">Selecting a tab never sends a request. Each catalog stays unloaded until its explicit action is used.</p>

      <template v-if="activeTab === 'materials'"><div v-if="materials !== null" class="table-scroll"><p v-if="materials.length === 0" class="empty-state">No materials were returned.</p><table v-else><thead><tr><th>Material</th><th>Description</th><th>Status</th><th>Active</th></tr></thead><tbody><tr v-for="material in materials" :key="material.id"><td>{{ formatValue(material.id) }}</td><td>{{ formatValue(material.description) }}</td><td>{{ formatValue(material.materialStatus) }}</td><td>{{ formatValue(material.active) }}</td></tr></tbody></table></div><p v-else class="empty-state">Load materials to retrieve the complete catalog.</p></template>

      <template v-else><div v-if="materialClusters !== null" class="cluster-layout"><div class="table-scroll"><p v-if="materialClusters.length === 0" class="empty-state">No material clusters were returned.</p><table v-else><thead><tr><th>Cluster</th><th>Description</th><th>Process</th><th>Priority</th></tr></thead><tbody><tr v-for="cluster in materialClusters" :key="cluster.id" :class="{ selected: selectedMaterialClusterId === cluster.id }"><td>{{ formatValue(cluster.id) }}</td><td>{{ formatValue(cluster.description) }}</td><td>{{ formatValue(cluster.process) }}</td><td>{{ formatValue(cluster.priority) }}</td><td><button class="secondary-button" type="button" :disabled="loadingScope !== null" @click="selectMaterialCluster(cluster.id)">{{ selectedMaterialClusterId === cluster.id ? 'Selected' : 'Select' }}</button></td></tr></tbody></table></div><aside class="member-panel"><p class="eyebrow">One selected cluster</p><h3>{{ selectedMaterialCluster ? formatValue(selectedMaterialCluster.description) : 'No cluster selected' }}</h3><p>Select one loaded cluster, then explicitly request its members. No member list is preloaded or inferred.</p><button class="primary-button" type="button" :disabled="selectedMaterialCluster === null || loadingScope !== null" @click="void loadSelectedMaterialClusterMembers()">{{ isLoadingMembers ? 'Loading…' : 'Load selected cluster members' }}</button><template v-if="selectedMaterialClusterMembers !== null"><p v-if="selectedMaterialClusterMembers.length === 0" class="empty-state">No members were returned for the selected cluster.</p><div v-else class="table-scroll member-table"><table><thead><tr><th>Material</th><th>Description</th><th>Status</th></tr></thead><tbody><tr v-for="material in selectedMaterialClusterMembers" :key="material.id"><td>{{ formatValue(material.id) }}</td><td>{{ formatValue(material.description) }}</td><td>{{ formatValue(material.materialStatus) }}</td></tr></tbody></table></div></template><p v-else class="empty-state">No member snapshot has been requested.</p></aside></div><p v-else class="empty-state">Load material clusters before selecting one cluster.</p></template>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .catalog-card, .member-panel { display: grid; gap: 1rem; }.boundary-card h2, .catalog-card h2, .member-panel h3, .boundary-card p, .catalog-card p, .member-panel p { margin: 0; }.boundary-card p, .muted, .empty-state, .member-panel p { color: var(--ofx-text-muted); }.link-button { border: 1px solid var(--ofx-border); border-radius: .5rem; color: var(--ofx-text); padding: .6rem .8rem; text-decoration: none; }.section-heading, .actions { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }.actions { align-items: center; justify-content: flex-end; }.tabs { display: flex; flex-wrap: wrap; gap: .5rem; }.tab-button, .primary-button, .secondary-button { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); cursor: pointer; padding: .65rem .8rem; }.tab-button.active { border-color: var(--ofx-accent); color: var(--ofx-accent); font-weight: 700; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.tab-button:disabled, .primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .55; }.table-scroll { overflow: auto; }.table-scroll table { border-collapse: collapse; min-width: 44rem; width: 100%; }.table-scroll th, .table-scroll td { border-bottom: 1px solid var(--ofx-border); padding: .7rem; text-align: left; vertical-align: top; white-space: nowrap; }.table-scroll th { color: var(--ofx-text-muted); font-size: .72rem; text-transform: uppercase; }.table-scroll tr.selected { background: var(--ofx-surface-muted); }.cluster-layout { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1.2fr) minmax(18rem, .8fr); }.member-panel { border: 1px solid var(--ofx-border); border-radius: .75rem; padding: 1rem; }.member-table table { min-width: 30rem; }@media (max-width: 56rem) { .section-heading, .actions { align-items: stretch; flex-direction: column; }.actions button, .primary-button, .secondary-button { width: 100%; }.cluster-layout { grid-template-columns: 1fr; } }
</style>
