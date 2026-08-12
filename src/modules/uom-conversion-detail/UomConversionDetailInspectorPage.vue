<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import OfxSelectField from '../../components/ofx/forms/OfxSelectField.vue';
import { httpClient } from '../../services/community-authentication.service';
import {
  communityNamedOptionLabel,
  loadCommunityMaterials,
  loadCommunityUnitOfMeasureIds,
  type CommunityNamedOption,
} from '../../services/community-option-catalog.service';
import { UomConversionDetailInspectorService } from './uom-conversion-detail.service';
import type { UomConversionDetail } from '../uom-conversion-gaps/uom-conversion-gaps.types';

const uomConversionDetailInspectorService = new UomConversionDetailInspectorService(httpClient);
const materialId = ref('');
const originUomId = ref('');
const targetUomId = ref('');
const materials = ref<CommunityNamedOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const conversionDetail = ref<UomConversionDetail | null>(null);
const loading = ref(false);
const loadingOptions = ref(true);
const errorMessage = ref<string | null>(null);
const canInspect = computed(() => !loading.value
  && !loadingOptions.value
  && materialId.value.length > 0
  && originUomId.value.length > 0
  && targetUomId.value.length > 0);
const materialOptions = computed(() => [
  { label: 'Select a material', value: '' },
  ...materials.value.map((material) => ({ label: communityNamedOptionLabel(material), value: material.id })),
]);
const originUomOptions = computed(() => [
  { label: 'Select the origin UOM', value: '' },
  ...unitOfMeasureIds.value.map((unitOfMeasure) => ({ label: unitOfMeasure, value: unitOfMeasure })),
]);
const targetUomOptions = computed(() => [
  { label: 'Select the target UOM', value: '' },
  ...unitOfMeasureIds.value.map((unitOfMeasure) => ({ label: unitOfMeasure, value: unitOfMeasure })),
]);

function rawValue(value: string | number | null | undefined): string {

  return value === null || value === undefined || value === '' ? '—' : String(value);

}

/** Reads exactly one path chosen manually; it never starts a planning-flow diagnosis. */
async function inspectConversion(): Promise<void> {

  if (!canInspect.value) {
    return;
  }

  try {
    loading.value = true;
    errorMessage.value = null;
    conversionDetail.value = await uomConversionDetailInspectorService.getDetail({
      materialId: materialId.value,
      originUomId: originUomId.value,
      targetUomId: targetUomId.value,
    });
  } catch (error) {
    conversionDetail.value = null;
    errorMessage.value = error instanceof Error ? error.message : 'Unable to inspect the material-specific UOM conversion.';
  } finally {
    loading.value = false;
  }

}

/** Uses persisted catalogs so the conversion identity cannot be mistyped. */
onMounted(async () => {

  try {
    [materials.value, unitOfMeasureIds.value] = await Promise.all([
      loadCommunityMaterials(),
      loadCommunityUnitOfMeasureIds(),
    ]);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load material and UOM selectors.';
  } finally {
    loadingOptions.value = false;
  }

});
</script>

<template>
  <TaskPageLayout class="uom-conversion-detail-page">
    <OfxPageHeader
      eyebrow="Configuration"
      title="UOM Conversion Detail"
      description="Inspect one existing material-specific conversion path from persisted catalogs."
    />

    <OfxSectionCard class="boundary-card" title="Available information">
      <p>This is an independent verification of one material and two UOMs. It does not run a Demand, Supply, or Deployment conversion-gap diagnosis.</p>
      <p class="muted">Global conversion overload, Data operations and mutation are not included here. Missing-path diagnosis remains in UOM Conversion Gaps.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="inspection-card" title="Explicit conversion path" description="Canonical material-specific request.">
      <div class="input-grid">
        <OfxSelectField v-model="materialId" label="Material" :options="materialOptions" :disabled="loading || loadingOptions" />
        <OfxSelectField v-model="originUomId" label="Origin UOM" :options="originUomOptions" :disabled="loading || loadingOptions" />
        <OfxSelectField v-model="targetUomId" label="Target UOM" :options="targetUomOptions" :disabled="loading || loadingOptions" />
      </div>
      <div class="actions"><button class="primary-button" :disabled="!canInspect" type="button" @click="inspectConversion">{{ loading ? 'Inspecting conversion…' : 'Inspect conversion path' }}</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="conversionDetail" class="result-card" title="Material-specific conversion" description="Raw server response.">
      <dl class="detail-grid">
        <div><dt>Material</dt><dd>{{ rawValue(conversionDetail.materialId) }}</dd></div>
        <div><dt>Origin UOM</dt><dd>{{ rawValue(conversionDetail.originUomId) }}</dd></div>
        <div><dt>Target UOM</dt><dd>{{ rawValue(conversionDetail.targetUomId) }}</dd></div>
        <div><dt>Coefficient</dt><dd>{{ rawValue(conversionDetail.conversionCoefficient) }}</dd></div>
        <div class="full"><dt>Step by step</dt><dd>{{ rawValue(conversionDetail.stepByStep) }}</dd></div>
      </dl>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .inspection-card, .result-card { display: grid; gap: 1rem; }.boundary-card p, .muted { color: var(--ofx-text-muted); }.input-grid, .detail-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.actions { display: flex; flex-wrap: wrap; gap: 1rem; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.error { color: var(--ofx-text-danger); margin-bottom: 1rem; }.detail-grid dt { color: var(--ofx-text-muted); font-size: .75rem; font-weight: 700; text-transform: uppercase; }.detail-grid dd { margin: .35rem 0 0; white-space: pre-wrap; }.detail-grid .full { grid-column: 1 / -1; }
</style>
