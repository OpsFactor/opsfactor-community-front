<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxDateField, OfxEntityMultiSelect, OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import {
  communityNamedOptionLabel,
  loadCommunityLocations,
  loadCommunityMaterials,
  type CommunityNamedOption,
} from '../../services/community-option-catalog.service';
import { HistoricalSelloutReportService } from './historical-sellout.service';
import {
  buildCommunityHistoricalSelloutReportRequest,
  type CommunityHistoricalSelloutReport,
} from './historical-sellout.types';

const historicalSelloutReportService = new HistoricalSelloutReportService(httpClient);
const startDate = ref('');
const endDate = ref('');
const materialIds = ref<string[]>([]);
const locationIds = ref<string[]>([]);
const materials = ref<CommunityNamedOption[]>([]);
const locations = ref<CommunityNamedOption[]>([]);
const report = ref<CommunityHistoricalSelloutReport | null>(null);
const loading = ref(false);
const loadingOptions = ref(true);
const errorMessage = ref<string | null>(null);
const materialOptions = computed(() => materials.value.map((material) => ({
  value: material.id,
  label: communityNamedOptionLabel(material),
})));
const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: communityNamedOptionLabel(location),
})));

/** Loads one raw, server-defined report snapshot after local date-range validation. */
async function loadReport(): Promise<void> {

  if (loading.value) {
    return;
  }

  try {
    const request = buildCommunityHistoricalSelloutReportRequest({
      startDate: startDate.value,
      endDate: endDate.value,
      materialIds: materialIds.value,
      locationIds: locationIds.value,
    });
    loading.value = true;
    errorMessage.value = null;
    report.value = await historicalSelloutReportService.getReport(request);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the historical sell-out report.';
  } finally {
    loading.value = false;
  }

}

/** Preloads optional persisted scopes using the Planning Front selector pattern. */
onMounted(async () => {

  try {
    [materials.value, locations.value] = await Promise.all([
      loadCommunityMaterials(),
      loadCommunityLocations(),
    ]);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load sell-out filter catalogs.';
  } finally {
    loadingOptions.value = false;
  }

});
</script>

<template>
  <TaskPageLayout class="historical-sellout-page">
    <OfxPageHeader
      eyebrow="Demand Planning"
      title="Historical Sell-out Report"
      description="Inspect raw sell-out documents for one explicit date interval."
    />

    <OfxSectionCard class="boundary-card" title="Available information">
      <p>Dates are mandatory. Material and Location are optional catalog filters; leave either selection empty to retain the server's full active scope for that dimension.</p>
      <p class="muted">Characteristics, aggregation, demand-plan comparison, conversion, Data operations and mutation are not included here.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="filter-card" title="Interval and optional explicit scope" description="Canonical report request.">
      <div class="filter-grid">
        <OfxDateField v-model="startDate" label="Initial date" :disabled="loading" required />
        <OfxDateField v-model="endDate" label="Final date" :disabled="loading" required />
        <OfxEntityMultiSelect v-model="materialIds" label="Materials" :options="materialOptions" :disabled="loading || loadingOptions" placeholder="All materials" />
        <OfxEntityMultiSelect v-model="locationIds" label="Locations" :options="locationOptions" :disabled="loading || loadingOptions" placeholder="All locations" />
      </div>
      <div class="actions"><button class="primary-button" :disabled="loading" type="button" @click="loadReport">{{ loading ? 'Loading historical sell-out…' : 'Load historical sell-out' }}</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="report" class="results-card" title="Historical sell-out documents" description="The six columns below are returned exactly as reported. The browser does not aggregate or convert them.">
      <div class="section-heading"><p class="eyebrow">Raw server snapshot</p><span>{{ report.data.length }} row{{ report.data.length === 1 ? '' : 's' }}</span></div>
      <p v-if="report.data.length === 0" class="muted">No sell-out documents were returned for the selected interval and optional IDs.</p>
      <div v-else class="table-wrap"><table><thead><tr><th>Document ID</th><th>Reference date</th><th>Origin location</th><th>Material</th><th>Document UOM</th><th>Quantity</th></tr></thead><tbody><tr v-for="(row, index) in report.data" :key="`${row.documentId ?? 'document'}-${row.referenceDate ?? 'date'}-${index}`"><td>{{ row.documentId ?? '—' }}</td><td>{{ row.referenceDate ?? '—' }}</td><td>{{ row.originLocationId ?? '—' }}</td><td>{{ row.materialId ?? '—' }}</td><td>{{ row.uomId ?? '—' }}</td><td>{{ row.quantity ?? '—' }}</td></tr></tbody></table></div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .filter-card, .results-card { display: grid; gap: 1rem; }.muted, .boundary-card p { color: var(--ofx-text-muted); }.filter-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }.filter-grid label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.filter-grid input { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); min-height: 2.5rem; padding: .55rem; }.actions, .section-heading { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.error { color: var(--ofx-text-danger); margin-bottom: 1rem; }.section-heading > span { color: var(--ofx-text-muted); }.table-wrap { overflow-x: auto; }table { border-collapse: collapse; min-width: 64rem; width: 100%; }th, td { border-bottom: 1px solid var(--ofx-border); padding: .65rem; text-align: left; vertical-align: top; white-space: nowrap; }th { color: var(--ofx-text-muted); font-size: .78rem; }
</style>
