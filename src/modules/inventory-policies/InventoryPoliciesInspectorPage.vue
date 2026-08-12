<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, OfxSelectField, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import {
  communityNamedOptionLabel,
  loadCommunityInventoryPolicies,
  loadCommunityLocations,
  loadCommunityMaterials,
  type CommunityNamedOption,
} from '../../services/community-option-catalog.service';
import { InventoryPoliciesInspectorService } from './inventory-policies.service';
import {
  buildCommunityInventoryPolicyDraft,
  buildCommunityInventoryPolicySaveRequest,
  createCommunityInventoryPolicyRuleDraft,
  type CommunityInventoryPolicy,
  type CommunityInventoryPolicyDraft,
  type CommunityInventoryPolicySaveRequest,
} from './inventory-policies.types';

const inventoryPoliciesInspectorService = new InventoryPoliciesInspectorService(httpClient);
const inventoryPolicyId = ref('');
const capturedInventoryPolicyId = ref<string | null>(null);
const inventoryPolicy = ref<CommunityInventoryPolicy | null>(null);
const inventoryPolicyIds = ref<string[]>([]);
const materials = ref<CommunityNamedOption[]>([]);
const locations = ref<CommunityNamedOption[]>([]);
const draft = ref<CommunityInventoryPolicyDraft | null>(null);
const pendingSaveSnapshot = ref<CommunityInventoryPolicySaveRequest | null>(null);
const loading = ref(false);
const loadingOptions = ref(true);
const saving = ref(false);
const editing = ref(false);
const saveConfirmationOpen = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const hasSnapshot = computed(() => inventoryPolicy.value !== null);
const isBusy = computed(() => loading.value || saving.value);
const inventoryPolicyOptions = computed(() => inventoryPolicyIds.value.map((policyId) => ({ label: policyId, value: policyId })));
const materialOptions = computed(() => [
  { label: 'Select a material', value: '' },
  ...materials.value.map((material) => ({ label: communityNamedOptionLabel(material), value: material.id })),
]);
const locationOptions = computed(() => [
  { label: 'Select a location', value: '' },
  ...locations.value.map((location) => ({ label: communityNamedOptionLabel(location), value: location.id })),
]);
const replenishmentModelOptions = [
  { label: 'DRP', value: 'DRP' },
  { label: 'KANBAN', value: 'KANBAN' },
];
const operationalModelOptions = [
  { label: 'MTS', value: 'MTS' },
  { label: 'MTO', value: 'MTO' },
];
const safetyStockCalculationOptions = [
  { label: 'Days', value: 'DAYS' },
  { label: 'Quantity', value: 'QUANTITY' },
];

function formatValue(value: string | number | null | undefined): string {

  return value === null || value === undefined || value === '' ? 'Not informed' : String(value);

}

/** Captures a policy only after the user supplies its functional identifier. */
async function loadInventoryPolicy(): Promise<void> {

  const requestedInventoryPolicyId = inventoryPolicyId.value.trim();
  if (requestedInventoryPolicyId.length === 0) {
    errorMessage.value = 'An inventory policy ID is required.';
    return;
  }
  if (isBusy.value || editing.value || capturedInventoryPolicyId.value === requestedInventoryPolicyId) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  inventoryPolicy.value = null;
  try {
    const loadedInventoryPolicy = await inventoryPoliciesInspectorService.getPolicy(requestedInventoryPolicyId);
    inventoryPolicy.value = loadedInventoryPolicy;
    capturedInventoryPolicyId.value = loadedInventoryPolicy.id;
    inventoryPolicyId.value = loadedInventoryPolicy.id;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the inventory policy.';
  } finally {
    loading.value = false;
  }

}

/** Begins an independent draft; the read snapshot stays unchanged until POST plus GET succeed. */
function startEditing(): void {

  if (inventoryPolicy.value === null || isBusy.value) {
    return;
  }

  draft.value = buildCommunityInventoryPolicyDraft(inventoryPolicy.value);
  editing.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

}

/** Discards only browser draft state and never sends a partial policy update. */
function cancelEditing(): void {

  if (isBusy.value) {
    return;
  }

  draft.value = null;
  pendingSaveSnapshot.value = null;
  saveConfirmationOpen.value = false;
  editing.value = false;
  errorMessage.value = null;

}

/** Adds a completely blank rule rather than looking up or inferring a material/location pair. */
function addRule(): void {

  if (draft.value === null || isBusy.value || saveConfirmationOpen.value) {
    return;
  }

  draft.value.materialLocationList.push(createCommunityInventoryPolicyRuleDraft());

}

/** Removes one rule from the replacement snapshot only after an explicit editing action. */
function removeRule(index: number): void {

  if (draft.value === null || isBusy.value || saveConfirmationOpen.value) {
    return;
  }

  draft.value.materialLocationList.splice(index, 1);

}

/** Validates the complete local snapshot before displaying the destructive replacement confirmation. */
function requestSaveConfirmation(): void {

  if (draft.value === null || isBusy.value) {
    return;
  }

  try {
    pendingSaveSnapshot.value = buildCommunityInventoryPolicySaveRequest(draft.value);
    errorMessage.value = null;
    saveConfirmationOpen.value = true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to prepare the inventory policy snapshot.';
  }

}

/** Closes the confirmation without changing the draft or its persisted policy. */
function cancelSaveConfirmation(): void {

  if (saving.value) {
    return;
  }

  pendingSaveSnapshot.value = null;
  saveConfirmationOpen.value = false;

}

/**
 * Posts exactly the confirmed replacement snapshot once and then reloads the
 * same policy by GET. No global catalog, optimistic merge, retry or polling
 * is used after the backend's transactional replacement.
 */
async function confirmSave(): Promise<void> {

  const snapshot = pendingSaveSnapshot.value;
  if (snapshot === null || isBusy.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response = await inventoryPoliciesInspectorService.savePolicy(snapshot);
    resultMessage.value = response.trim() || 'Inventory policy saved.';
    editing.value = false;
    draft.value = null;
    pendingSaveSnapshot.value = null;
    saveConfirmationOpen.value = false;
    await reloadCapturedInventoryPolicy(snapshot.id);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save the inventory policy.';
  } finally {
    saving.value = false;
  }

}

/** Reloads only the same policy after a successful save to replace the browser snapshot authoritatively. */
async function reloadCapturedInventoryPolicy(policyId: string): Promise<void> {

  loading.value = true;
  try {
    const loadedInventoryPolicy = await inventoryPoliciesInspectorService.getPolicy(policyId);
    inventoryPolicy.value = loadedInventoryPolicy;
    capturedInventoryPolicyId.value = loadedInventoryPolicy.id;
    inventoryPolicyId.value = loadedInventoryPolicy.id;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Policy was saved but could not be reloaded.';
  } finally {
    loading.value = false;
  }

}

/** Loads every persisted selector used by the policy and its material/location rules. */
onMounted(async () => {

  try {
    const [loadedInventoryPolicies, loadedMaterials, loadedLocations] = await Promise.all([
      loadCommunityInventoryPolicies(),
      loadCommunityMaterials(),
      loadCommunityLocations(),
    ]);
    inventoryPolicyIds.value = loadedInventoryPolicies.map((policy) => policy.id);
    materials.value = loadedMaterials;
    locations.value = loadedLocations;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Inventory Policy selectors.';
  } finally {
    loadingOptions.value = false;
  }

});
</script>

<template>
  <TaskPageLayout class="inventory-policies-page">
    <OfxPageHeader eyebrow="Supply Planning" title="Inventory Policy Detail" description="Inspect and explicitly replace one operational safety-stock policy already associated with a Supply Execution Profile." />

    <OfxSectionCard class="boundary-card" title="Single-policy lookup">
      <p>Select the policy shown by Supply Execution Profiles. This loads one complete policy snapshot.</p>
      <form class="lookup-form" @submit.prevent="loadInventoryPolicy">
          <div class="lookup-controls">
            <OfxSelectField
              v-model="inventoryPolicyId"
              label="Inventory policy"
              :options="inventoryPolicyOptions"
              placeholder-label="Select an Inventory Policy"
              :disabled="isBusy || editing || loadingOptions"
            />
          <button class="primary-button" type="submit" :disabled="isBusy || editing || loadingOptions">
            {{ loading ? 'Loading policy…' : 'Load Inventory Policy' }}
          </button>
        </div>
      </form>
      <p class="boundary-note">Optimization, replenishment frequency, simulations and reorder analysis are not available in the current edition.</p>
    </OfxSectionCard>

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <template v-if="hasSnapshot && inventoryPolicy">
      <div class="snapshot-heading">
        <p class="captured-message" role="status">Policy {{ capturedInventoryPolicyId }} is the current server snapshot. Edit is available only for this loaded policy.</p>
        <button v-if="!editing" class="primary-button" type="button" :disabled="isBusy" @click="startEditing">Edit policy</button>
      </div>

      <OfxSectionCard v-if="!editing" class="policy-header">
        <h2>Policy header</h2>
        <dl>
          <div><dt>ID</dt><dd>{{ formatValue(inventoryPolicy.id) }}</dd></div>
          <div><dt>Registered priority</dt><dd>{{ formatValue(inventoryPolicy.prioridade) }}</dd></div>
          <div><dt>Effective from</dt><dd>{{ formatValue(inventoryPolicy.dataHorarioInicio) }}</dd></div>
          <div><dt>Effective until</dt><dd>{{ formatValue(inventoryPolicy.dataHorarioFim) }}</dd></div>
        </dl>
      </OfxSectionCard>

      <OfxSectionCard v-if="!editing" class="rules-card">
        <h2>Material/location rules</h2>
        <p>The values below are raw registered rules. The page does not resolve defaults, priority, effective policy or a DFU-period result.</p>
        <div v-if="inventoryPolicy.materialLocationList.length === 0" class="empty-state">This policy has no material/location rules.</div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Material</th><th>Location</th><th>Replenishment model</th><th>Operational model</th><th>Safety-stock calculation</th><th>Safety stock / Kanban target</th><th>DRP maximum stock</th></tr></thead>
            <tbody>
              <tr v-for="rule in inventoryPolicy.materialLocationList" :key="`${rule.materialId ?? ''}-${rule.locationId ?? ''}`">
                <td>{{ formatValue(rule.materialId) }}</td><td>{{ formatValue(rule.locationId) }}</td><td>{{ formatValue(rule.modeloReabastecimento) }}</td><td>{{ formatValue(rule.modeloOperacional) }}</td><td>{{ formatValue(rule.calculoSafetyStock) }}</td><td>{{ formatValue(rule.estoqueSegurancaDrpOuTargetKanban) }}</td><td>{{ formatValue(rule.estoqueMaximoDrp) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </OfxSectionCard>

      <OfxSectionCard v-if="editing && draft" class="editor-card" aria-labelledby="inventory-policy-editor-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Complete replacement snapshot</p>
            <h2 id="inventory-policy-editor-title">Edit policy {{ draft.id }}</h2>
          </div>
          <p class="replacement-warning">Saving replaces every material/location rule in this policy. It does not merge only changed rows.</p>
        </div>
        <div class="header-form">
          <label>Policy ID <input :value="draft.id" disabled></label>
          <label>Registered priority <input v-model="draft.prioridade" :disabled="isBusy || saveConfirmationOpen" type="number"></label>
          <label>Effective from <input v-model="draft.dataHorarioInicio" :disabled="isBusy || saveConfirmationOpen" type="datetime-local"></label>
          <label>Effective until <input v-model="draft.dataHorarioFim" :disabled="isBusy || saveConfirmationOpen" type="datetime-local"></label>
        </div>

        <div class="rules-editor-heading">
          <div><h3>Material/location rules</h3><p>Choose Material, Location and the supported planning models from their catalogs.</p></div>
          <button class="secondary-button" type="button" :disabled="isBusy || saveConfirmationOpen" @click="addRule">Add rule</button>
        </div>
        <div v-if="draft.materialLocationList.length === 0" class="empty-state">No rules will remain after the confirmed replacement.</div>
        <div v-else class="table-wrap">
          <table class="editor-table">
            <thead><tr><th>Material ID</th><th>Location ID</th><th>Replenishment model</th><th>Operational model</th><th>Safety-stock calculation</th><th>Safety stock / Kanban target</th><th>DRP maximum stock</th><th><span class="sr-only">Remove</span></th></tr></thead>
            <tbody>
              <tr v-for="(rule, index) in draft.materialLocationList" :key="index">
                <td><OfxSelectField v-model="rule.materialId" label="Material" :options="materialOptions" :disabled="isBusy || saveConfirmationOpen || loadingOptions" compact /></td>
                <td><OfxSelectField v-model="rule.locationId" label="Location" :options="locationOptions" :disabled="isBusy || saveConfirmationOpen || loadingOptions" compact /></td>
                <td><OfxSelectField v-model="rule.modeloReabastecimento" label="Replenishment model" :options="replenishmentModelOptions" :disabled="isBusy || saveConfirmationOpen" :show-placeholder-option="false" compact /></td>
                <td><OfxSelectField v-model="rule.modeloOperacional" label="Operational model" :options="operationalModelOptions" :disabled="isBusy || saveConfirmationOpen" :show-placeholder-option="false" compact /></td>
                <td><OfxSelectField v-model="rule.calculoSafetyStock" label="Safety-stock calculation" :options="safetyStockCalculationOptions" :disabled="isBusy || saveConfirmationOpen" :show-placeholder-option="false" compact /></td>
                <td><input v-model="rule.estoqueSegurancaDrpOuTargetKanban" :disabled="isBusy || saveConfirmationOpen" step="any" type="number"></td>
                <td><input v-model="rule.estoqueMaximoDrp" :disabled="isBusy || saveConfirmationOpen" step="any" type="number"></td>
                <td><button class="danger-button compact-button" type="button" :disabled="isBusy || saveConfirmationOpen" @click="removeRule(index)">Remove</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="editor-actions">
          <button class="secondary-button" type="button" :disabled="isBusy || saveConfirmationOpen" @click="cancelEditing">Discard draft</button>
          <button class="primary-button" type="button" :disabled="isBusy || saveConfirmationOpen" @click="requestSaveConfirmation">Review replacement</button>
        </div>
      </OfxSectionCard>
    </template>

    <OfxSectionCard v-else-if="!loading" class="empty-state">
      Select an Inventory Policy to inspect one operational policy.
    </OfxSectionCard>

    <OfxSectionCard v-if="saveConfirmationOpen && pendingSaveSnapshot" class="confirmation" role="dialog" aria-modal="true" aria-labelledby="replace-inventory-policy-title">
      <h2 id="replace-inventory-policy-title">Replace all policy rules?</h2>
      <p>You are about to replace the complete snapshot of policy <strong>{{ pendingSaveSnapshot.id }}</strong>, including all {{ pendingSaveSnapshot.materialLocationList.length }} material/location rule{{ pendingSaveSnapshot.materialLocationList.length === 1 ? '' : 's' }}.</p>
      <p class="replacement-warning">The backend removes existing rules and persists this confirmed list transactionally. This is not a partial row update.</p>
      <div class="editor-actions">
        <button class="secondary-button" type="button" :disabled="saving" @click="cancelSaveConfirmation">Keep editing</button>
        <button class="danger-button" type="button" :disabled="saving" @click="confirmSave">{{ saving ? 'Saving policy…' : 'Replace policy snapshot' }}</button>
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .policy-header, .rules-card, .editor-card, .confirmation { display: grid; gap: 1rem; margin-bottom: 1rem; }.boundary-card h2, .policy-header h2, .rules-card h2, .editor-card h2, .editor-card h3, .confirmation h2, .boundary-card p, .rules-card p, .editor-card p, .confirmation p { margin: 0; }.lookup-form { display: grid; gap: .45rem; max-width: 38rem; }.lookup-form label, .header-form label { font-weight: 700; }.lookup-controls, .snapshot-heading, .rules-editor-heading, .editor-actions, .section-heading { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: space-between; }.lookup-controls select { border: 1px solid #b8c2d9; border-radius: .5rem; flex: 1 1 16rem; min-width: 0; padding: .65rem .75rem; }.primary-button, .secondary-button, .danger-button { border: 1px solid #c8d0de; border-radius: .5rem; background: white; cursor: pointer; padding: .7rem 1rem; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.danger-button { border-color: #b42318; background: #b42318; color: white; }.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled { cursor: not-allowed; opacity: .55; }.boundary-note, .rules-card p, .empty-state, .rules-editor-heading p { color: var(--ofx-muted); }.captured-message { border-left: 3px solid #70b694; margin: 0; padding-left: .75rem; }.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; margin-bottom: 1rem; padding: .8rem 1rem; }.error { color: #b42318; }.policy-header dl, .header-form { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); margin: 0; }.policy-header dl div { border-left: 3px solid #e7e2ff; padding-left: .75rem; }.policy-header dt { color: var(--ofx-muted); font-size: .78rem; }.policy-header dd { font-weight: 700; margin: .2rem 0 0; overflow-wrap: anywhere; }.header-form label { display: grid; gap: .35rem; font-size: .85rem; }.header-form input, .editor-table input, .editor-table select { border: 1px solid #b8c2d9; border-radius: .4rem; min-width: 8rem; padding: .55rem; width: 100%; }.table-wrap { overflow-x: auto; }table { border-collapse: collapse; min-width: 75rem; width: 100%; }th, td { border-bottom: 1px solid #e2e7f0; padding: .65rem; text-align: left; vertical-align: top; }th { background: #f7f9fc; color: var(--ofx-muted); font-size: .78rem; }td { overflow-wrap: anywhere; }.editor-table { min-width: 105rem; }.editor-table td { min-width: 10rem; }.compact-button { padding: .45rem .65rem; }.section-heading, .rules-editor-heading { align-items: start; }.replacement-warning { border-left: 3px solid #f79009; color: #7a4200; max-width: 46rem; padding-left: .75rem; }.confirmation { border: 1px solid #f0b7b2; border-radius: 1rem; background: #fff8f7; max-width: 48rem; padding: 1.5rem; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }.compact-hero { margin-bottom: 1rem; }
</style>
