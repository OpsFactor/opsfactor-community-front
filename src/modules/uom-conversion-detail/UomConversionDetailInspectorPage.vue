<script setup lang="ts">
import { ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { UomConversionDetailInspectorService } from './uom-conversion-detail.service';
import type { UomConversionDetail } from '../uom-conversion-gaps/uom-conversion-gaps.types';

const uomConversionDetailInspectorService = new UomConversionDetailInspectorService(httpClient);
const materialId = ref('');
const originUomId = ref('');
const targetUomId = ref('');
const conversionDetail = ref<UomConversionDetail | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

function rawValue(value: string | number | null | undefined): string {

  return value === null || value === undefined || value === '' ? '—' : String(value);

}

/** Reads exactly one path chosen manually; it never starts a planning-flow diagnosis. */
async function inspectConversion(): Promise<void> {

  if (loading.value) {
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
</script>

<template>
  <TaskPageLayout class="uom-conversion-detail-page">
    <OfxPageHeader
      eyebrow="Configuration"
      title="UOM Conversion Detail"
      description="Inspect one existing material-specific conversion path from explicit identifiers."
    />

    <OfxSectionCard class="boundary-card" title="Community scope">
      <p>This is an independent manual verification of one material and two UOM IDs. It does not run a Demand, Supply, or Deployment conversion-gap diagnosis.</p>
      <p class="muted">No UOM catalog, global conversion overload, Data operation, upload, download, edit, or mutation is included here. Missing-path diagnosis remains in UOM Conversion Gaps.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="inspection-card" title="Explicit conversion path" description="Canonical material-specific request.">
      <div class="input-grid">
        <label>Material ID<input v-model="materialId" :disabled="loading" autocomplete="off" required type="text"></label>
        <label>Origin UOM ID<input v-model="originUomId" :disabled="loading" autocomplete="off" required type="text"></label>
        <label>Target UOM ID<input v-model="targetUomId" :disabled="loading" autocomplete="off" required type="text"></label>
      </div>
      <div class="actions"><button class="primary-button" :disabled="loading" type="button" @click="inspectConversion">{{ loading ? 'Inspecting conversion…' : 'Inspect conversion path' }}</button></div>
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
.boundary-card, .inspection-card, .result-card { display: grid; gap: 1rem; }.boundary-card p, .muted { color: var(--ofx-text-muted); }.input-grid, .detail-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.input-grid label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.input-grid input { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); min-height: 2.5rem; padding: .55rem; }.actions { display: flex; flex-wrap: wrap; gap: 1rem; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.error { color: var(--ofx-text-danger); margin-bottom: 1rem; }.detail-grid dt { color: var(--ofx-text-muted); font-size: .75rem; font-weight: 700; text-transform: uppercase; }.detail-grid dd { margin: .35rem 0 0; white-space: pre-wrap; }.detail-grid .full { grid-column: 1 / -1; }
</style>
