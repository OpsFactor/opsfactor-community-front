<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import {
  getDemandPlanningUomConversionGaps,
  getDeploymentUomConversionGaps,
  getMaterialUomConversionDetail,
  getSupplyPlanningUomConversionGaps,
  getUomConversionGapSelectors,
} from './uom-conversion-gaps.service';
import {
  getReferencePeriodFormat,
  isValidReferencePeriod,
  type DemandPlanOption,
  type ExecutionProfileOption,
  type SupplyNetworkVersionOption,
  type SupplyPlanOption,
  type UomConversionDetail,
  type UomConversionGap,
  type UomConversionGapMode,
} from './uom-conversion-gaps.types';

const mode = ref<UomConversionGapMode>('demand-planning');
const demandPlanningProfiles = ref<ExecutionProfileOption[]>([]);
const supplyPlanningProfiles = ref<ExecutionProfileOption[]>([]);
const supplyNetworkVersions = ref<SupplyNetworkVersionOption[]>([]);
const demandPlans = ref<DemandPlanOption[]>([]);
const supplyPlans = ref<SupplyPlanOption[]>([]);
const demandPlanningExecutionProfileId = ref('');
const demandPlanningReferencePeriod = ref('');
const supplyPlanningExecutionProfileId = ref('');
const supplyPlanningReferencePeriod = ref('');
const supplyPlanningBucketSize = ref('');
const supplyNetworkVersionId = ref('');
const demandPlanId = ref('');
const supplyPlanId = ref('');
const uomConversionGaps = ref<UomConversionGap[] | null>(null);
const selectedGap = ref<UomConversionGap | null>(null);
const conversionDetail = ref<UomConversionDetail | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingDiagnostics = ref(false);
const isLoadingDetail = ref(false);
const errorMessage = ref<string | null>(null);
const detailErrorMessage = ref<string | null>(null);

const selectedDemandPlanningProfile = computed(() => demandPlanningProfiles.value.find(
  (profile) => profile.id === demandPlanningExecutionProfileId.value,
) ?? null);
const demandPlanningReferenceFormat = computed(() => getReferencePeriodFormat(
  selectedDemandPlanningProfile.value?.bucketSize,
));
const demandPlanningReferenceIsValid = computed(() => isValidReferencePeriod(
  demandPlanningReferencePeriod.value,
  selectedDemandPlanningProfile.value?.bucketSize,
));
const supplyPlanningReferenceFormat = computed(() => getReferencePeriodFormat(supplyPlanningBucketSize.value));
const supplyPlanningReferenceIsValid = computed(() => isValidReferencePeriod(
  supplyPlanningReferencePeriod.value,
  supplyPlanningBucketSize.value,
));
const parsedDemandPlanId = computed(() => Number(demandPlanId.value));
const parsedSupplyPlanId = computed(() => Number(supplyPlanId.value));
const canDiagnoseDemandPlanning = computed(() => !isLoadingSelectors.value
  && demandPlanningExecutionProfileId.value.trim().length > 0
  && demandPlanningReferenceIsValid.value);
const canDiagnoseSupplyPlanning = computed(() => !isLoadingSelectors.value
  && supplyPlanningReferenceIsValid.value
  && supplyNetworkVersionId.value.trim().length > 0
  && supplyPlanningExecutionProfileId.value.trim().length > 0
  && Number.isInteger(parsedDemandPlanId.value)
  && parsedDemandPlanId.value > 0);
const canDiagnoseDeployment = computed(() => !isLoadingSelectors.value
  && Number.isInteger(parsedSupplyPlanId.value)
  && parsedSupplyPlanId.value > 0);
const canDiagnose = computed(() => {
  switch (mode.value) {
    case 'demand-planning': return canDiagnoseDemandPlanning.value;
    case 'supply-planning': return canDiagnoseSupplyPlanning.value;
    case 'deployment': return canDiagnoseDeployment.value;
  }
});

/** Displays raw backend DTO fields without turning absent values into calculated values. */
function formatRawValue(value: string | number | null | undefined): string {

  return value === null || value === undefined || value === '' ? '—' : String(value);

}

function optionLabel(option: { id?: string; description?: string | null }, id: string): string {

  return option.description?.trim() ? `${option.description} (${id})` : id;

}

function demandPlanLabel(demandPlan: DemandPlanOption): string {

  return demandPlan.description?.trim()
    ? `${demandPlan.description} (${demandPlan.demandPlanId})`
    : String(demandPlan.demandPlanId);

}

function supplyPlanLabel(supplyPlan: SupplyPlanOption): string {

  return supplyPlan.description?.trim()
    ? `${supplyPlan.description} (${supplyPlan.supplyPlanId})`
    : String(supplyPlan.supplyPlanId);

}

/** Drops an old result whenever the diagnostic flow changes; no result is repurposed across modes. */
function selectMode(nextMode: UomConversionGapMode): void {

  mode.value = nextMode;
  uomConversionGaps.value = null;
  selectedGap.value = null;
  conversionDetail.value = null;
  errorMessage.value = null;
  detailErrorMessage.value = null;

}

/** Loads selector catalogs only; diagnostics remain a separate explicit action. */
async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getUomConversionGapSelectors();
    demandPlanningProfiles.value = selectors.demandPlanningProfiles;
    supplyPlanningProfiles.value = selectors.supplyPlanningProfiles;
    supplyNetworkVersions.value = selectors.supplyNetworkVersions;
    demandPlans.value = selectors.demandPlans;
    supplyPlans.value = selectors.supplyPlans;
    demandPlanningExecutionProfileId.value = selectors.demandPlanningProfiles[0]?.id ?? '';
    supplyPlanningExecutionProfileId.value = selectors.supplyPlanningProfiles[0]?.id ?? '';
    supplyNetworkVersionId.value = selectors.supplyNetworkVersions[0]?.id ?? '';
    demandPlanId.value = selectors.demandPlans[0] ? String(selectors.demandPlans[0].demandPlanId) : '';
    supplyPlanId.value = selectors.supplyPlans[0] ? String(selectors.supplyPlans[0].supplyPlanId) : '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load UOM conversion diagnostic selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

/** Starts exactly one selected diagnostic. It never derives SNP selectors from a profile or plan. */
async function diagnose(): Promise<void> {

  if (!canDiagnose.value) return;

  isLoadingDiagnostics.value = true;
  errorMessage.value = null;
  detailErrorMessage.value = null;
  selectedGap.value = null;
  conversionDetail.value = null;

  try {
    switch (mode.value) {
      case 'demand-planning':
        uomConversionGaps.value = await getDemandPlanningUomConversionGaps(
          demandPlanningExecutionProfileId.value,
          demandPlanningReferencePeriod.value,
        );
        break;
      case 'supply-planning':
        uomConversionGaps.value = await getSupplyPlanningUomConversionGaps({
          referencePeriod: supplyPlanningReferencePeriod.value,
          bucketSize: supplyPlanningBucketSize.value,
          supplyNetworkVersionId: supplyNetworkVersionId.value,
          supplyPlanningExecutionProfileId: supplyPlanningExecutionProfileId.value,
          demandPlanId: parsedDemandPlanId.value,
        });
        break;
      case 'deployment':
        uomConversionGaps.value = await getDeploymentUomConversionGaps(parsedSupplyPlanId.value);
        break;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to diagnose UOM conversion gaps.';
  } finally {
    isLoadingDiagnostics.value = false;
  }

}

/** Opens only the selected material-specific conversion route; global conversion overloads are not used. */
async function openConversionDetail(gap: UomConversionGap): Promise<void> {

  selectedGap.value = gap;
  conversionDetail.value = null;
  detailErrorMessage.value = null;
  isLoadingDetail.value = true;

  try {
    conversionDetail.value = await getMaterialUomConversionDetail(gap);
  } catch (error) {
    detailErrorMessage.value = error instanceof Error ? error.message : 'Unable to load material-specific UOM conversion detail.';
  } finally {
    isLoadingDetail.value = false;
  }

}

function canOpenConversionDetail(gap: UomConversionGap): boolean {

  return Boolean(gap.materialId?.trim() && gap.originUnitOfMeasure?.trim() && gap.targetUnitOfMeasure?.trim());

}

onMounted(loadSelectors);
</script>

<template>
  <TaskPageLayout class="uom-conversion-gaps-page">
    <OfxPageHeader eyebrow="Configuration diagnostics" title="UOM Conversion Gaps" description="Read missing conversions for one selected planning flow. This screen does not change conversion master data." />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard aria-labelledby="uom-gap-mode-title">
      <div class="section-header">
        <div>
          <h2 id="uom-gap-mode-title">Diagnostic flow</h2>
          <p>Choose one existing Community diagnostic. The result is loaded only after Diagnose is selected.</p>
        </div>
      </div>
      <div class="mode-buttons" role="group" aria-label="Diagnostic flow">
        <button :class="{ active: mode === 'demand-planning' }" @click="selectMode('demand-planning')">Demand Planning</button>
        <button :class="{ active: mode === 'supply-planning' }" @click="selectMode('supply-planning')">Supply Planning</button>
        <button :class="{ active: mode === 'deployment' }" @click="selectMode('deployment')">Deployment</button>
      </div>

      <div v-if="mode === 'demand-planning'" class="selector-grid">
        <label>
          Demand Planning profile
          <select v-model="demandPlanningExecutionProfileId" :disabled="isLoadingSelectors">
            <option value="" disabled>Select a profile</option>
            <option v-for="profile in demandPlanningProfiles" :key="profile.id" :value="profile.id">{{ optionLabel(profile, profile.id) }}</option>
          </select>
        </label>
        <label>
          Reference period <span v-if="demandPlanningReferenceFormat">({{ demandPlanningReferenceFormat }})</span>
          <input v-model="demandPlanningReferencePeriod" :disabled="!demandPlanningReferenceFormat" :placeholder="demandPlanningReferenceFormat ?? 'Unsupported profile bucket'">
        </label>
      </div>

      <div v-else-if="mode === 'supply-planning'" class="selector-grid">
        <label>
          Bucket
          <select v-model="supplyPlanningBucketSize">
            <option value="" disabled>Select a bucket</option>
            <option value="Yearly">Yearly</option>
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
            <option value="Daily">Daily</option>
          </select>
        </label>
        <label>
          Reference period <span v-if="supplyPlanningReferenceFormat">({{ supplyPlanningReferenceFormat }})</span>
          <input v-model="supplyPlanningReferencePeriod" :disabled="!supplyPlanningReferenceFormat" :placeholder="supplyPlanningReferenceFormat ?? 'Select a bucket'">
        </label>
        <label>
          Supply Network Version
          <select v-model="supplyNetworkVersionId" :disabled="isLoadingSelectors">
            <option value="" disabled>Select a Supply Network Version</option>
            <option v-for="version in supplyNetworkVersions" :key="version.id" :value="version.id">{{ optionLabel(version, version.id) }}</option>
          </select>
        </label>
        <label>
          Supply Planning profile
          <select v-model="supplyPlanningExecutionProfileId" :disabled="isLoadingSelectors">
            <option value="" disabled>Select a profile</option>
            <option v-for="profile in supplyPlanningProfiles" :key="profile.id" :value="profile.id">{{ optionLabel(profile, profile.id) }}</option>
          </select>
        </label>
        <label>
          Demand Plan
          <select v-model="demandPlanId" :disabled="isLoadingSelectors">
            <option value="" disabled>Select a Demand Plan</option>
            <option v-for="demandPlan in demandPlans" :key="demandPlan.demandPlanId" :value="String(demandPlan.demandPlanId)">{{ demandPlanLabel(demandPlan) }}</option>
          </select>
        </label>
      </div>

      <div v-else class="selector-grid">
        <label>
          Supply Plan
          <select v-model="supplyPlanId" :disabled="isLoadingSelectors">
            <option value="" disabled>Select a Supply Plan</option>
            <option v-for="supplyPlan in supplyPlans" :key="supplyPlan.supplyPlanId" :value="String(supplyPlan.supplyPlanId)">{{ supplyPlanLabel(supplyPlan) }}</option>
          </select>
        </label>
      </div>

      <p v-if="mode === 'supply-planning'" class="muted">SNP does not infer its bucket, network, profiles, or Demand Plan from another selection.</p>
      <div class="actions">
        <button class="primary-button" :disabled="!canDiagnose || isLoadingDiagnostics" @click="diagnose">
          {{ isLoadingDiagnostics ? 'Diagnosing…' : 'Diagnose conversion gaps' }}
        </button>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="uomConversionGaps !== null" aria-labelledby="uom-gap-result-title">
      <div class="section-header">
        <div>
          <h2 id="uom-gap-result-title">Missing conversions</h2>
          <p>Rows are returned by the selected backend diagnostic without aggregation or inferred conversions.</p>
        </div>
      </div>
      <p v-if="uomConversionGaps.length === 0" class="muted">No conversion gap was returned for the selected flow.</p>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Material</th><th scope="col">Location</th><th scope="col">Origin UOM</th><th scope="col">Target UOM</th>
              <th scope="col">Origin</th><th scope="col">Target</th><th scope="col">Requirement</th><th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(gap, index) in uomConversionGaps" :key="`${gap.materialId ?? 'none'}-${gap.originUnitOfMeasure ?? 'none'}-${gap.targetUnitOfMeasure ?? 'none'}-${index}`">
              <td>{{ formatRawValue(gap.materialId) }}</td><td>{{ formatRawValue(gap.locationId) }}</td><td>{{ formatRawValue(gap.originUnitOfMeasure) }}</td><td>{{ formatRawValue(gap.targetUnitOfMeasure) }}</td>
              <td>{{ formatRawValue(gap.originTask) }} · {{ formatRawValue(gap.originConversionRequirementType) }}</td>
              <td>{{ formatRawValue(gap.targetTask) }} · {{ formatRawValue(gap.targetConversionRequirementType) }}</td>
              <td>{{ formatRawValue(gap.targetConversionRequirementId ?? gap.originConversionRequirementId) }}</td>
              <td><button :disabled="!canOpenConversionDetail(gap) || isLoadingDetail" @click="openConversionDetail(gap)">View detail</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="selectedGap" class="detail" aria-labelledby="uom-gap-detail-title">
      <div class="section-header">
        <div>
          <p class="eyebrow">Material-specific conversion</p>
          <h2 id="uom-gap-detail-title">{{ formatRawValue(selectedGap.materialId) }}: {{ formatRawValue(selectedGap.originUnitOfMeasure) }} → {{ formatRawValue(selectedGap.targetUnitOfMeasure) }}</h2>
        </div>
        <button @click="selectedGap = null; conversionDetail = null; detailErrorMessage = null">Close</button>
      </div>
      <p v-if="isLoadingDetail" class="muted">Loading detail…</p>
      <p v-else-if="detailErrorMessage" class="error" role="alert">{{ detailErrorMessage }}</p>
      <dl v-else-if="conversionDetail" class="detail-grid">
        <div><dt>Material</dt><dd>{{ formatRawValue(conversionDetail.materialId) }}</dd></div>
        <div><dt>Origin UOM</dt><dd>{{ formatRawValue(conversionDetail.originUomId) }}</dd></div>
        <div><dt>Target UOM</dt><dd>{{ formatRawValue(conversionDetail.targetUomId) }}</dd></div>
        <div><dt>Coefficient</dt><dd>{{ formatRawValue(conversionDetail.conversionCoefficient) }}</dd></div>
        <div class="full"><dt>Step by step</dt><dd>{{ formatRawValue(conversionDetail.stepByStep) }}</dd></div>
      </dl>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.section-header, .actions { display: flex; align-items: end; gap: 1rem; justify-content: space-between; }.section-header h2 { margin: .25rem 0; }
.mode-buttons, .actions { display: flex; gap: .6rem; flex-wrap: wrap; }.mode-buttons button, .detail button { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); cursor: pointer; padding: .55rem .8rem; }.mode-buttons button.active { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }
.selector-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); margin-top: 1rem; }.selector-grid label { display: grid; gap: .35rem; font-size: .85rem; font-weight: 700; }.selector-grid select, .selector-grid input { min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); padding: .55rem; }
.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled, button:disabled { cursor: not-allowed; opacity: .5; }.actions { margin-top: 1rem; }
.table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; text-align: left; } th, td { border-top: 1px solid #e2e7f0; padding: .8rem .65rem; vertical-align: top; white-space: nowrap; } thead th { color: var(--ofx-muted); font-size: .75rem; text-transform: uppercase; } td button { border: 1px solid #c8d0de; border-radius: .4rem; background: white; cursor: pointer; padding: .4rem .6rem; }
.detail { margin-top: 1rem; }.detail-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }.detail-grid .full { grid-column: 1 / -1; }.detail-grid dt { color: var(--ofx-muted); font-size: .75rem; font-weight: 700; text-transform: uppercase; }.detail-grid dd { margin: .35rem 0 0; white-space: pre-wrap; }.muted, .section-header p { color: var(--ofx-muted); }.error { color: #b42318; }
</style>
