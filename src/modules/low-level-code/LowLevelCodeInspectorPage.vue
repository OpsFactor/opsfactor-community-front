<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import {
  communityNamedOptionLabel,
  loadCommunityMaterials,
  loadCommunitySupplyNetworkVersions,
  type CommunityNamedOption,
} from '../../services/community-option-catalog.service';
import { LowLevelCodeInspectorService } from './low-level-code.service';
import type { CommunityLowLevelCodeSnapshot } from './low-level-code.types';

const lowLevelCodeInspectorService = new LowLevelCodeInspectorService(httpClient);
const supplyNetworkVersionId = ref('');
const materialId = ref('');
const supplyNetworkVersions = ref<CommunityNamedOption[]>([]);
const materials = ref<CommunityNamedOption[]>([]);
const lowLevelCodeSnapshot = ref<CommunityLowLevelCodeSnapshot | null>(null);
const loading = ref(false);
const loadingOptions = ref(true);
const errorMessage = ref<string | null>(null);

const canLoad = computed(() => supplyNetworkVersionId.value.trim().length > 0 && materialId.value.trim().length > 0);
const nodes = computed(() => lowLevelCodeSnapshot.value?.nodeDTOSet ?? []);
const edges = computed(() => lowLevelCodeSnapshot.value?.edgeDTOSet ?? []);

function formatRawValue(value: string | number | null): string {

  return value === null || value === '' ? '—' : String(value);
}

/** Reads exactly one material graph only after both operational identities are explicitly informed. */
async function loadLowLevelCode(): Promise<void> {

  if (!canLoad.value || loading.value) return;

  loading.value = true;
  errorMessage.value = null;
  lowLevelCodeSnapshot.value = null;
  try {
    lowLevelCodeSnapshot.value = await lowLevelCodeInspectorService.getMaterialSnapshot(
      supplyNetworkVersionId.value,
      materialId.value,
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the Low Level Code material diagnostic.';
  } finally {
    loading.value = false;
  }
}

/** Loads the same persisted selectors used by the Planning Front diagnostic screens. */
onMounted(async () => {

  try {
    [supplyNetworkVersions.value, materials.value] = await Promise.all([
      loadCommunitySupplyNetworkVersions(),
      loadCommunityMaterials(),
    ]);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the Low Level Code selectors.';
  } finally {
    loadingOptions.value = false;
  }

});
</script>

<template>
  <TaskPageLayout class="low-level-code-page">
    <OfxPageHeader
      eyebrow="Supply Planning"
      title="Low Level Code Inspector"
      description="Inspect the raw supply dependency path for one explicit material and Supply Network Version."
    />

    <OfxSectionCard class="boundary-card" title="Read-only technical diagnostic">
      <p>The backend resolves the selected material path from existing projections. The browser shows the returned nodes and directed edges as tables; it does not create a graph, calculate levels, or infer dependencies.</p>
      <p>No full Low Level Code map, optimizer, Supply Network Flows, GIS, costs, freight, execution, scheduler, Data or mutation is available here.</p>
    </OfxSectionCard>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="selector-card" title="Material path" description="Explicit diagnostic.">
      <div class="field-grid">
        <label>Supply Network Version<select v-model="supplyNetworkVersionId" :disabled="loading || loadingOptions"><option value="" disabled>Select a Supply Network Version</option><option v-for="version in supplyNetworkVersions" :key="version.id" :value="version.id">{{ communityNamedOptionLabel(version) }}</option></select></label>
        <label>Material<select v-model="materialId" :disabled="loading || loadingOptions"><option value="" disabled>Select a material</option><option v-for="material in materials" :key="material.id" :value="material.id">{{ communityNamedOptionLabel(material) }}</option></select></label>
      </div>
      <div class="actions"><button class="primary-button" type="button" :disabled="!canLoad || loading" @click="void loadLowLevelCode()">{{ loading ? 'Loading…' : 'Load material path' }}</button></div>
    </OfxSectionCard>

    <template v-if="lowLevelCodeSnapshot">
      <OfxSectionCard class="result-card" title="Nodes" description="Node level is calculated by the server and is displayed without browser-side recomputation.">
        <p v-if="nodes.length === 0" class="empty-state">No nodes were returned for this material path.</p>
        <div v-else class="table-scroll"><table><thead><tr><th>Type</th><th>ID</th><th>Label</th><th>Level</th></tr></thead><tbody><tr v-for="(node, index) in nodes" :key="`${node.id ?? 'node'}-${index}`"><td>{{ formatRawValue(node.tipo) }}</td><td>{{ formatRawValue(node.id) }}</td><td>{{ formatRawValue(node.label) }}</td><td>{{ formatRawValue(node.level) }}</td></tr></tbody></table></div>
      </OfxSectionCard>
      <OfxSectionCard class="result-card" title="Directed edges" description="Edge direction and labels remain exactly as returned by the diagnostic.">
        <p v-if="edges.length === 0" class="empty-state">No directed edges were returned for this material path.</p>
        <div v-else class="table-scroll"><table><thead><tr><th>From</th><th>To</th><th>Label</th></tr></thead><tbody><tr v-for="(edge, index) in edges" :key="`${edge.from ?? 'from'}-${edge.to ?? 'to'}-${index}`"><td>{{ formatRawValue(edge.from) }}</td><td>{{ formatRawValue(edge.to) }}</td><td>{{ formatRawValue(edge.label) }}</td></tr></tbody></table></div>
      </OfxSectionCard>
    </template>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .selector-card, .result-card { display: grid; gap: 1rem; }.boundary-card p, .empty-state { color: var(--ofx-text-muted); }.field-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }.field-grid label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.field-grid select { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); min-height: 2.5rem; padding: .55rem; }.actions { display: flex; justify-content: flex-end; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; width: fit-content; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.table-scroll { overflow-x: auto; }.table-scroll table { border-collapse: collapse; min-width: 52rem; width: 100%; }.table-scroll th, .table-scroll td { border-bottom: 1px solid var(--ofx-border); padding: .7rem; text-align: left; vertical-align: top; white-space: nowrap; }.table-scroll th { color: var(--ofx-text-muted); font-size: .75rem; text-transform: uppercase; }.error { color: var(--ofx-text-danger); }@media (max-width: 48rem) { .actions { justify-content: stretch; }.primary-button { width: 100%; } }
</style>
