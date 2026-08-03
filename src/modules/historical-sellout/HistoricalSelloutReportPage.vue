<script setup lang="ts">
import { ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { HistoricalSelloutReportService } from './historical-sellout.service';
import {
  buildCommunityHistoricalSelloutReportRequest,
  parseExplicitIdentifiers,
  type CommunityHistoricalSelloutReport,
} from './historical-sellout.types';

const historicalSelloutReportService = new HistoricalSelloutReportService(httpClient);
const startDate = ref('');
const endDate = ref('');
const materialIdsText = ref('');
const locationIdsText = ref('');
const report = ref<CommunityHistoricalSelloutReport | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

/** Loads one raw, server-defined report snapshot after local date-range validation. */
async function loadReport(): Promise<void> {

  if (loading.value) {
    return;
  }

  try {
    const request = buildCommunityHistoricalSelloutReportRequest({
      startDate: startDate.value,
      endDate: endDate.value,
      materialIds: parseExplicitIdentifiers(materialIdsText.value),
      locationIds: parseExplicitIdentifiers(locationIdsText.value),
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
</script>

<template>
  <TaskPageLayout class="historical-sellout-page">
    <OfxPageHeader
      eyebrow="Demand Planning"
      title="Historical Sell-out Report"
      description="Inspect raw Community sell-out documents for one explicit date interval."
    />

    <OfxSectionCard class="boundary-card" title="Community scope">
      <p>Dates are mandatory. Material and Location IDs are optional, manual filters; leave either field empty to retain the server's full active scope for that dimension.</p>
      <p class="muted">No master-data catalog, characteristics, aggregation, demand-plan comparison, conversion, Data operation, upload, download, or mutation is included here.</p>
    </OfxSectionCard>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="filter-card" title="Interval and optional explicit scope" description="Canonical report request.">
      <div class="filter-grid">
        <label>Initial date<input v-model="startDate" :disabled="loading" required type="date"></label>
        <label>Final date<input v-model="endDate" :disabled="loading" required type="date"></label>
        <label>Material IDs <small>optional; comma, semicolon, space, or line separated</small><textarea v-model="materialIdsText" :disabled="loading" spellcheck="false"></textarea></label>
        <label>Location IDs <small>optional; comma, semicolon, space, or line separated</small><textarea v-model="locationIdsText" :disabled="loading" spellcheck="false"></textarea></label>
      </div>
      <div class="actions"><button class="primary-button" :disabled="loading" type="button" @click="loadReport">{{ loading ? 'Loading historical sell-out…' : 'Load historical sell-out' }}</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="report" class="results-card" title="Historical sell-out documents" description="The six columns below are the exact Community report columns. The browser does not aggregate or convert them.">
      <div class="section-heading"><p class="eyebrow">Raw server snapshot</p><span>{{ report.data.length }} row{{ report.data.length === 1 ? '' : 's' }}</span></div>
      <p v-if="report.data.length === 0" class="muted">No sell-out documents were returned for the selected interval and optional IDs.</p>
      <div v-else class="table-wrap"><table><thead><tr><th>Document ID</th><th>Reference date</th><th>Origin location</th><th>Material</th><th>Document UOM</th><th>Quantity</th></tr></thead><tbody><tr v-for="(row, index) in report.data" :key="`${row.documentId ?? 'document'}-${row.referenceDate ?? 'date'}-${index}`"><td>{{ row.documentId ?? '—' }}</td><td>{{ row.referenceDate ?? '—' }}</td><td>{{ row.originLocationId ?? '—' }}</td><td>{{ row.materialId ?? '—' }}</td><td>{{ row.uomId ?? '—' }}</td><td>{{ row.quantity ?? '—' }}</td></tr></tbody></table></div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card, .filter-card, .results-card { display: grid; gap: 1rem; }.muted, .boundary-card p { color: var(--ofx-text-muted); }.filter-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }.filter-grid label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.filter-grid small { color: var(--ofx-text-muted); font-weight: 400; }.filter-grid input, .filter-grid textarea { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); min-height: 2.5rem; padding: .55rem; }.filter-grid textarea { min-height: 7rem; resize: vertical; }.actions, .section-heading { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .55; }.error { color: var(--ofx-text-danger); margin-bottom: 1rem; }.section-heading > span { color: var(--ofx-text-muted); }.table-wrap { overflow-x: auto; }table { border-collapse: collapse; min-width: 64rem; width: 100%; }th, td { border-bottom: 1px solid var(--ofx-border); padding: .65rem; text-align: left; vertical-align: top; white-space: nowrap; }th { color: var(--ofx-text-muted); font-size: .78rem; }
</style>
