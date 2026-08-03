<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { requestJson } from '@/services/api/request';
import { fetchClusterLevelConfiguration, saveClusterLevelConfiguration, type DemandClusterLevelConfiguration } from './services/cluster-level-configuration.service';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';

interface Option { id: string | number; description?: string | null; codigo?: string | number | null; descricao?: string | null; bucketSize?: string | null; }
const profiles = ref<Option[]>([]); const locations = ref<Option[]>([]); const products = ref<Option[]>([]);
const profileId = ref(''); const locationId = ref(''); const productId = ref(''); const loading = ref(true); const saving = ref(false); const failure = ref(''); const feedback = ref('');
const configuration = ref<DemandClusterLevelConfiguration>(emptyConfiguration());
const ready = computed(() => Boolean(profileId.value && locationId.value && productId.value));

function emptyConfiguration(): DemandClusterLevelConfiguration {
  return { demandPlanningGeneralParameters: { executeDemandPlan: true, roundToSalesUnit: false }, demandPlanningForecastParameters: { statisticalModel: 'MM', daysMovingAverageModel: 3, splitModel: 'HISTORICAL_SALES' } };
}
function label(option: Option): string { return option.description ?? option.descricao ?? String(option.id ?? option.codigo); }
function optionId(option: Option): string { return String(option.id ?? option.codigo ?? ''); }
async function loadConfiguration(): Promise<void> {
  if (!ready.value) { configuration.value = emptyConfiguration(); return; }
  try { failure.value = ''; configuration.value = await fetchClusterLevelConfiguration(profileId.value, locationId.value, productId.value); }
  catch (error) { configuration.value = emptyConfiguration(); failure.value = error instanceof Error ? error.message : 'Unable to load the Community configuration.'; }
}
async function save(): Promise<void> {
  if (!ready.value || saving.value) return;
  try { saving.value = true; failure.value = ''; await saveClusterLevelConfiguration({ demandPlanExecutionProfileId: profileId.value, locationClusterId: Number(locationId.value), materialClusterId: Number(productId.value), demandPlanningGeneralParameters: { executeDemandPlan: configuration.value.demandPlanningGeneralParameters.executeDemandPlan ?? true, uomId: configuration.value.demandPlanningGeneralParameters.uomId ?? null, roundToSalesUnit: configuration.value.demandPlanningGeneralParameters.roundToSalesUnit ?? false }, demandPlanningForecastParameters: { statisticalModel: configuration.value.demandPlanningForecastParameters.statisticalModel ?? 'MM', daysMovingAverageModel: configuration.value.demandPlanningForecastParameters.daysMovingAverageModel ?? 3, daysSmoothingModel: configuration.value.demandPlanningForecastParameters.daysSmoothingModel ?? null, alpha: configuration.value.demandPlanningForecastParameters.alpha ?? null, beta: configuration.value.demandPlanningForecastParameters.beta ?? null, gamma: configuration.value.demandPlanningForecastParameters.gamma ?? null, splitModel: 'HISTORICAL_SALES' } }); feedback.value = 'Community cluster-level configuration saved.'; }
  catch (error) { failure.value = error instanceof Error ? error.message : 'Unable to save the Community configuration.'; }
  finally { saving.value = false; }
}
onMounted(async () => { try { const [loadedProfiles, loadedLocations, loadedProducts] = await Promise.all([requestJson<Option[]>('/api/secured/demandplanexecutionprofile'), requestJson<Option[]>('/api/secured/location/cluster'), requestJson<Option[]>('/api/secured/material/cluster')]); profiles.value = loadedProfiles; locations.value = loadedLocations; products.value = loadedProducts; } catch (error) { failure.value = error instanceof Error ? error.message : 'Unable to load Community catalogs.'; } finally { loading.value = false; } });
</script>

<template>
  <TaskPageLayout class="cluster-level-configuration-page">
    <OfxPageHeader eyebrow="Demand Planning" title="Demand Planning Cluster-Level Configuration" description="Configure the Community forecast model for one execution profile and cluster pair. Enterprise controls remain in their reference positions and are explicitly marked." >
      <template #actions>
        <button class="primary-button" type="button" :disabled="!ready || saving" @click="save">{{ saving ? 'Saving…' : 'Save Parameters' }}</button>
      </template>
    </OfxPageHeader>
    <p v-if="failure" class="rounded-[14px] border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800" role="alert">{{ failure }}</p>
    <p v-if="feedback" class="rounded-[14px] border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-800" role="status">{{ feedback }}</p>
    <div class="selection-layout">
      <OfxSectionCard title="Execution Profile Selection">
        <div class="grid gap-4">
          <label class="field-label">Execution Profile<select v-model="profileId" :disabled="loading" @change="loadConfiguration"><option value="">Select profile</option><option v-for="profile in profiles" :key="optionId(profile)" :value="optionId(profile)">{{ label(profile) }}</option></select></label>
          <div class="detail-grid">
            <div class="locked-control"><span>Bucket Size</span><strong>{{ profiles.find((profile) => optionId(profile) === profileId)?.bucketSize ?? 'Select a profile' }}</strong></div>
            <div class="locked-control"><span>Default Auto-Fit</span><strong>Enterprise</strong><small>Automatic model selection is available in Enterprise.</small></div>
          </div>
        </div>
      </OfxSectionCard>
      <OfxSectionCard title="Cluster Selection">
        <div class="grid gap-4 md:grid-cols-2"><label class="field-label">Location Cluster<select v-model="locationId" :disabled="loading" @change="loadConfiguration"><option value="">Select location cluster</option><option v-for="location in locations" :key="optionId(location)" :value="optionId(location)">{{ label(location) }}</option></select></label><label class="field-label">Product Cluster<select v-model="productId" :disabled="loading" @change="loadConfiguration"><option value="">Select material cluster</option><option v-for="product in products" :key="optionId(product)" :value="optionId(product)">{{ label(product) }}</option></select></label></div>
        <div v-if="ready" class="mt-4 detail-grid"><label class="toggle-control"><input v-model="configuration.demandPlanningGeneralParameters.executeDemandPlan" type="checkbox"> Execute Demand Plan</label><div class="locked-control"><span>Use Auto-fitted Model</span><strong>Enterprise</strong></div></div>
      </OfxSectionCard>
    </div>
    <form v-if="ready" class="grid max-w-5xl gap-5" @submit.prevent="save">
      <div class="enterprise-grid">
        <OfxSectionCard title="Outlier Smoothing" description="The smoothing section is retained from the reference workspace.">
          <div class="grid gap-4 md:grid-cols-2"><label class="field-label">Outlier Smoothing Model<select disabled><option>Enterprise capability</option></select></label><label class="field-label">Days for Outlier Smoothing<input disabled value="Enterprise capability"></label></div>
          <div class="detail-grid mt-4"><div class="locked-control"><span>Lower Percentile Smoothing</span><small>Enable lower percentile smoothing</small><strong>Enterprise</strong></div><div class="locked-control"><span>Upper Percentile Smoothing</span><small>Enable upper percentile smoothing</small><strong>Enterprise</strong></div></div>
        </OfxSectionCard>
        <OfxSectionCard title="DFU Split" description="Split configuration stays visible in the same position as the reference.">
          <div class="grid gap-4"><label class="field-label">Split Model<select disabled><option>Historical Sales</option></select></label><label class="field-label">Days for Top-Down Split<input disabled value="Enterprise capability"></label><div class="enterprise-note"><strong>Enterprise</strong> Top-down aggregation, allocation and alternative split models require Enterprise planning data.</div></div>
        </OfxSectionCard>
      </div>
      <OfxSectionCard title="Forecast Model Parametrization" description="Community supports the approved statistical models and parameters; Enterprise controls stay visible in their reference locations.">
        <div class="grid gap-4 xl:grid-cols-5">
          <label class="field-label">Forecast Model<select v-model="configuration.demandPlanningForecastParameters.statisticalModel"><option value="MM">Moving Average</option><option value="RMM">Rolling Moving Average</option><option value="ARIMA">ARIMA</option><option value="HOLT_WINTERS">Holt-Winters</option><option value="ES">Exponential Smoothing</option></select></label>
          <label class="field-label">Budget Version<select disabled><option>Enterprise capability</option></select></label>
          <label class="field-label">Event Uplift<select disabled><option>Enterprise capability</option></select></label>
          <label class="field-label">Product Aggregation<select disabled><option>Enterprise capability</option></select></label>
          <label class="field-label">Location Aggregation<select disabled><option>Enterprise capability</option></select></label>
          <label class="field-label">Unit of Measure<input :value="configuration.demandPlanningGeneralParameters.uomId ?? 'Published by profile'" disabled></label>
        </div>
        <div class="grid gap-4 xl:grid-cols-4 mt-4">
          <label class="field-label">Moving Average Days<input v-model="configuration.demandPlanningForecastParameters.daysMovingAverageModel" min="1" type="number"></label>
          <label class="field-label">Stockout Treatment<select disabled><option>Enterprise capability</option></select></label>
          <label class="toggle-control"><input v-model="configuration.demandPlanningGeneralParameters.roundToSalesUnit" type="checkbox"> Round forecast to sales UOM</label>
        </div>
        <div class="detail-grid mt-4"><div class="locked-control"><span>Seasonality Scale</span><small>Automatic selection</small><strong>Enterprise</strong></div><div class="locked-control"><span>Monthly Fourier Order</span><small>Automatic selection</small><strong>Enterprise</strong></div><div class="locked-control"><span>Trend Change Flexibility</span><small>Automatic selection</small><strong>Enterprise</strong></div></div>
        <div class="detail-grid mt-4"><label class="field-label">Alpha<input v-model="configuration.demandPlanningForecastParameters.alpha" min="0" max="1" step=".01" type="number"></label><label class="field-label">Beta<input v-model="configuration.demandPlanningForecastParameters.beta" min="0" max="1" step=".01" type="number"></label><label class="field-label">Gamma<input v-model="configuration.demandPlanningForecastParameters.gamma" min="0" max="1" step=".01" type="number"></label></div>
        <div class="detail-grid mt-4"><div class="locked-control"><span>Force Aggregated Forecast</span><small>Chronos configuration</small><strong>Enterprise</strong></div><div class="locked-control"><span>Trend / Growth Regressor</span><small>Enable trend regressor</small><strong>Enterprise</strong></div><div class="locked-control"><span>Working Days Regressor</span><small>Enable working days regressor</small><strong>Enterprise</strong></div></div>
        <div class="enterprise-note mt-4"><strong>Enterprise</strong> Support Regressors, Prophet/Chronos tuning, budgets, uplift, aggregation and stockout treatment are deliberately blocked without widening Community transport.</div>
        <template #actions><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save Configuration' }}</button></template>
      </OfxSectionCard>
      <div class="reference-slots-grid">
        <OfxSectionCard title="Sales History and Coverage" description="Historical coverage uses Enterprise calculation policies in this workspace.">
          <div class="grid gap-4"><label class="field-label">Days of Historical Sales<input disabled value="Enterprise capability"></label><div class="locked-control"><span>Consider historical sales of inactive DFUs</span><strong>Enterprise</strong></div><div class="locked-control"><span>Generate forecast for out-of-line products</span><strong>Enterprise</strong></div></div>
        </OfxSectionCard>
        <OfxSectionCard title="Simulation Parameters" description="Simulation settings remain in their reference layout without exposing Enterprise calculation endpoints.">
          <div class="grid gap-4"><label class="field-label">Reference Period<input disabled value="Enterprise capability"></label><label class="field-label">Forecast Lag<input disabled value="Enterprise capability"></label><div class="enterprise-note"><strong>Enterprise</strong> Simulated forecasts and errors require the Enterprise analytics surface.</div></div>
        </OfxSectionCard>
      </div>
      <div class="reference-slots-grid">
        <OfxSectionCard title="Pricing Model Parametrization" description="Pricing-model inputs retain the reference chapter without exposing private calculation contracts.">
          <div class="enterprise-placeholder">Enterprise pricing model parametrization is unavailable in Community.</div>
        </OfxSectionCard>
        <OfxSectionCard title="Forecast Accuracy" description="Forecast-accuracy diagnostics remain in the same analysis flow as the legacy front.">
          <div class="enterprise-placeholder">Enterprise forecast-accuracy diagnostics are unavailable in Community.</div>
        </OfxSectionCard>
      </div>
      <OfxSectionCard title="Detailed View Filters" description="Detailed forecast dimensions stay visible in their legacy workspace position.">
        <div class="enterprise-placeholder">Enterprise characteristic and detailed-view filters are unavailable in Community.</div>
      </OfxSectionCard>
      <div class="reference-slots-grid">
        <OfxSectionCard title="Forecast Preview">
          <div class="enterprise-placeholder">Enterprise forecast preview remains in this reference position.</div>
        </OfxSectionCard>
        <OfxSectionCard title="Seasonality Comparison">
          <div class="enterprise-placeholder">Enterprise seasonality comparison remains in this reference position.</div>
        </OfxSectionCard>
      </div>
    </form>
    <p v-else-if="!loading" class="text-sm text-[color:var(--ofx-text-muted)]">Select a profile and both clusters to edit the Community configuration.</p>
  </TaskPageLayout>
</template>

<style scoped>
.selection-layout, .enterprise-grid, .reference-slots-grid, .detail-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.field-label { display: grid; gap: .5rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }
.field-label input, .field-label select { min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .75rem; color: var(--ofx-text); }
.enterprise-note { border: 1px dashed var(--ofx-border-strong); border-radius: 14px; background: var(--ofx-muted); padding: 1rem; color: var(--ofx-text-muted); font-size: .875rem; }
.enterprise-note strong { margin-right: .5rem; color: var(--ofx-text); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
.enterprise-placeholder, .locked-control { border: 1px dashed var(--ofx-border-strong); border-radius: 14px; background: var(--ofx-surface-elevated); color: var(--ofx-text-muted); padding: 1rem; font-size: .875rem; }
.locked-control { display: grid; gap: .35rem; }.locked-control span { color: var(--ofx-text); font-weight: 600; }.locked-control strong { color: var(--ofx-text); font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; }.locked-control small { font-size: .75rem; }.toggle-control { display: flex; align-items: center; gap: .7rem; min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .75rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }
.primary-button { display: inline-flex; height: 2.5rem; align-items: center; border-radius: 12px; background: var(--ofx-primary); padding: 0 1rem; color: var(--ofx-primary-foreground); font-size: .875rem; font-weight: 600; }
.primary-button:disabled { cursor: not-allowed; opacity: .45; }
@media (max-width: 760px) { .selection-layout, .enterprise-grid, .reference-slots-grid, .detail-grid { grid-template-columns: 1fr; } }
</style>
