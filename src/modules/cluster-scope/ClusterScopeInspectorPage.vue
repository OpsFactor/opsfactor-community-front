<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { ClusterScopeInspectorService } from './cluster-scope.service';
import type {
  CommunityLocationClusterMember,
  CommunityLocationClusterRule,
  CommunityLocationClusterScope,
  CommunityMaterialClusterRule,
  CommunityMaterialClusterScope,
} from './cluster-scope.types';

type ClusterEditorTab = 'material' | 'location';
type PendingClusterDeletion = { kind: ClusterEditorTab; id: number; description: string };

const materialStatusOptions = ['NOT RELEASED', 'REGULAR', 'DISCONTINUED'] as const;
const locationTypeOptions = [
  'Internal',
  'End Client',
  'Distributor',
  'Supplier',
  'Commercial Region',
  'Transshipment Point',
] as const;

const clusterScopeInspectorService = new ClusterScopeInspectorService(httpClient);
const materialClusters = ref<CommunityMaterialClusterScope[]>([]);
const locationClusters = ref<CommunityLocationClusterScope[]>([]);
const activeTab = ref<ClusterEditorTab>('material');
const selectedMaterialClusterId = ref<number | null>(null);
const selectedLocationClusterId = ref<number | null>(null);
const materialDraft = ref<CommunityMaterialClusterScope | null>(null);
const locationDraft = ref<CommunityLocationClusterScope | null>(null);
const locationClusterMembers = ref<CommunityLocationClusterMember[] | null>(null);
const locationClusterMembersClusterId = ref<number | null>(null);
const pendingDeletion = ref<PendingClusterDeletion | null>(null);
const loading = ref(false);
const loadingDetail = ref(false);
const saving = ref(false);
const deleting = ref(false);
const loadingLocationClusterMembers = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const isBusy = computed(() => loading.value || loadingDetail.value || saving.value || deleting.value);
const selectedLocationCluster = computed(() => locationClusters.value.find(
  (cluster) => cluster.id === selectedLocationClusterId.value,
) ?? null);
const hasLocationClusterMembersSnapshot = computed(() => selectedLocationCluster.value !== null
  && locationClusterMembersClusterId.value === selectedLocationCluster.value.id
  && locationClusterMembers.value !== null);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function cloneSnapshot<T>(snapshot: T): T {

  return JSON.parse(JSON.stringify(snapshot)) as T;
}

function materialClusterLabel(cluster: CommunityMaterialClusterScope): string {

  return cluster.description?.trim() ? `${cluster.description} (#${cluster.id})` : `Material cluster #${cluster.id}`;
}

function locationClusterLabel(cluster: CommunityLocationClusterScope): string {

  return cluster.description?.trim() ? `${cluster.description} (#${cluster.id})` : `Location cluster #${cluster.id}`;
}

function formatCriterion(criterion: string | null): string {

  if (criterion === 'STATUS_PRODUTO' || criterion === 'Status') return 'Material status';
  if (criterion === 'TIPO_LOCATION' || criterion === 'Location Type') return 'Location type';
  if (criterion === 'PAIS_ESTADO' || criterion === 'Country / State') return 'Country / state';
  return criterion?.trim() || 'Criterion not returned';
}

function materialRuleValue(rule: CommunityMaterialClusterRule): string {

  return rule.caracteristicaDTO?.description?.trim()
    || rule.caracteristicaDTO?.descricao?.trim()
    || 'Value not returned';
}

function locationRuleValue(rule: CommunityLocationClusterRule): string {

  if (rule.criterio === 'TIPO_LOCATION' || rule.criterio === 'Location Type') return rule.locationType?.trim() || 'Value not returned';
  if (rule.criterio === 'PAIS_ESTADO' || rule.criterio === 'Country / State') {
    const country = rule.pais?.trim();
    const state = rule.estado?.trim();
    return [country, state].filter((value): value is string => Boolean(value)).join(' / ') || 'Value not returned';
  }
  return 'Value not returned';
}

function clearLocationMembersSnapshot(): void {

  locationClusterMembers.value = null;
  locationClusterMembersClusterId.value = null;
}

function newMaterialDraft(): CommunityMaterialClusterScope {

  return {
    id: null,
    description: '',
    priority: null,
    process: 'DP',
    regraAlocacaoClusterDTOList: [],
  };
}

function newLocationDraft(): CommunityLocationClusterScope {

  return {
    id: null,
    description: '',
    priority: null,
    regraAlocacaoClusterDTOList: [],
  };
}

/** Loads only the two bounded definition catalogs; allocation and DFU endpoints stay absent. */
async function loadClusterDefinitions(): Promise<void> {

  if (loading.value || saving.value || deleting.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    const [materialClusterList, locationClusterList] = await Promise.all([
      clusterScopeInspectorService.getMaterialClusters(),
      clusterScopeInspectorService.getLocationClusters(),
    ]);
    materialClusters.value = materialClusterList;
    locationClusters.value = locationClusterList;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load cluster definitions.');
  } finally {
    loading.value = false;
  }
}

/** Replaces a browser draft with the authoritative Material DP snapshot before editing. */
async function selectMaterialCluster(): Promise<void> {

  const clusterId = selectedMaterialClusterId.value;
  materialDraft.value = null;
  errorMessage.value = null;
  resultMessage.value = null;
  if (clusterId === null || loading.value || loadingDetail.value || deleting.value) {
    return;
  }

  loadingDetail.value = true;
  try {
    materialDraft.value = cloneSnapshot(await clusterScopeInspectorService.getMaterialCluster(clusterId));
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the material cluster definition.');
  } finally {
    loadingDetail.value = false;
  }
}

/** Replaces a browser draft with the authoritative Location snapshot before editing. */
async function selectLocationCluster(): Promise<void> {

  const clusterId = selectedLocationClusterId.value;
  locationDraft.value = null;
  clearLocationMembersSnapshot();
  errorMessage.value = null;
  resultMessage.value = null;
  if (clusterId === null || loading.value || loadingDetail.value || deleting.value) {
    return;
  }

  loadingDetail.value = true;
  try {
    locationDraft.value = cloneSnapshot(await clusterScopeInspectorService.getLocationCluster(clusterId));
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the location cluster definition.');
  } finally {
    loadingDetail.value = false;
  }
}

function startMaterialCreation(): void {

  if (isBusy.value) {
    return;
  }

  activeTab.value = 'material';
  selectedMaterialClusterId.value = null;
  materialDraft.value = newMaterialDraft();
  errorMessage.value = null;
  resultMessage.value = null;
}

function startLocationCreation(): void {

  if (isBusy.value) {
    return;
  }

  activeTab.value = 'location';
  selectedLocationClusterId.value = null;
  locationDraft.value = newLocationDraft();
  clearLocationMembersSnapshot();
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Adds only a Community status rule; NEW and characteristics do not exist in this surface. */
function addMaterialRule(): void {

  if (materialDraft.value === null || saving.value) {
    return;
  }

  materialDraft.value.regraAlocacaoClusterDTOList.push({
    id: null,
    criterio: 'Status',
    caracteristicaDTO: { description: 'REGULAR', caracteristicaId: 'REGULAR' },
  });
}

/** Adds a new mutable Location rule. Existing persisted rules are never structurally changed in place. */
function addLocationRule(): void {

  if (locationDraft.value === null || saving.value) {
    return;
  }

  locationDraft.value.regraAlocacaoClusterDTOList.push({
    id: null,
    criterio: 'Location Type',
    locationType: 'Internal',
  });
}

/** Removing a persisted rule from the full snapshot is the backend-supported delete semantic. */
function removeMaterialRule(index: number): void {

  materialDraft.value?.regraAlocacaoClusterDTOList.splice(index, 1);
}

/** Removing a persisted rule from the full snapshot is the backend-supported delete semantic. */
function removeLocationRule(index: number): void {

  locationDraft.value?.regraAlocacaoClusterDTOList.splice(index, 1);
}

/** Normalizes the fixed status object required by the historical material-rule DTO. */
function normalizeMaterialRule(rule: CommunityMaterialClusterRule): void {

  const status = rule.caracteristicaDTO?.description?.trim() || 'REGULAR';
  rule.criterio = 'Status';
  rule.caracteristicaDTO = { description: status, caracteristicaId: status };
}

/** Keeps the polymorphic Location DTO aligned with its selected Community-only criterion. */
function normalizeLocationRule(rule: CommunityLocationClusterRule): void {

  if (rule.criterio === 'Country / State') {
    rule.locationType = undefined;
    rule.pais ??= '';
    rule.estado ??= '';
    return;
  }

  rule.criterio = 'Location Type';
  rule.pais = undefined;
  rule.estado = undefined;
  rule.locationType ??= 'Internal';
}

/** Number inputs may produce an empty string at runtime; the API represents an omitted priority as null. */
function normalizePriority(snapshot: { priority: number | null }): void {

  const runtimePriority = snapshot.priority as unknown;
  if (runtimePriority === '') {
    snapshot.priority = null;
    return;
  }
  if (snapshot.priority !== null && !Number.isInteger(snapshot.priority)) {
    throw new Error('Cluster priority must be an integer when informed.');
  }
}

function validateMaterialSnapshot(snapshot: CommunityMaterialClusterScope): void {

  snapshot.process = 'DP';
  normalizePriority(snapshot);
  for (const rule of snapshot.regraAlocacaoClusterDTOList) {
    normalizeMaterialRule(rule);
    const status = rule.caracteristicaDTO?.description;
    if (!materialStatusOptions.includes(status as typeof materialStatusOptions[number])) {
      throw new Error('Material rules must use Not Released, Regular, or Discontinued status.');
    }
  }
}

function validateLocationSnapshot(snapshot: CommunityLocationClusterScope): void {

  normalizePriority(snapshot);
  for (const rule of snapshot.regraAlocacaoClusterDTOList) {
    normalizeLocationRule(rule);
    if (rule.criterio === 'Location Type' && !locationTypeOptions.includes(rule.locationType as typeof locationTypeOptions[number])) {
      throw new Error('Select one of the Community location types.');
    }
    if (rule.criterio === 'Country / State' && (!rule.pais?.trim() || !rule.estado?.trim())) {
      throw new Error('Country and state are required for a Country / State rule.');
    }
  }
}

/** Saves one complete definition snapshot, then discards it in favour of fresh server catalogs. */
async function saveMaterialDraft(): Promise<void> {

  const draft = materialDraft.value;
  if (draft === null || saving.value) {
    return;
  }

  try {
    validateMaterialSnapshot(draft);
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Review the material cluster rules before saving.');
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  const savedId = draft.id;
  try {
    await clusterScopeInspectorService.saveMaterialCluster(cloneSnapshot(draft));
    await loadClusterDefinitionsAfterMutation();
    if (savedId !== null) {
      selectedMaterialClusterId.value = savedId;
      await selectMaterialCluster();
    } else {
      materialDraft.value = null;
    }
    resultMessage.value = 'Material Demand Planning cluster saved and reloaded from the server.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save the material cluster definition.');
  } finally {
    saving.value = false;
  }
}

/** Saves one complete definition snapshot, then discards it in favour of fresh server catalogs. */
async function saveLocationDraft(): Promise<void> {

  const draft = locationDraft.value;
  if (draft === null || saving.value) {
    return;
  }

  try {
    validateLocationSnapshot(draft);
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Review the Location Cluster rules before saving.');
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  const savedId = draft.id;
  try {
    await clusterScopeInspectorService.saveLocationCluster(cloneSnapshot(draft));
    clearLocationMembersSnapshot();
    await loadClusterDefinitionsAfterMutation();
    if (savedId !== null) {
      selectedLocationClusterId.value = savedId;
      await selectLocationCluster();
    } else {
      locationDraft.value = null;
    }
    resultMessage.value = 'Location cluster saved and reloaded from the server.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save the location cluster definition.');
  } finally {
    saving.value = false;
  }
}

/** Allows a forced authoritative reload while a save/delete is in progress. */
async function loadClusterDefinitionsAfterMutation(): Promise<void> {

  const [materialClusterList, locationClusterList] = await Promise.all([
    clusterScopeInspectorService.getMaterialClusters(),
    clusterScopeInspectorService.getLocationClusters(),
  ]);
  materialClusters.value = materialClusterList;
  locationClusters.value = locationClusterList;
}

function requestClusterDeletion(kind: ClusterEditorTab): void {

  const draft = kind === 'material' ? materialDraft.value : locationDraft.value;
  if (draft?.id === null || draft?.id === undefined || isBusy.value) {
    return;
  }

  pendingDeletion.value = {
    kind,
    id: draft.id,
    description: draft.description?.trim() || `${kind === 'material' ? 'Material' : 'Location'} cluster #${draft.id}`,
  };
}

/** Sends only the selected cluster deletion; no browser cascade or dependent-record inference is attempted. */
async function confirmClusterDeletion(): Promise<void> {

  const deletion = pendingDeletion.value;
  if (deletion === null || deleting.value) {
    return;
  }

  deleting.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    if (deletion.kind === 'material') {
      await clusterScopeInspectorService.deleteMaterialCluster({ id: deletion.id, process: 'DP' });
      selectedMaterialClusterId.value = null;
      materialDraft.value = null;
    } else {
      await clusterScopeInspectorService.deleteLocationCluster({ id: deletion.id });
      selectedLocationClusterId.value = null;
      locationDraft.value = null;
      clearLocationMembersSnapshot();
    }
    pendingDeletion.value = null;
    await loadClusterDefinitionsAfterMutation();
    resultMessage.value = `${deletion.kind === 'material' ? 'Material' : 'Location'} cluster deleted and catalogs reloaded from the server.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to delete the cluster. It may still be in use.');
  } finally {
    deleting.value = false;
  }
}

/** Captures one unpaginated member snapshot only after the explicit Location action. */
async function loadSelectedLocationClusterMembers(): Promise<void> {

  const clusterLocationsId = selectedLocationCluster.value?.id;
  if (clusterLocationsId === undefined || clusterLocationsId === null || loadingLocationClusterMembers.value
      || locationClusterMembersClusterId.value === clusterLocationsId) {
    return;
  }

  loadingLocationClusterMembers.value = true;
  errorMessage.value = null;
  try {
    locationClusterMembers.value = await clusterScopeInspectorService.getLocationClusterMembers(clusterLocationsId);
    locationClusterMembersClusterId.value = clusterLocationsId;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load active Location Cluster members.');
  } finally {
    loadingLocationClusterMembers.value = false;
  }
}

onMounted(() => {
  void loadClusterDefinitions();
});
</script>

<template>
  <TaskPageLayout class="cluster-scope-inspector-page">
    <OfxPageHeader eyebrow="Demand Planning" title="Demand Planning Clusters" description="Configure the bounded material and location cluster definitions used by Community Demand Planning." />

    <OfxSectionCard class="boundary-card" title="Community scope">
      <p>Material clusters always use Demand Planning and one permitted material status. Location clusters use either location type or country and state. Saving sends the complete rule snapshot.</p>
      <p class="muted">Pricing, new-material rules, characteristics, global allocation, material members, and DFUs are intentionally unavailable. The server remains responsible for rejecting a cluster that is still in use.</p>
    </OfxSectionCard>

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="workspace-card" aria-label="Demand Planning cluster configuration">
      <div class="tab-list" role="tablist" aria-label="Cluster type">
        <button :aria-selected="activeTab === 'material'" class="tab-button" role="tab" type="button" @click="activeTab = 'material'">Material DP</button>
        <button :aria-selected="activeTab === 'location'" class="tab-button" role="tab" type="button" @click="activeTab = 'location'">Location</button>
      </div>

      <section v-if="activeTab === 'material'" class="editor-layout" aria-labelledby="material-cluster-title">
        <aside class="master-list">
          <div class="list-heading"><h2 id="material-cluster-title">Material clusters</h2><button class="secondary-button" type="button" :disabled="isBusy" @click="startMaterialCreation">New Material DP cluster</button></div>
          <label>Existing cluster<select v-model.number="selectedMaterialClusterId" :disabled="isBusy" @change="void selectMaterialCluster()"><option :value="null">Select a material cluster</option><option v-for="(cluster, index) in materialClusters" :key="cluster.id ?? `material-catalog-${index}`" :value="cluster.id">{{ materialClusterLabel(cluster) }}</option></select></label>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="void loadClusterDefinitions()">{{ loading ? 'Loading…' : 'Refresh catalog' }}</button>
          <p class="muted">A selected cluster is re-read before editing. New clusters appear in this catalog after their confirmed server save.</p>
        </aside>

        <section v-if="materialDraft" class="editor-card" aria-labelledby="material-editor-title">
          <div class="editor-heading"><div><p class="eyebrow">Complete server snapshot</p><h2 id="material-editor-title">{{ materialDraft.id === null ? 'New Material DP cluster' : materialClusterLabel(materialDraft) }}</h2></div><span class="process-chip">DP</span></div>
          <div class="field-grid"><label>Description<input v-model="materialDraft.description" :disabled="saving" maxlength="255" type="text"></label><label>Priority<input v-model.number="materialDraft.priority" :disabled="saving" type="number"></label></div>
          <section class="rules-editor" aria-labelledby="material-rules-title"><div class="rules-heading"><div><h3 id="material-rules-title">Material status rules</h3><p class="muted">To change a persisted rule, remove it and add a new rule. This preserves the server snapshot contract.</p></div><button class="secondary-button" type="button" :disabled="saving" @click="addMaterialRule">Add status rule</button></div>
            <article v-for="(rule, index) in materialDraft.regraAlocacaoClusterDTOList" :key="rule.id ?? `new-material-rule-${index}`" class="rule-card"><label>Status<select v-model="rule.caracteristicaDTO!.description" :disabled="saving || rule.id !== null" @change="normalizeMaterialRule(rule)"><option v-for="status in materialStatusOptions" :key="status" :value="status">{{ status }}</option></select></label><span v-if="rule.id !== null" class="persisted-note">Persisted rule — remove and add to change status.</span><button class="danger-button" type="button" :disabled="saving" @click="removeMaterialRule(index)">Remove rule</button></article>
            <p v-if="materialDraft.regraAlocacaoClusterDTOList.length === 0" class="muted">No rules: saving this snapshot removes all existing material rules.</p>
          </section>
          <div class="editor-actions"><button class="danger-button" type="button" :disabled="saving || materialDraft.id === null" @click="requestClusterDeletion('material')">Delete cluster</button><button class="primary-button" type="button" :disabled="saving" @click="void saveMaterialDraft()">{{ saving ? 'Saving…' : 'Save complete snapshot' }}</button></div>
        </section>
        <section v-else class="empty-editor">Select an existing Material DP cluster or create a new one.</section>
      </section>

      <section v-else class="editor-layout" aria-labelledby="location-cluster-title">
        <aside class="master-list">
          <div class="list-heading"><h2 id="location-cluster-title">Location clusters</h2><button class="secondary-button" type="button" :disabled="isBusy" @click="startLocationCreation">New Location cluster</button></div>
          <label>Existing cluster<select v-model.number="selectedLocationClusterId" :disabled="isBusy" @change="void selectLocationCluster()"><option :value="null">Select a location cluster</option><option v-for="(cluster, index) in locationClusters" :key="cluster.id ?? `location-catalog-${index}`" :value="cluster.id">{{ locationClusterLabel(cluster) }}</option></select></label>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="void loadClusterDefinitions()">{{ loading ? 'Loading…' : 'Refresh catalog' }}</button>
          <p class="muted">A selected cluster is re-read before editing. The active-member snapshot below remains a separate manual read.</p>
        </aside>

        <section v-if="locationDraft" class="editor-card" aria-labelledby="location-editor-title">
          <div class="editor-heading"><div><p class="eyebrow">Complete server snapshot</p><h2 id="location-editor-title">{{ locationDraft.id === null ? 'New Location cluster' : locationClusterLabel(locationDraft) }}</h2></div></div>
          <div class="field-grid"><label>Description<input v-model="locationDraft.description" :disabled="saving" maxlength="255" type="text"></label><label>Priority<input v-model.number="locationDraft.priority" :disabled="saving" type="number"></label></div>
          <section class="rules-editor" aria-labelledby="location-rules-title"><div class="rules-heading"><div><h3 id="location-rules-title">Location rules</h3><p class="muted">To change a persisted rule, remove it and add a new rule. Only the two Community criteria are available.</p></div><button class="secondary-button" type="button" :disabled="saving" @click="addLocationRule">Add location rule</button></div>
            <article v-for="(rule, index) in locationDraft.regraAlocacaoClusterDTOList" :key="rule.id ?? `new-location-rule-${index}`" class="rule-card location-rule-card"><label>Criterion<select v-model="rule.criterio" :disabled="saving || rule.id !== null" @change="normalizeLocationRule(rule)"><option value="Location Type">Location type</option><option value="Country / State">Country / state</option></select></label><label v-if="rule.criterio === 'Location Type'">Location type<select v-model="rule.locationType" :disabled="saving || rule.id !== null"><option v-for="locationType in locationTypeOptions" :key="locationType" :value="locationType">{{ locationType }}</option></select></label><template v-else><label>Country<input v-model="rule.pais" :disabled="saving || rule.id !== null" maxlength="50" type="text"></label><label>State<input v-model="rule.estado" :disabled="saving || rule.id !== null" maxlength="50" type="text"></label></template><span v-if="rule.id !== null" class="persisted-note">Persisted rule — remove and add to change its structure.</span><button class="danger-button" type="button" :disabled="saving" @click="removeLocationRule(index)">Remove rule</button></article>
            <p v-if="locationDraft.regraAlocacaoClusterDTOList.length === 0" class="muted">No rules: saving this snapshot removes all existing location rules.</p>
          </section>
          <div class="editor-actions"><button class="danger-button" type="button" :disabled="saving || locationDraft.id === null" @click="requestClusterDeletion('location')">Delete cluster</button><button class="primary-button" type="button" :disabled="saving" @click="void saveLocationDraft()">{{ saving ? 'Saving…' : 'Save complete snapshot' }}</button></div>
        </section>
        <section v-else class="empty-editor">Select an existing Location cluster or create a new one.</section>
      </section>
    </OfxSectionCard>

    <OfxSectionCard v-if="activeTab === 'location' && selectedLocationCluster" class="location-members-section" aria-labelledby="location-cluster-members-title">
      <div><p class="eyebrow">Projection-backed snapshot</p><h2 id="location-cluster-members-title">Active Location Cluster members</h2><p class="muted">This unpaginated list is fetched only after an explicit action. It remains separate from editing and is never used to infer a delete cascade.</p></div>
      <button v-if="!hasLocationClusterMembersSnapshot" class="primary-button" type="button" :disabled="loadingLocationClusterMembers || isBusy" @click="void loadSelectedLocationClusterMembers()">{{ loadingLocationClusterMembers ? 'Loading active members…' : 'Load active members' }}</button>
      <p v-else class="captured-message" role="status">Active-member snapshot captured. Reload is intentionally unavailable for this selected cluster.</p>
      <div v-if="hasLocationClusterMembersSnapshot" class="members-table-wrapper"><table><thead><tr><th>ID</th><th>Description</th><th>Type</th><th>Active</th><th>Country</th><th>State</th><th>City</th></tr></thead><tbody><tr v-for="location in locationClusterMembers" :key="location.id"><td>{{ location.id }}</td><td>{{ location.description || '—' }}</td><td>{{ location.locationType || '—' }}</td><td>{{ location.active === null ? '—' : String(location.active) }}</td><td>{{ location.country || '—' }}</td><td>{{ location.state || '—' }}</td><td>{{ location.city || '—' }}</td></tr></tbody></table><p v-if="locationClusterMembers?.length === 0" class="muted">No active locations were returned for this cluster.</p></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="pendingDeletion" class="confirmation" role="dialog" aria-modal="true" aria-labelledby="delete-cluster-title"><h2 id="delete-cluster-title">Delete {{ pendingDeletion.kind === 'material' ? 'Material DP' : 'Location' }} cluster?</h2><p><strong>{{ pendingDeletion.description }}</strong> will be sent to the server for deletion. The page does not remove linked plans or records locally. If it is still referenced, the backend message will be shown here.</p><div class="editor-actions"><button class="secondary-button" type="button" :disabled="deleting" @click="pendingDeletion = null">Keep cluster</button><button class="danger-button" type="button" :disabled="deleting" @click="void confirmClusterDeletion()">{{ deleting ? 'Deleting…' : 'Delete cluster' }}</button></div></OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .workspace-card, .editor-card, .location-members-section { display: grid; gap: 1rem; margin-bottom: 1rem; }.boundary-card h2, .editor-card h2, .rules-editor h3, .location-members-section h2 { margin: 0; }.boundary-card p, .muted { color: var(--ofx-muted); }.boundary-card p { margin: 0; }.tab-list { border-bottom: 1px solid #dce2ec; display: flex; gap: .5rem; }.tab-button, .primary-button, .secondary-button, .danger-button { border: 1px solid #c8d0de; border-radius: .5rem; background: white; cursor: pointer; padding: .65rem .9rem; width: fit-content; }.tab-button { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }.tab-button[aria-selected='true'] { border-color: var(--ofx-accent); background: #eeeaff; color: #332285; font-weight: 700; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.danger-button { border-color: #c93c32; background: #fff7f6; color: #9d2019; }.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled, .tab-button:disabled { cursor: not-allowed; opacity: .55; }.editor-layout { display: grid; gap: 1rem; grid-template-columns: minmax(15rem, 20rem) minmax(0, 1fr); }.master-list, .editor-card, .empty-editor { border: 1px solid #e2e7f0; border-radius: .75rem; padding: 1rem; }.master-list { align-content: start; display: grid; gap: 1rem; }.list-heading, .editor-heading, .rules-heading, .editor-actions { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }.list-heading h2, .editor-heading h2, .rules-heading h3 { margin: 0; }.master-list label, .field-grid label, .rule-card label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.master-list select, .field-grid input, .rule-card input, .rule-card select { border: 1px solid #c8d0de; border-radius: .5rem; background: white; min-height: 2.5rem; padding: .55rem; }.master-list p, .rules-heading p { margin: 0; }.editor-heading p { margin: 0; }.process-chip, .persisted-note { color: var(--ofx-muted); font-size: .82rem; }.process-chip { border: 1px solid #d8d0ff; border-radius: 999px; padding: .35rem .6rem; }.field-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.rules-editor { display: grid; gap: .75rem; border-top: 1px solid #e2e7f0; padding-top: 1rem; }.rule-card { align-items: end; border-left: 3px solid #e7e2ff; display: grid; gap: .75rem; grid-template-columns: minmax(14rem, 1fr) auto auto; padding: .75rem; }.location-rule-card { grid-template-columns: repeat(3, minmax(10rem, 1fr)) auto auto; }.empty-editor { color: var(--ofx-muted); display: grid; min-height: 10rem; place-content: center; }.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; margin-bottom: 1rem; padding: .8rem 1rem; }.error { color: #b42318; }.location-members-section p { margin: 0; }.members-table-wrapper { max-width: 100%; overflow-x: auto; }.members-table-wrapper table { border-collapse: collapse; min-width: 50rem; width: 100%; }.members-table-wrapper th, .members-table-wrapper td { border-bottom: 1px solid #e7e2ff; padding: .65rem; text-align: left; vertical-align: top; white-space: nowrap; }.members-table-wrapper th { color: var(--ofx-muted); font-size: .78rem; }.captured-message { border-left: 3px solid #70b694; padding-left: .75rem; }.confirmation { border: 1px solid #f0b7b2; border-radius: 1rem; background: #fff8f7; margin-top: 1rem; max-width: 44rem; padding: 1.5rem; }.confirmation h2 { margin-top: 0; }.compact-hero { margin-bottom: 1rem; }@media (max-width: 60rem) { .editor-layout { grid-template-columns: 1fr; }.rule-card, .location-rule-card { grid-template-columns: 1fr; }.editor-actions { align-items: stretch; }.editor-actions button { width: 100%; } }
</style>
