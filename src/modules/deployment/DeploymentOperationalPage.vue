<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import {
  getDeploymentOperationalLine,
  getDeploymentOperationalSelectors,
  updateDeploymentOperationalInbound,
} from './deployment-operational.service';
import { buildDeploymentOperationalUpdate, type DeploymentOperationalLine } from './deployment-operational.types';

const supplyPlans = ref<Array<{ supplyPlanId: number; description: string | null }>>([]);
const locations = ref<Array<{ id: string; description: string | null; active: boolean | null }>>([]);
const materials = ref<Array<{ id: string; description: string | null; active: boolean | null }>>([]);
const supplyPlanId = ref<number | null>(null);
const originLocationId = ref('');
const destinationLocationId = ref('');
const materialId = ref('');
const deployment = ref<DeploymentOperationalLine | null>(null);
const plannedInboundQuantity = ref<number | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingLine = ref(false);
const isUpdating = ref(false);
const confirmationOpen = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

/** All four physical selectors are deliberately mandatory before the scoped GET can run. */
const canLoadLine = computed(() => (
  supplyPlanId.value !== null
  && supplyPlanId.value > 0
  && originLocationId.value.length > 0
  && destinationLocationId.value.length > 0
  && materialId.value.length > 0
));

/** Only finite, non-negative quantities may open the command confirmation. */
const canUpdate = computed(() => (
  deployment.value !== null
  && plannedInboundQuantity.value !== null
  && Number.isFinite(plannedInboundQuantity.value)
  && plannedInboundQuantity.value >= 0
));

const activeLocations = computed(() => locations.value.filter((location) => location.active !== false));
const activeMaterials = computed(() => materials.value.filter((material) => material.active !== false));

function optionLabel(option: { id: string; description: string | null }): string {

  return option.description?.trim() ? `${option.id} — ${option.description}` : option.id;

}

function supplyPlanLabel(supplyPlan: { supplyPlanId: number; description: string | null }): string {

  return supplyPlan.description?.trim()
    ? `#${supplyPlan.supplyPlanId} — ${supplyPlan.description}`
    : `Supply Plan #${supplyPlan.supplyPlanId}`;

}

function formatDate(value: string): string {

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);

}

function formatDateTime(value: string): string {

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);

}

function formatQuantity(value: number): string {

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);

}

/** Catalogs only identify the fixed physical route; backend still validates the chosen network route. */
async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getDeploymentOperationalSelectors();
    supplyPlans.value = selectors.supplyPlans;
    locations.value = selectors.locations;
    materials.value = selectors.materials;
    supplyPlanId.value ??= selectors.supplyPlans[0]?.supplyPlanId ?? null;
    originLocationId.value ||= selectors.locations.find((location) => location.active !== false)?.id ?? '';
    destinationLocationId.value ||= selectors.locations.find((location) => location.active !== false && location.id !== originLocationId.value)?.id ?? '';
    materialId.value ||= selectors.materials.find((material) => material.active !== false)?.id ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Community deployment selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

/** Reads the authoritative route snapshot without client-side defaulting or reconciliation. */
async function loadDeployment(): Promise<void> {

  if (!canLoadLine.value || supplyPlanId.value === null) return;

  isLoadingLine.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  confirmationOpen.value = false;

  try {
    deployment.value = await getDeploymentOperationalLine({
      supplyPlanId: supplyPlanId.value,
      originLocationId: originLocationId.value,
      destinationLocationId: destinationLocationId.value,
      materialId: materialId.value,
    });
    plannedInboundQuantity.value = deployment.value.plannedInboundQuantity;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the Community deployment route.';
  } finally {
    isLoadingLine.value = false;
  }

}

/** Replaces the full route snapshot only after the backend accepts the atomically typed command. */
async function confirmUpdate(): Promise<void> {

  if (!canUpdate.value || supplyPlanId.value === null || plannedInboundQuantity.value === null) return;

  isUpdating.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    deployment.value = await updateDeploymentOperationalInbound(buildDeploymentOperationalUpdate({
      supplyPlanId: supplyPlanId.value,
      originLocationId: originLocationId.value,
      destinationLocationId: destinationLocationId.value,
      materialId: materialId.value,
    }, plannedInboundQuantity.value));
    plannedInboundQuantity.value = deployment.value.plannedInboundQuantity;
    confirmationOpen.value = false;
    resultMessage.value = 'Planned inbound quantity was updated from the current Working Plan snapshot.';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to update the Community deployment route.';
  } finally {
    isUpdating.value = false;
  }

}

onMounted(loadSelectors);
</script>

<template>
  <TaskPageLayout class="deployment-operational-page">
    <OfxPageHeader eyebrow="Supply Planning" title="Deployment" description="Review and replace planned inbound for one current Working Plan route.">
      <template #actions><button class="secondary-button" :disabled="isLoadingSelectors || isLoadingLine || isUpdating" @click="loadSelectors">Refresh selectors</button></template>
    </OfxPageHeader>

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="filters" aria-labelledby="deployment-selection-title">
      <div class="section-header">
        <div>
          <h2 id="deployment-selection-title">Physical route</h2>
          <p>All four selectors are required. Route viability remains validated by the Community backend.</p>
        </div>
      </div>
      <label>Supply Plan <small>required</small><select v-model.number="supplyPlanId" :disabled="isLoadingSelectors"><option :value="null" disabled>Select a Supply Plan</option><option v-for="supplyPlan in supplyPlans" :key="supplyPlan.supplyPlanId" :value="supplyPlan.supplyPlanId">{{ supplyPlanLabel(supplyPlan) }}</option></select></label>
      <label>Origin <small>required</small><select v-model="originLocationId" :disabled="isLoadingSelectors"><option value="" disabled>Select an origin</option><option v-for="location in activeLocations" :key="location.id" :value="location.id">{{ optionLabel(location) }}</option></select></label>
      <label>Destination <small>required</small><select v-model="destinationLocationId" :disabled="isLoadingSelectors"><option value="" disabled>Select a destination</option><option v-for="location in activeLocations" :key="location.id" :value="location.id">{{ optionLabel(location) }}</option></select></label>
      <label>Material <small>required</small><select v-model="materialId" :disabled="isLoadingSelectors"><option value="" disabled>Select a material</option><option v-for="material in activeMaterials" :key="material.id" :value="material.id">{{ optionLabel(material) }}</option></select></label>
      <div class="actions"><button class="primary-button" :disabled="!canLoadLine || isLoadingLine || isUpdating" @click="loadDeployment">{{ isLoadingLine ? 'Loading…' : 'Load route' }}</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="deployment" aria-labelledby="deployment-result-title">
      <div class="section-header"><div><h2 id="deployment-result-title">Current route snapshot</h2><p>Fields below are returned by the authoritative current Working Plan read.</p></div></div>
      <dl class="details">
        <div><dt>Material</dt><dd>{{ deployment.materialId }}<span v-if="deployment.materialDescription"> — {{ deployment.materialDescription }}</span></dd></div>
        <div><dt>Origin</dt><dd>{{ deployment.originLocationId }}</dd></div>
        <div><dt>Destination</dt><dd>{{ deployment.destinationLocationId }}</dd></div>
        <div><dt>Current period end</dt><dd>{{ formatDateTime(deployment.currentPeriodEndDate) }}</dd></div>
        <div><dt>Lead time</dt><dd>{{ deployment.leadTimeDays }} day{{ deployment.leadTimeDays === 1 ? '' : 's' }}</dd></div>
        <div><dt>Expected receipt</dt><dd>{{ formatDate(deployment.expectedReceiptDate) }}</dd></div>
        <div><dt>Unit of measure</dt><dd>{{ deployment.unitOfMeasureId }}</dd></div>
        <div><dt>Current planned inbound</dt><dd>{{ formatQuantity(deployment.plannedInboundQuantity) }}</dd></div>
      </dl>
      <label class="quantity-input">Planned inbound quantity <small>must be zero or greater; {{ deployment.unitOfMeasureId }}</small><input v-model.number="plannedInboundQuantity" type="number" min="0" step="any" :disabled="isUpdating" /></label>
      <p v-if="plannedInboundQuantity !== null && !canUpdate" class="validation-message">Enter a finite planned inbound quantity that is zero or greater.</p>
      <div class="actions"><button class="primary-button" :disabled="!canUpdate || isUpdating" @click="confirmationOpen = true">Update planned inbound</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="confirmationOpen && deployment" class="confirmation" role="dialog" aria-modal="true" aria-labelledby="deployment-confirmation-title">
      <h2 id="deployment-confirmation-title">Update planned inbound?</h2>
      <p>This replaces the planned inbound quantity for {{ originLocationId }} → {{ destinationLocationId }}, material {{ materialId }}, in the current Working Plan.</p>
      <p class="muted">New quantity: {{ plannedInboundQuantity === null ? '—' : formatQuantity(plannedInboundQuantity) }} {{ deployment.unitOfMeasureId }}</p>
      <div class="actions">
        <button class="secondary-button" :disabled="isUpdating" @click="confirmationOpen = false">Cancel</button>
        <button class="primary-button" :disabled="!canUpdate || isUpdating" @click="confirmUpdate">{{ isUpdating ? 'Updating…' : 'Confirm update' }}</button>
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.section-header, .actions { display: flex; align-items: end; gap: 1rem; justify-content: space-between; }.section-header h2 { margin: .25rem 0; }.actions { flex-wrap: wrap; }.filters { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.filters .section-header, .filters .actions { grid-column: 1 / -1; }.filters label, .quantity-input { display: grid; gap: .35rem; font-size: .85rem; font-weight: 700; }.filters select, .quantity-input input { min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); padding: .55rem; }.primary-button, .secondary-button { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); cursor: pointer; padding: .65rem .9rem; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }.details { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); margin: 1rem 0 1.5rem; }.details div { border: 1px solid var(--ofx-border); border-radius: .5rem; padding: .7rem; }.details dt, .muted, .section-header p, .filters small, .quantity-input small { color: var(--ofx-text-muted); }.details dt { font-size: .75rem; text-transform: uppercase; }.details dd { margin: .25rem 0 0; font-weight: 700; }.quantity-input { max-width: 22rem; margin-bottom: 1rem; }.error, .validation-message { color: var(--ofx-text-danger); }.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; padding: .8rem 1rem; }.confirmation { max-width: 42rem; border: 1px solid #f0b7b2; border-radius: 1rem; background: #fff8f7; padding: 1.5rem; }.confirmation h2 { margin-top: 0; }
</style>
