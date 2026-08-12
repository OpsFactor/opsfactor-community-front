<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import { OfxPageHeader, type OfxTableColumn } from '@opsfactor/front-shell';
import OfxDataTable from '@/components/ofx/data-display/OfxDataTable.vue';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import { httpClient } from '../../services/community-authentication.service';
import { ClusterScopeInspectorService } from './cluster-scope.service';
import type {
  CommunityClusterDeleteRequest,
  CommunityLocationClusterMember,
  CommunityLocationClusterRule,
  CommunityLocationClusterScope,
  CommunityMaterialCharacteristic,
  CommunityMaterialClusterMember,
  CommunityMaterialClusterRule,
  CommunityMaterialClusterScope,
} from './cluster-scope.types';

type ClusterDimension = 'material' | 'location';
type PendingClusterDeletion = { dimension: ClusterDimension; id: number; description: string };

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
const materialCharacteristics = ref<CommunityMaterialCharacteristic[]>([]);
const locationClusters = ref<CommunityLocationClusterScope[]>([]);
const activeDimension = ref<ClusterDimension>('material');
const selectedMaterialClusterId = ref<number | null>(null);
const selectedLocationClusterId = ref<number | null>(null);
const materialDraft = ref<CommunityMaterialClusterScope | null>(null);
const locationDraft = ref<CommunityLocationClusterScope | null>(null);
const materialClusterMembers = ref<CommunityMaterialClusterMember[] | null>(null);
const materialClusterMembersClusterId = ref<number | null>(null);
const locationClusterMembers = ref<CommunityLocationClusterMember[] | null>(null);
const locationClusterMembersClusterId = ref<number | null>(null);
const pendingDeletion = ref<PendingClusterDeletion | null>(null);
const loading = ref(false);
const loadingDetail = ref(false);
const saving = ref(false);
const deleting = ref(false);
const loadingLocationClusterMembers = ref(false);
const loadingMaterialClusterMembers = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const isBusy = computed(() => loading.value || loadingDetail.value || saving.value || deleting.value);
const dimensionOptions = [
  { label: 'Material clusters', value: 'material' },
  { label: 'Location clusters', value: 'location' },
];
const materialCriterionOptions = [
  { label: 'Material status', value: 'Status' },
  { label: 'Material characteristic', value: 'Characteristic' },
];
const locationCriterionOptions = [
  { label: 'Location type', value: 'Location Type' },
  { label: 'Country / state', value: 'Country / State' },
];
const materialStatusFieldOptions = materialStatusOptions.map((status) => ({ label: status, value: status }));
const locationTypeFieldOptions = locationTypeOptions.map((locationType) => ({ label: locationType, value: locationType }));
const materialCharacteristicOptions = computed(() => materialCharacteristics.value.map((characteristic) => ({
  label: characteristic.descricao,
  value: characteristic.caracteristicaId,
})));
const activeClusterOptions = computed(() => (activeDimension.value === 'material' ? materialClusters.value : locationClusters.value)
  .filter((cluster) => cluster.id !== null)
  .map((cluster) => ({
    label: `#${cluster.id} · ${cluster.description?.trim() || 'Untitled cluster'}`,
    value: String(cluster.id),
  })));
const selectedClusterValue = computed({
  get: () => String(activeDimension.value === 'material' ? selectedMaterialClusterId.value ?? '' : selectedLocationClusterId.value ?? ''),
  set: (value: string) => {
    const clusterId = value ? Number(value) : null;
    if (activeDimension.value === 'material') {
      selectedMaterialClusterId.value = clusterId;
      void selectMaterialCluster();
      return;
    }
    selectedLocationClusterId.value = clusterId;
    void selectLocationCluster();
  },
});
const activeDraft = computed(() => activeDimension.value === 'material' ? materialDraft.value : locationDraft.value);
const selectedMaterialCluster = computed(() => materialClusters.value.find(
  (cluster) => cluster.id === selectedMaterialClusterId.value,
) ?? null);
const selectedLocationCluster = computed(() => locationClusters.value.find(
  (cluster) => cluster.id === selectedLocationClusterId.value,
) ?? null);
const hasLocationClusterMembersSnapshot = computed(() => selectedLocationCluster.value !== null
  && locationClusterMembersClusterId.value === selectedLocationCluster.value.id
  && locationClusterMembers.value !== null);
const hasMaterialClusterMembersSnapshot = computed(() => selectedMaterialCluster.value !== null
  && materialClusterMembersClusterId.value === selectedMaterialCluster.value.id
  && materialClusterMembers.value !== null);
const materialMemberRows = computed(() => (materialClusterMembers.value ?? []).map((material) => ({
  rowKey: material.id,
  id: material.id,
  description: material.description || '—',
  status: material.materialStatus || '—',
})));
const materialMemberColumns: OfxTableColumn[] = [
  { field: 'id', header: 'ID', width: '18%', dataType: 'text' },
  { field: 'description', header: 'Description', width: '58%', dataType: 'text' },
  { field: 'status', header: 'Status', width: '24%', dataType: 'text' },
];
const locationMemberRows = computed(() => (locationClusterMembers.value ?? []).map((location) => ({
  rowKey: location.id,
  id: location.id,
  description: location.description || '—',
  type: location.locationType || '—',
  country: location.country || '—',
  state: location.state || '—',
})));
const locationMemberColumns: OfxTableColumn[] = [
  { field: 'id', header: 'ID', width: '15%', dataType: 'text' },
  { field: 'description', header: 'Description', width: '35%', dataType: 'text' },
  { field: 'type', header: 'Type', width: '20%', dataType: 'text' },
  { field: 'country', header: 'Country', width: '15%', dataType: 'text' },
  { field: 'state', header: 'State', width: '15%', dataType: 'text' },
];

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function cloneSnapshot<T>(snapshot: T): T {

  return JSON.parse(JSON.stringify(snapshot)) as T;
}

function formatCriterion(criterion: string | null): string {

  if (criterion === 'STATUS_PRODUTO' || criterion === 'Status') return 'Material status';
  if (criterion === 'CARACTERISTICA' || criterion === 'Characteristic') return 'Material characteristic';
  if (criterion === 'TIPO_LOCATION' || criterion === 'Location Type') return 'Location type';
  if (criterion === 'PAIS_ESTADO' || criterion === 'Country / State') return 'Country / state';
  return criterion?.trim() || 'Criterion not returned';
}

function materialRuleSubject(rule: CommunityMaterialClusterRule): string {

  if (rule.criterio !== 'CARACTERISTICA' && rule.criterio !== 'Characteristic') {
    return rule.caracteristicaDTO?.description?.trim() || rule.caracteristicaDTO?.descricao?.trim() || 'Status not returned';
  }
  return rule.caracteristicaDTO?.description?.trim() || rule.caracteristicaDTO?.descricao?.trim() || 'Characteristic not returned';
}

function materialRuleValues(rule: CommunityMaterialClusterRule): string[] {

  const values = rule.caracteristicaDTO?.listaAtributos?.filter((value) => value.trim().length > 0) ?? [];
  return values.length > 0 ? values : [materialRuleSubject(rule)];
}

function materialRuleValueOptions(rule: CommunityMaterialClusterRule): Array<{ label: string; value: string }> {

  return (materialCharacteristics.value.find(
    (characteristic) => characteristic.caracteristicaId === rule.caracteristicaDTO?.caracteristicaId,
  )?.listaAtributos ?? []).map((value) => ({ label: value, value }));
}

function locationRuleValue(rule: CommunityLocationClusterRule): string {

  if (rule.criterio === 'TIPO_LOCATION' || rule.criterio === 'Location Type') return rule.locationType?.trim() || 'Value not returned';
  return [rule.pais?.trim(), rule.estado?.trim()].filter((value): value is string => Boolean(value)).join(' / ') || 'Value not returned';
}

function clearLocationMembersSnapshot(): void {

  locationClusterMembers.value = null;
  locationClusterMembersClusterId.value = null;
}

function clearMaterialMembersSnapshot(): void {

  materialClusterMembers.value = null;
  materialClusterMembersClusterId.value = null;
}

function newMaterialDraft(): CommunityMaterialClusterScope {

  return { id: null, description: '', priority: null, regraAlocacaoClusterDTOList: [] };
}

function newLocationDraft(): CommunityLocationClusterScope {

  return { id: null, description: '', priority: null, regraAlocacaoClusterDTOList: [] };
}

function selectDimension(dimension: ClusterDimension): void {

  activeDimension.value = dimension;
  errorMessage.value = null;
  resultMessage.value = null;
}

async function loadClusterDefinitions(): Promise<void> {

  if (loading.value || saving.value || deleting.value) return;

  let initialMaterialClusterId: number | null = null;
  loading.value = true;
  errorMessage.value = null;
  try {
    const [materialClusterList, locationClusterList, materialCharacteristicList] = await Promise.all([
      clusterScopeInspectorService.getMaterialClusters(),
      clusterScopeInspectorService.getLocationClusters(),
      clusterScopeInspectorService.getMaterialCharacteristics(),
    ]);
    materialClusters.value = materialClusterList;
    locationClusters.value = locationClusterList;
    materialCharacteristics.value = materialCharacteristicList;
    if (materialDraft.value === null && selectedMaterialClusterId.value === null) {
      initialMaterialClusterId = materialClusterList.find((cluster) => cluster.id !== null)?.id ?? null;
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load cluster definitions.');
  } finally {
    loading.value = false;
  }

  if (initialMaterialClusterId !== null) {
    selectedMaterialClusterId.value = initialMaterialClusterId;
    await selectMaterialCluster();
  }
}

async function selectMaterialCluster(): Promise<void> {

  const clusterId = selectedMaterialClusterId.value;
  materialDraft.value = null;
  clearMaterialMembersSnapshot();
  errorMessage.value = null;
  resultMessage.value = null;
  if (clusterId === null || loading.value || loadingDetail.value || deleting.value) return;

  loadingDetail.value = true;
  try {
    materialDraft.value = cloneSnapshot(await clusterScopeInspectorService.getMaterialCluster(clusterId));
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the material cluster definition.');
  } finally {
    loadingDetail.value = false;
  }

  if (materialDraft.value !== null) {
    void loadSelectedMaterialClusterMembers();
  }
}

async function selectLocationCluster(): Promise<void> {

  const clusterId = selectedLocationClusterId.value;
  locationDraft.value = null;
  clearLocationMembersSnapshot();
  errorMessage.value = null;
  resultMessage.value = null;
  if (clusterId === null || loading.value || loadingDetail.value || deleting.value) return;

  loadingDetail.value = true;
  try {
    locationDraft.value = cloneSnapshot(await clusterScopeInspectorService.getLocationCluster(clusterId));
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load the location cluster definition.');
  } finally {
    loadingDetail.value = false;
  }
}

function startCreation(): void {

  if (isBusy.value) return;

  errorMessage.value = null;
  resultMessage.value = null;
  if (activeDimension.value === 'material') {
    selectedMaterialClusterId.value = null;
    materialDraft.value = newMaterialDraft();
    clearMaterialMembersSnapshot();
    return;
  }
  selectedLocationClusterId.value = null;
  locationDraft.value = newLocationDraft();
  clearLocationMembersSnapshot();
}

async function loadSelectedMaterialClusterMembers(): Promise<void> {

  const clusterId = selectedMaterialCluster.value?.id;
  if (clusterId === undefined || clusterId === null || loadingMaterialClusterMembers.value || hasMaterialClusterMembersSnapshot.value) return;
  loadingMaterialClusterMembers.value = true;
  try {
    materialClusterMembers.value = await clusterScopeInspectorService.getMaterialClusterMembers(clusterId);
    materialClusterMembersClusterId.value = clusterId;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load active Material Cluster members.');
  } finally {
    loadingMaterialClusterMembers.value = false;
  }
}

function addMaterialRule(): void {

  materialDraft.value?.regraAlocacaoClusterDTOList.push({
    id: null,
    criterio: 'Status',
    caracteristicaDTO: { description: 'REGULAR', caracteristicaId: 'REGULAR' },
  });
}

function addMaterialCharacteristicRule(): void {

  const characteristic = materialCharacteristics.value[0];
  const firstAttribute = characteristic?.listaAtributos[0];
  if (materialDraft.value === null || characteristic === undefined || firstAttribute === undefined) {
    errorMessage.value = 'A published material characteristic with at least one value is required.';
    return;
  }
  materialDraft.value.regraAlocacaoClusterDTOList.push({
    id: null,
    criterio: 'Characteristic',
    caracteristicaDTO: {
      caracteristicaId: characteristic.caracteristicaId,
      description: characteristic.descricao,
      listaAtributos: [firstAttribute],
    },
  });
}

function addLocationRule(): void {

  locationDraft.value?.regraAlocacaoClusterDTOList.push({ id: null, criterio: 'Location Type', locationType: 'Internal' });
}

function removeMaterialRule(index: number): void {

  materialDraft.value?.regraAlocacaoClusterDTOList.splice(index, 1);
}

function removeLocationRule(index: number): void {

  locationDraft.value?.regraAlocacaoClusterDTOList.splice(index, 1);
}

function normalizeMaterialRule(rule: CommunityMaterialClusterRule): void {

  if (rule.criterio === 'Characteristic' || rule.criterio === 'CARACTERISTICA') {
    const characteristic = materialCharacteristics.value.find(
      (candidate) => candidate.caracteristicaId === rule.caracteristicaDTO?.caracteristicaId,
    ) ?? materialCharacteristics.value[0];
    if (characteristic === undefined) return;
    rule.criterio = 'Characteristic';
    rule.caracteristicaDTO = {
      caracteristicaId: characteristic.caracteristicaId,
      description: characteristic.descricao,
      listaAtributos: rule.caracteristicaDTO?.listaAtributos?.filter(
        (attribute) => characteristic.listaAtributos.includes(attribute),
      ) ?? [],
    };
    return;
  }
  const status = rule.caracteristicaDTO?.description?.trim() || 'REGULAR';
  rule.criterio = 'Status';
  rule.caracteristicaDTO = { description: status, caracteristicaId: status };
}

function selectMaterialCharacteristic(rule: CommunityMaterialClusterRule): void {

  const characteristic = materialCharacteristics.value.find(
    (candidate) => candidate.caracteristicaId === rule.caracteristicaDTO?.caracteristicaId,
  );
  if (characteristic === undefined) return;
  rule.criterio = 'Characteristic';
  rule.caracteristicaDTO = {
    caracteristicaId: characteristic.caracteristicaId,
    description: characteristic.descricao,
    listaAtributos: characteristic.listaAtributos.slice(0, 1),
  };
}

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

function normalizePriority(snapshot: { priority: number | null }): void {

  if ((snapshot.priority as unknown) === '') snapshot.priority = null;
  if (snapshot.priority !== null && !Number.isInteger(snapshot.priority)) {
    throw new Error('Cluster priority must be an integer when informed.');
  }
}

function validateMaterialSnapshot(snapshot: CommunityMaterialClusterScope): void {

  normalizePriority(snapshot);
  for (const rule of snapshot.regraAlocacaoClusterDTOList) {
    normalizeMaterialRule(rule);
    if (rule.criterio !== 'Characteristic') {
      if (!materialStatusOptions.includes(rule.caracteristicaDTO?.description as typeof materialStatusOptions[number])) {
        throw new Error('Material rules must use Not Released, Regular, or Discontinued status.');
      }
      continue;
    }
    const characteristic = materialCharacteristics.value.find(
      (candidate) => candidate.caracteristicaId === rule.caracteristicaDTO?.caracteristicaId,
    );
    const values = rule.caracteristicaDTO?.listaAtributos ?? [];
    if (characteristic === undefined || values.length === 0 || values.some((value) => !characteristic.listaAtributos.includes(value))) {
      throw new Error('Select at least one value from a published material characteristic.');
    }
  }
}

function validateLocationSnapshot(snapshot: CommunityLocationClusterScope): void {

  normalizePriority(snapshot);
  for (const rule of snapshot.regraAlocacaoClusterDTOList) {
    normalizeLocationRule(rule);
    if (rule.criterio === 'Location Type' && !locationTypeOptions.includes(rule.locationType as typeof locationTypeOptions[number])) {
      throw new Error('Select one of the available location types.');
    }
    if (rule.criterio === 'Country / State' && (!rule.pais?.trim() || !rule.estado?.trim())) {
      throw new Error('Country and state are required for a Country / State rule.');
    }
  }
}

async function loadClusterDefinitionsAfterMutation(): Promise<void> {

  const [materialClusterList, locationClusterList] = await Promise.all([
    clusterScopeInspectorService.getMaterialClusters(),
    clusterScopeInspectorService.getLocationClusters(),
  ]);
  materialClusters.value = materialClusterList;
  locationClusters.value = locationClusterList;
}

async function saveActiveDraft(): Promise<void> {

  if (saving.value) return;

  const isMaterial = activeDimension.value === 'material';
  const draft = isMaterial ? materialDraft.value : locationDraft.value;
  if (draft === null) return;
  try {
    if (isMaterial) validateMaterialSnapshot(draft as CommunityMaterialClusterScope);
    else validateLocationSnapshot(draft as CommunityLocationClusterScope);
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Review the cluster definition before saving.');
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  const savedId = draft.id;
  try {
    if (isMaterial) await clusterScopeInspectorService.saveMaterialCluster(cloneSnapshot(draft as CommunityMaterialClusterScope));
    else await clusterScopeInspectorService.saveLocationCluster(cloneSnapshot(draft as CommunityLocationClusterScope));
    clearLocationMembersSnapshot();
    clearMaterialMembersSnapshot();
    await loadClusterDefinitionsAfterMutation();
    if (savedId === null) {
      if (isMaterial) materialDraft.value = null;
      else locationDraft.value = null;
    } else if (isMaterial) {
      selectedMaterialClusterId.value = savedId;
      await selectMaterialCluster();
    } else {
      selectedLocationClusterId.value = savedId;
      await selectLocationCluster();
    }
    resultMessage.value = `${isMaterial ? 'Material' : 'Location'} cluster saved and reloaded from the server.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save the cluster definition.');
  } finally {
    saving.value = false;
  }
}

function requestClusterDeletion(): void {

  const draft = activeDraft.value;
  if (draft?.id === null || draft?.id === undefined || isBusy.value) return;
  pendingDeletion.value = {
    dimension: activeDimension.value,
    id: draft.id,
    description: draft.description?.trim() || `${activeDimension.value === 'material' ? 'Material' : 'Location'} cluster #${draft.id}`,
  };
}

async function confirmClusterDeletion(): Promise<void> {

  const deletion = pendingDeletion.value;
  if (deletion === null || deleting.value) return;

  deleting.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  const request: CommunityClusterDeleteRequest = { id: deletion.id };
  try {
    if (deletion.dimension === 'material') {
      await clusterScopeInspectorService.deleteMaterialCluster(request);
      selectedMaterialClusterId.value = null;
      materialDraft.value = null;
      clearMaterialMembersSnapshot();
    } else {
      await clusterScopeInspectorService.deleteLocationCluster(request);
      selectedLocationClusterId.value = null;
      locationDraft.value = null;
      clearLocationMembersSnapshot();
    }
    pendingDeletion.value = null;
    await loadClusterDefinitionsAfterMutation();
    resultMessage.value = `${deletion.dimension === 'material' ? 'Material' : 'Location'} cluster deleted and catalogs reloaded from the server.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to delete the cluster. It may still be in use.');
  } finally {
    deleting.value = false;
  }
}

async function loadSelectedLocationClusterMembers(): Promise<void> {

  const clusterId = selectedLocationCluster.value?.id;
  if (clusterId === undefined || clusterId === null || loadingLocationClusterMembers.value || hasLocationClusterMembersSnapshot.value) return;
  loadingLocationClusterMembers.value = true;
  errorMessage.value = null;
  try {
    locationClusterMembers.value = await clusterScopeInspectorService.getLocationClusterMembers(clusterId);
    locationClusterMembersClusterId.value = clusterId;
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
  <DashboardPageLayout class="clustering-page">
    <OfxPageHeader eyebrow="Configuration" title="Clustering" description="Create reusable material and location groups in one planning clustering scheme." />

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <section class="clustering-workbench" aria-label="Cluster definition workspace">
      <aside class="cluster-library" aria-label="Cluster selection">
        <div class="library-heading">
          <p class="eyebrow">Clusters</p>
        </div>

        <div class="library-selectors">
          <OfxSelectField
            :model-value="activeDimension"
            label="Dimension"
            :options="dimensionOptions"
            :disabled="isBusy"
            :show-placeholder-option="false"
            @update:model-value="selectDimension($event as ClusterDimension)"
          />
          <OfxSelectField
            v-model="selectedClusterValue"
            label="Cluster"
            :options="activeClusterOptions"
            :disabled="isBusy"
            placeholder-label="Select a cluster"
          />
        </div>

        <button class="primary-button create-button" type="button" :disabled="isBusy" @click="startCreation">
          New {{ activeDimension }} cluster
        </button>

      </aside>

      <main class="cluster-editor">
        <template v-if="activeDimension === 'material' && materialDraft">
          <header class="editor-heading">
            <div><p class="eyebrow">Material cluster {{ materialDraft.id === null ? '' : `#${materialDraft.id}` }}</p><h2>{{ materialDraft.id === null ? 'New material cluster' : materialDraft.description || 'Untitled material cluster' }}</h2></div>
            <span class="dimension-tag">Material</span>
          </header>
          <div class="definition-fields"><OfxTextField v-model="materialDraft.description" label="Description" :disabled="saving" maxlength="255" /><OfxTextField v-model="materialDraft.priority" label="Priority" :disabled="saving" type="number" /></div>
          <section class="rules-section" aria-labelledby="material-rules-title">
            <div class="rules-heading"><div><h3 id="material-rules-title">Membership rules</h3><p>Rules determine which materials belong to this cluster. Values in one characteristic are alternatives; separate rules are cumulative.</p></div><div class="rule-actions"><button class="secondary-button" type="button" :disabled="saving" @click="addMaterialRule">Add status</button><button class="secondary-button" type="button" :disabled="saving || materialCharacteristics.length === 0" @click="addMaterialCharacteristicRule">Add characteristic</button></div></div>
            <article v-for="(rule, index) in materialDraft.regraAlocacaoClusterDTOList" :key="rule.id ?? `new-material-rule-${index}`" class="rule-card">
              <template v-if="rule.id !== null"><div class="rule-summary"><span>{{ formatCriterion(rule.criterio) }}</span><strong>{{ materialRuleSubject(rule) }}</strong><div class="value-tags"><em v-for="value in materialRuleValues(rule)" :key="value">{{ value }}</em></div></div></template>
              <template v-else><div class="rule-inputs"><OfxSelectField v-model="rule.criterio" label="Criterion" :options="materialCriterionOptions" :disabled="saving" :show-placeholder-option="false" @update:model-value="normalizeMaterialRule(rule)" /><template v-if="rule.criterio === 'Characteristic' || rule.criterio === 'CARACTERISTICA'"><OfxSelectField v-model="rule.caracteristicaDTO!.caracteristicaId" label="Characteristic" :options="materialCharacteristicOptions" :disabled="saving" :show-placeholder-option="false" @update:model-value="selectMaterialCharacteristic(rule)" /><OfxEntityMultiSelect :model-value="rule.caracteristicaDTO!.listaAtributos ?? []" label="Values" :options="materialRuleValueOptions(rule)" :disabled="saving" placeholder="Select values" @update:model-value="rule.caracteristicaDTO!.listaAtributos = $event" /></template><OfxSelectField v-else v-model="rule.caracteristicaDTO!.description" label="Status" :options="materialStatusFieldOptions" :disabled="saving" :show-placeholder-option="false" @update:model-value="normalizeMaterialRule(rule)" /></div></template>
              <button class="icon-text danger-button" type="button" :disabled="saving" @click="removeMaterialRule(index)">Remove</button>
            </article>
            <p v-if="materialDraft.regraAlocacaoClusterDTOList.length === 0" class="empty-rules">Add a rule to define this material cluster.</p>
          </section>
        </template>

        <template v-else-if="activeDimension === 'location' && locationDraft">
          <header class="editor-heading"><div><p class="eyebrow">Location cluster {{ locationDraft.id === null ? '' : `#${locationDraft.id}` }}</p><h2>{{ locationDraft.id === null ? 'New location cluster' : locationDraft.description || 'Untitled location cluster' }}</h2></div><span class="dimension-tag">Location</span></header>
          <div class="definition-fields"><OfxTextField v-model="locationDraft.description" label="Description" :disabled="saving" maxlength="255" /><OfxTextField v-model="locationDraft.priority" label="Priority" :disabled="saving" type="number" /></div>
          <section class="rules-section" aria-labelledby="location-rules-title"><div class="rules-heading"><div><h3 id="location-rules-title">Membership rules</h3><p>Rules determine which locations belong to this cluster.</p></div><button class="secondary-button" type="button" :disabled="saving" @click="addLocationRule">Add location rule</button></div>
            <article v-for="(rule, index) in locationDraft.regraAlocacaoClusterDTOList" :key="rule.id ?? `new-location-rule-${index}`" class="rule-card"><template v-if="rule.id !== null"><div class="rule-summary"><span>{{ formatCriterion(rule.criterio) }}</span><strong>{{ locationRuleValue(rule) }}</strong></div></template><template v-else><div class="rule-inputs location-rule-inputs"><OfxSelectField v-model="rule.criterio" label="Criterion" :options="locationCriterionOptions" :disabled="saving" :show-placeholder-option="false" @update:model-value="normalizeLocationRule(rule)" /><OfxSelectField v-if="rule.criterio === 'Location Type'" v-model="rule.locationType" label="Location type" :options="locationTypeFieldOptions" :disabled="saving" :show-placeholder-option="false" /><template v-else><OfxTextField v-model="rule.pais" label="Country" :disabled="saving" maxlength="50" /><OfxTextField v-model="rule.estado" label="State" :disabled="saving" maxlength="50" /></template></div></template><button class="icon-text danger-button" type="button" :disabled="saving" @click="removeLocationRule(index)">Remove</button></article>
            <p v-if="locationDraft.regraAlocacaoClusterDTOList.length === 0" class="empty-rules">Add a rule to define this location cluster.</p>
          </section>
        </template>

        <section v-else class="empty-editor"><p class="eyebrow">Cluster definition</p><h2>Start with a cluster</h2><p>Select a cluster or create a new {{ activeDimension }} cluster.</p><button class="primary-button" type="button" :disabled="isBusy" @click="startCreation">New {{ activeDimension }} cluster</button></section>

        <footer v-if="activeDraft" class="editor-actions"><button v-if="activeDraft.id !== null" class="danger-button cluster-delete-button" type="button" :disabled="saving" @click="requestClusterDeletion">Delete cluster</button><button class="primary-button" type="button" :disabled="saving" @click="void saveActiveDraft()">{{ saving ? 'Saving…' : 'Save cluster' }}</button></footer>

        <section v-if="activeDimension === 'material' && selectedMaterialCluster" class="members-section"><div><p class="eyebrow">Cluster members</p><h3>Materials in this cluster</h3><p>Resolved from the current cluster definition.</p></div><p v-if="loadingMaterialClusterMembers" class="snapshot-status">Loading materials…</p><div v-else class="members-table"><OfxDataTable v-if="materialMemberRows.length" :rows="materialMemberRows" :columns="materialMemberColumns" row-key="rowKey" :dense="true" :page-size="10" text-size="xs" export-base-name="cluster-material-members" /><p v-else>No active materials were returned.</p></div></section>
        <section v-if="activeDimension === 'location' && selectedLocationCluster" class="members-section"><div><p class="eyebrow">Cluster members</p><h3>Locations in this cluster</h3><p>Resolved from the current cluster definition.</p></div><button v-if="!hasLocationClusterMembersSnapshot" class="secondary-button" type="button" :disabled="loadingLocationClusterMembers || isBusy" @click="void loadSelectedLocationClusterMembers()">{{ loadingLocationClusterMembers ? 'Loading…' : 'Load members' }}</button><p v-else class="snapshot-status">Member snapshot loaded.</p><div v-if="hasLocationClusterMembersSnapshot" class="members-table"><OfxDataTable v-if="locationMemberRows.length" :rows="locationMemberRows" :columns="locationMemberColumns" row-key="rowKey" :dense="true" :page-size="10" text-size="xs" export-base-name="cluster-location-members" /><p v-else>No active locations were returned.</p></div></section>
      </main>
    </section>

    <section v-if="pendingDeletion" class="delete-confirmation" role="dialog" aria-modal="true" aria-labelledby="delete-cluster-title"><div><p class="eyebrow">Confirm deletion</p><h2 id="delete-cluster-title">Delete this cluster?</h2><p><strong>{{ pendingDeletion.description }}</strong> will be sent to the server for deletion. Linked plans and records are not removed by this page.</p></div><div><button class="secondary-button" type="button" :disabled="deleting" @click="pendingDeletion = null">Keep cluster</button><button class="danger-button" type="button" :disabled="deleting" @click="void confirmClusterDeletion()">{{ deleting ? 'Deleting…' : 'Delete cluster' }}</button></div></section>
  </DashboardPageLayout>
</template>

<style scoped>
.clustering-page { display: grid; gap: 1.25rem; }
.clustering-workbench { display: grid; grid-template-columns: minmax(17.5rem, 20rem) minmax(0, 1fr); gap: 1.25rem; align-items: stretch; }
.cluster-library, .cluster-editor, .delete-confirmation { border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-surface-elevated); }
.cluster-library { display: flex; flex-direction: column; min-height: 42rem; padding: 1.25rem; }
.editor-heading h2, .empty-editor h2, .rules-heading h3, .members-section h3, .delete-confirmation h2 { margin: 0; color: var(--ofx-text); }
.rules-heading p, .members-section p, .empty-editor p { margin: .45rem 0 0; color: var(--ofx-text-muted); font-size: .875rem; line-height: 1.5; }
.eyebrow { margin: 0 0 .3rem; color: var(--ofx-text-muted); font-size: .6875rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
.library-selectors { display: grid; gap: 1rem; margin: 1.5rem 0 .9rem; }
.create-button { width: 100%; }
.empty-rules { margin: 1rem 0 0; border: 1px dashed var(--ofx-border); border-radius: 10px; padding: .8rem; color: var(--ofx-text-muted); font-size: .8125rem; }
.cluster-editor { display: grid; align-content: start; min-width: 0; padding: 1.5rem; }
.editor-heading, .rules-heading, .editor-actions, .delete-confirmation, .members-section { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.editor-heading { padding-bottom: 1.25rem; border-bottom: 1px solid var(--ofx-border); }.editor-heading h2 { font-size: 1.3rem; }.dimension-tag { border-radius: 999px; background: color-mix(in srgb, var(--ofx-primary) 10%, var(--ofx-surface)); padding: .35rem .65rem; color: var(--ofx-primary); font-size: .75rem; font-weight: 700; }
.definition-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(8.5rem, 10rem); gap: 1rem; min-width: 0; padding: 1.25rem 0; }.definition-fields > *, .rule-inputs > * { min-width: 0; }
.rules-section { display: grid; gap: .8rem; border-top: 1px solid var(--ofx-border); padding-top: 1.25rem; }.rules-heading h3 { font-size: 1rem; }.rule-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.rule-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border: 1px solid var(--ofx-border); border-left: 3px solid var(--ofx-primary); border-radius: 10px; background: var(--ofx-surface); padding: .9rem 1rem; }.rule-summary { display: grid; min-width: 0; gap: .3rem; }.rule-summary > span { color: var(--ofx-text-muted); font-size: .7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }.rule-summary strong { color: var(--ofx-text); font-size: .875rem; }.value-tags { display: flex; flex-wrap: wrap; gap: .3rem; }.value-tags em { border: 1px solid color-mix(in srgb, var(--ofx-primary) 20%, var(--ofx-border)); border-radius: 999px; padding: .16rem .45rem; color: var(--ofx-text); font-size: .75rem; font-style: normal; }.rule-inputs { display: grid; grid-template-columns: minmax(10rem, .85fr) minmax(12rem, 1fr) minmax(13rem, 1.15fr); flex: 1; gap: .8rem; }.location-rule-inputs { grid-template-columns: repeat(3, minmax(10rem, 1fr)); }
.editor-actions { display: grid; grid-template-columns: 1fr auto; align-items: center; margin-top: 1.25rem; border-top: 1px solid var(--ofx-border); padding-top: 1.25rem; }.cluster-delete-button { justify-self: start; }.empty-editor { display: grid; align-content: center; justify-items: start; min-height: 25rem; }.empty-editor p { max-width: 35rem; margin-bottom: 1.25rem; }
.members-section { display: grid; grid-template-columns: 1fr auto; margin-top: 1.25rem; border-top: 1px solid var(--ofx-border); padding-top: 1.25rem; }.members-section h3 { font-size: 1rem; }.members-table { grid-column: 1 / -1; min-width: 0; }.snapshot-status { align-self: center; margin: 0 !important; color: #146c43 !important; font-weight: 650; }
.primary-button, .secondary-button, .danger-button { display: inline-flex; min-height: 2.5rem; align-items: center; justify-content: center; border: 1px solid var(--ofx-border); border-radius: 9px; background: var(--ofx-surface); padding: .45rem .85rem; color: var(--ofx-text); cursor: pointer; font: inherit; font-size: .875rem; font-weight: 650; white-space: nowrap; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.secondary-button:hover:not(:disabled) { border-color: var(--ofx-primary); color: var(--ofx-primary); }.danger-button { border-color: #e5aaa5; background: #fff8f7; color: #a42b22; }.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled { cursor: not-allowed; opacity: .5; }.primary-button:focus-visible, .secondary-button:focus-visible, .danger-button:focus-visible { outline: 2px solid var(--ofx-primary); outline-offset: 2px; }
.success-message, .error-message { margin: 0; border-radius: 10px; padding: .75rem 1rem; }.success-message { border: 1px solid #70b694; background: #ebf8ef; color: #146c43; }.error-message { border: 1px solid #efbab5; background: #fff7f6; color: #b42318; }.delete-confirmation { align-items: center; border-color: #efbab5; background: #fff8f7; padding: 1.25rem 1.5rem; }.delete-confirmation p:not(.eyebrow) { max-width: 43rem; margin: .45rem 0 0; color: var(--ofx-text-muted); line-height: 1.5; }.delete-confirmation > div:last-child { display: flex; gap: .6rem; }
@media (max-width: 68rem) { .clustering-workbench { grid-template-columns: 1fr; }.cluster-library { min-height: auto; }.rule-inputs, .location-rule-inputs { grid-template-columns: 1fr 1fr; } }
@media (max-width: 46rem) { .cluster-editor, .cluster-library { padding: 1rem; }.editor-heading, .rules-heading, .rule-card, .delete-confirmation { flex-direction: column; }.definition-fields, .rule-inputs, .location-rule-inputs, .members-section { grid-template-columns: 1fr; }.members-table { grid-column: auto; }.editor-actions { grid-template-columns: 1fr; gap: .75rem; }.editor-actions button, .rule-card .danger-button { width: 100%; }.delete-confirmation > div:last-child { width: 100%; }.delete-confirmation > div:last-child button { flex: 1; } }
</style>
