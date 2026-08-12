<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import OfxSelectField from '../../components/ofx/forms/OfxSelectField.vue';
import { getCircularNetworkAlerts, getSupplyNetworkVersions } from './network-diagnostics.service';
import type { CircularNetworkAlert, SupplyNetworkVersion } from './network-diagnostics.types';

const supplyNetworkVersions = ref<SupplyNetworkVersion[]>([]);
const supplyNetworkVersionId = ref('');
const circularNetworkAlerts = ref<CircularNetworkAlert[] | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingDiagnostics = ref(false);
const errorMessage = ref<string | null>(null);

const canLoadDiagnostics = computed(() => supplyNetworkVersionId.value.trim().length > 0);
const supplyNetworkVersionOptions = computed(() => [
  { label: 'Select a Supply Network Version', value: '' },
  ...supplyNetworkVersions.value.map((version) => ({ label: supplyNetworkVersionLabel(version), value: version.id })),
]);

/** Shows a raw backend field while preserving null and absent values as unavailable. */
function formatRawValue(value: string | number | null | undefined): string {

  return value === null || value === undefined || value === '' ? '—' : String(value);

}

function supplyNetworkVersionLabel(supplyNetworkVersion: SupplyNetworkVersion): string {

  return supplyNetworkVersion.description?.trim()
    ? `${supplyNetworkVersion.description} (${supplyNetworkVersion.id})`
    : supplyNetworkVersion.id;

}

/** Loads the selector only; the potentially expensive subgraph reconstruction remains explicit. */
async function loadSupplyNetworkVersions(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    supplyNetworkVersions.value = await getSupplyNetworkVersions();
    supplyNetworkVersionId.value = supplyNetworkVersions.value[0]?.id ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Supply Network Versions.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

/** Replaces the raw result only after the user explicitly requests one selected network diagnostic. */
async function loadCircularNetworkDiagnostics(): Promise<void> {

  if (!canLoadDiagnostics.value) return;

  isLoadingDiagnostics.value = true;
  errorMessage.value = null;

  try {
    circularNetworkAlerts.value = await getCircularNetworkAlerts(supplyNetworkVersionId.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to diagnose Supply Network circularity.';
  } finally {
    isLoadingDiagnostics.value = false;
  }

}

onMounted(loadSupplyNetworkVersions);
</script>

<template>
  <TaskPageLayout class="network-diagnostics-page">
    <OfxPageHeader eyebrow="Supply Planning" title="Supply Network Diagnostics" description="Inspect the existing Low Level Code circularity diagnostic for one Supply Network Version." />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="filters" aria-labelledby="network-diagnostics-selection-title">
      <div class="section-header">
        <div>
          <h2 id="network-diagnostics-selection-title">Supply Network Version</h2>
          <p>The diagnostic reconstructs only the selected circular subgraph when requested.</p>
        </div>
      </div>
      <OfxSelectField v-model="supplyNetworkVersionId" label="Supply Network Version" :options="supplyNetworkVersionOptions" :disabled="isLoadingSelectors" />
      <div class="actions">
        <button class="primary-button" :disabled="!canLoadDiagnostics || isLoadingDiagnostics" @click="loadCircularNetworkDiagnostics">
          {{ isLoadingDiagnostics ? 'Diagnosing…' : 'Diagnose circularity' }}
        </button>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="circularNetworkAlerts !== null" aria-labelledby="network-diagnostics-result-title">
      <div class="section-header">
        <div>
          <h2 id="network-diagnostics-result-title">Circular dependencies</h2>
          <p>Each row is returned directly by the backend diagnostic; no graph is inferred in the browser.</p>
        </div>
      </div>
      <p v-if="circularNetworkAlerts.length === 0" class="muted">No circular dependency was found for this Supply Network Version.</p>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Master data type</th>
              <th scope="col">Master data ID</th>
              <th scope="col">Low level code</th>
              <th scope="col">Circularity ID</th>
              <th scope="col">Reference material ID</th>
              <th scope="col">BOM output material ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(circularNetworkAlert, index) in circularNetworkAlerts" :key="`${circularNetworkAlert.circularNetworkId ?? 'none'}-${circularNetworkAlert.masterData ?? 'none'}-${circularNetworkAlert.masterDataId ?? 'none'}-${index}`">
              <td>{{ formatRawValue(circularNetworkAlert.masterData) }}</td>
              <td>{{ formatRawValue(circularNetworkAlert.masterDataId) }}</td>
              <td>{{ formatRawValue(circularNetworkAlert.lowLevelCode) }}</td>
              <td>{{ formatRawValue(circularNetworkAlert.circularNetworkId) }}</td>
              <td>{{ formatRawValue(circularNetworkAlert.materialId) }}</td>
              <td>{{ formatRawValue(circularNetworkAlert.outputMaterialId) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.section-header, .actions { display: flex; align-items: end; gap: 1rem; justify-content: space-between; }
.section-header h2 { margin: .25rem 0; }
.filters { display: grid; gap: 1rem; grid-template-columns: minmax(16rem, 28rem) auto; }.filters .section-header { grid-column: 1 / -1; }
.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .5; }
.table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; text-align: left; } th, td { border-top: 1px solid var(--ofx-border); padding: .8rem .65rem; vertical-align: top; white-space: nowrap; } thead th { color: var(--ofx-text-muted); font-size: .75rem; text-transform: uppercase; }.muted, .section-header p { color: var(--ofx-text-muted); }.error { color: var(--ofx-text-danger); }
</style>
