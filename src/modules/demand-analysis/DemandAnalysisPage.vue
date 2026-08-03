<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { DemandAnalysisService } from './demand-analysis.service';
import {
  buildDemandAnalysisConfigurationPayload,
  isOptionalPositiveInteger,
  type DemandAnalysisConfiguration,
  type DemandAnalysisExecutionProfile,
  type DemandAnalysisLocationCluster,
  type DemandAnalysisMaterialCluster,
  type DemandAnalysisSimulation,
  type SimulatedDemandPlanMaterialLocation,
} from './demand-analysis.types';

const demandAnalysisService = new DemandAnalysisService(httpClient);
const executionProfiles = ref<DemandAnalysisExecutionProfile[]>([]);
const materialClusters = ref<DemandAnalysisMaterialCluster[]>([]);
const locationClusters = ref<DemandAnalysisLocationCluster[]>([]);
const selectedExecutionProfileId = ref('');
const selectedMaterialClusterId = ref<number | null>(null);
const selectedLocationClusterId = ref<number | null>(null);
const configuration = ref<DemandAnalysisConfiguration | null>(null);
const simulation = ref<DemandAnalysisSimulation | null>(null);
const selectedSeriesKey = ref('');
const referenceDate = ref(getLocalIsoDate());
const loadingSelectors = ref(false);
const loadingConfiguration = ref(false);
const simulating = ref(false);
const saving = ref(false);
const saveConfirmationOpen = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const selectedSeries = computed(() => simulation.value?.materialLocationData.find(
  (line) => seriesKey(line) === selectedSeriesKey.value,
) ?? null);

const hasCompleteScope = computed(() => selectedExecutionProfileId.value.length > 0
  && selectedMaterialClusterId.value !== null
  && selectedLocationClusterId.value !== null);

const hasValidConfiguration = computed(() => {
  const currentConfiguration = configuration.value;
  if (currentConfiguration === null) return false;

  const general = currentConfiguration.demandPlanningGeneralParameters;
  const forecast = currentConfiguration.demandPlanningForecastParameters;
  return general.uomId.trim().length > 0
    && isOptionalPositiveInteger(general.daysSalesHistory)
    && isOptionalPositiveInteger(forecast.daysMovingAverageModel)
    && isOptionalPositiveInteger(forecast.daysTopDownSplit)
    && [forecast.alpha, forecast.beta, forecast.gamma].every(isOptionalFiniteNumber);
});

const canSimulate = computed(() => configuration.value !== null
  && hasValidConfiguration.value
  && referenceDate.value.length > 0
  && !loadingConfiguration.value
  && !simulating.value
  && !saving.value);

const canSave = computed(() => configuration.value !== null
  && hasValidConfiguration.value
  && !loadingConfiguration.value
  && !simulating.value
  && !saving.value);

function getLocalIsoDate(): string {

  const date = new Date();
  const timezoneOffsetMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMilliseconds).toISOString().slice(0, 10);
}

function seriesKey(line: SimulatedDemandPlanMaterialLocation): string {

  return `${line.locationId}\u0000${line.materialId}`;
}

function seriesLabel(line: SimulatedDemandPlanMaterialLocation): string {

  return `${line.locationId} · ${line.materialId}`;
}

function profileLabel(profile: DemandAnalysisExecutionProfile): string {

  return profile.description?.trim() ? `${profile.description} (${profile.id})` : profile.id;
}

function materialClusterLabel(cluster: DemandAnalysisMaterialCluster): string {

  return cluster.description?.trim() ? `${cluster.description} (#${cluster.id})` : `Material cluster #${cluster.id}`;
}

function locationClusterLabel(cluster: DemandAnalysisLocationCluster): string {

  return cluster.description?.trim() ? `${cluster.description} (#${cluster.id})` : `Location cluster #${cluster.id}`;
}

function isOptionalFiniteNumber(value: number | null): boolean {

  return value === null || Number.isFinite(value);
}

function formatRawValue(value: number | undefined): string {

  return value === undefined ? '—' : String(value);
}

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

/** Loads only the three small canonical selector catalogs; no configuration or simulation is preloaded. */
async function loadSelectors(): Promise<void> {

  loadingSelectors.value = true;
  errorMessage.value = null;
  try {
    const [profileList, materialClusterList, locationClusterList] = await Promise.all([
      demandAnalysisService.getExecutionProfiles(),
      demandAnalysisService.getMaterialClusters(),
      demandAnalysisService.getLocationClusters(),
    ]);
    executionProfiles.value = profileList;
    materialClusters.value = materialClusterList;
    locationClusters.value = locationClusterList;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load Demand Analysis selectors.');
  } finally {
    loadingSelectors.value = false;
  }
}

/** Replaces all transient output before loading defaults/persisted parameters for a new scope. */
async function loadConfiguration(): Promise<void> {

  configuration.value = null;
  simulation.value = null;
  selectedSeriesKey.value = '';
  successMessage.value = null;
  saveConfirmationOpen.value = false;
  if (!hasCompleteScope.value || selectedMaterialClusterId.value === null || selectedLocationClusterId.value === null) {
    return;
  }

  const scopeKey = `${selectedExecutionProfileId.value}/${selectedLocationClusterId.value}/${selectedMaterialClusterId.value}`;
  loadingConfiguration.value = true;
  errorMessage.value = null;
  try {
    const serverConfiguration = await demandAnalysisService.getConfiguration(
      selectedExecutionProfileId.value,
      selectedLocationClusterId.value,
      selectedMaterialClusterId.value,
    );
    const activeScopeKey = `${selectedExecutionProfileId.value}/${selectedLocationClusterId.value}/${selectedMaterialClusterId.value}`;
    if (scopeKey === activeScopeKey) {
      configuration.value = buildDemandAnalysisConfigurationPayload(serverConfiguration);
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load Demand Analysis configuration.');
  } finally {
    loadingConfiguration.value = false;
  }
}

/** Runs the cluster-scoped server simulation once and leaves DFU selection entirely local to its response. */
async function simulateForecast(): Promise<void> {

  if (!canSimulate.value || configuration.value === null) {
    return;
  }

  simulating.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  simulation.value = null;
  selectedSeriesKey.value = '';
  try {
    simulation.value = await demandAnalysisService.simulate({
      referenceDate: referenceDate.value,
      demandPlanningConfiguration: buildDemandAnalysisConfigurationPayload(configuration.value),
    });
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to simulate the Demand Planning forecast.');
  } finally {
    simulating.value = false;
  }
}

/** Opens a confirmation instead of persisting cluster parameters from an incidental form action. */
function requestSave(): void {

  if (canSave.value) {
    saveConfirmationOpen.value = true;
  }
}

/** Sends only the clean Community configuration after the user confirms the persistent change. */
async function confirmSave(): Promise<void> {

  if (!canSave.value || configuration.value === null) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    successMessage.value = await demandAnalysisService.save(
      buildDemandAnalysisConfigurationPayload(configuration.value),
    );
    saveConfirmationOpen.value = false;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save Demand Analysis configuration.');
  } finally {
    saving.value = false;
  }
}

watch([selectedExecutionProfileId, selectedMaterialClusterId, selectedLocationClusterId], () => {
  void loadConfiguration();
});

onMounted(() => {
  void loadSelectors();
});
</script>

<template>
  <TaskPageLayout class="demand-analysis-page">
    <OfxPageHeader eyebrow="Demand Planning" title="Demand Analysis" description="Configure and simulate the Community statistical forecast for one material/location cluster scope." />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <OfxSectionCard class="scope-card" aria-labelledby="demand-analysis-scope-title">
      <h2 id="demand-analysis-scope-title">Configuration scope</h2>
      <div class="scope-fields">
        <label>
          Demand Planning execution profile
          <select v-model="selectedExecutionProfileId" :disabled="loadingSelectors || loadingConfiguration || simulating || saving">
            <option value="">{{ loadingSelectors ? 'Loading profiles…' : 'Select an execution profile' }}</option>
            <option v-for="profile in executionProfiles" :key="profile.id" :value="profile.id">{{ profileLabel(profile) }}</option>
          </select>
        </label>
        <label>
          Material cluster
          <select v-model.number="selectedMaterialClusterId" :disabled="loadingSelectors || loadingConfiguration || simulating || saving">
            <option :value="null">{{ loadingSelectors ? 'Loading material clusters…' : 'Select a material cluster' }}</option>
            <option v-for="cluster in materialClusters" :key="cluster.id" :value="cluster.id">{{ materialClusterLabel(cluster) }}</option>
          </select>
        </label>
        <label>
          Location cluster
          <select v-model.number="selectedLocationClusterId" :disabled="loadingSelectors || loadingConfiguration || simulating || saving">
            <option :value="null">{{ loadingSelectors ? 'Loading location clusters…' : 'Select a location cluster' }}</option>
            <option v-for="cluster in locationClusters" :key="cluster.id" :value="cluster.id">{{ locationClusterLabel(cluster) }}</option>
          </select>
        </label>
      </div>
      <p class="muted">Configuration is loaded only after all three selectors are chosen. No cluster simulation is preloaded.</p>
    </OfxSectionCard>

    <OfxSectionCard v-if="loadingConfiguration" class="muted">Loading the Community cluster-level configuration…</OfxSectionCard>

    <template v-if="configuration">
      <OfxSectionCard class="parameters-card" aria-labelledby="demand-analysis-general-title">
        <div class="section-header">
          <div><p class="eyebrow">Community configuration</p><h2 id="demand-analysis-general-title">General parameters</h2></div>
          <span>Profile {{ configuration.demandPlanExecutionProfileId }} · material cluster #{{ configuration.materialClusterId }} · location cluster #{{ configuration.locationClusterId }}</span>
        </div>
        <div class="parameter-grid">
          <label>Demand Planning unit of measure<input v-model.trim="configuration.demandPlanningGeneralParameters.uomId" :disabled="simulating || saving" type="text"></label>
          <label>Historical sales days<input v-model.number="configuration.demandPlanningGeneralParameters.daysSalesHistory" :disabled="simulating || saving" type="number" min="1" step="1"></label>
          <label>Material aggregation<select v-model="configuration.demandPlanningGeneralParameters.materialAggregationType" :disabled="simulating || saving"><option value="BOTTOM_UP">Bottom-Up</option><option value="TOP_DOWN">Top-Down</option></select></label>
          <label>Location aggregation<select v-model="configuration.demandPlanningGeneralParameters.locationAggregationType" :disabled="simulating || saving"><option value="BOTTOM_UP">Bottom-Up</option><option value="TOP_DOWN">Top-Down</option></select></label>
        </div>
        <div class="checkbox-grid">
          <label><input v-model="configuration.demandPlanningGeneralParameters.executeDemandPlan" :disabled="simulating || saving" type="checkbox"> Execute Demand Plan for this scope</label>
          <label><input v-model="configuration.demandPlanningGeneralParameters.roundToSalesUnit" :disabled="simulating || saving" type="checkbox"> Round to sales unit</label>
          <label><input v-model="configuration.demandPlanningGeneralParameters.considerHistoricalSalesOfInactiveDfus" :disabled="simulating || saving" type="checkbox"> Consider inactive DFU historical sales</label>
          <label><input v-model="configuration.demandPlanningGeneralParameters.generateForecastForDiscontinuedMaterials" :disabled="simulating || saving" type="checkbox"> Generate forecast for discontinued materials</label>
        </div>
      </OfxSectionCard>

      <OfxSectionCard class="parameters-card" aria-labelledby="demand-analysis-forecast-title">
        <div class="section-header"><div><p class="eyebrow">Community statistical forecast</p><h2 id="demand-analysis-forecast-title">Forecast parameters</h2></div><span>Split model: Historical Sales</span></div>
        <div class="parameter-grid">
          <label>Statistical model<select v-model="configuration.demandPlanningForecastParameters.statisticalModel" :disabled="simulating || saving"><option value="MM">Moving Average</option><option value="RMM">Rolling Moving Average</option><option value="ARIMA">ARIMA</option><option value="HOLT_WINTERS">Holt-Winters</option><option value="ES">Exponential Smoothing</option></select></label>
          <label>Moving Average window days<input v-model.number="configuration.demandPlanningForecastParameters.daysMovingAverageModel" :disabled="simulating || saving" type="number" min="1" step="1"></label>
          <label>Historical Sales split window days<input v-model.number="configuration.demandPlanningForecastParameters.daysTopDownSplit" :disabled="simulating || saving" type="number" min="1" step="1"></label>
          <label>Alpha<input v-model.number="configuration.demandPlanningForecastParameters.alpha" :disabled="simulating || saving" type="number" step="any"></label>
          <label>Beta<input v-model.number="configuration.demandPlanningForecastParameters.beta" :disabled="simulating || saving" type="number" step="any"></label>
          <label>Gamma<input v-model.number="configuration.demandPlanningForecastParameters.gamma" :disabled="simulating || saving" type="number" step="any"></label>
        </div>
        <p v-if="!hasValidConfiguration" class="error">UOM is required. Day windows, when provided, must be positive integers; Alpha, Beta and Gamma must be finite numbers.</p>
        <div class="actions">
          <label>Simulation reference date<input v-model="referenceDate" :disabled="simulating || saving" type="date"></label>
          <button class="secondary-button" type="button" :disabled="!canSave" @click="requestSave">Save configuration</button>
          <button class="primary-button" type="button" :disabled="!canSimulate" @click="simulateForecast">{{ simulating ? 'Simulating forecast…' : 'Simulate forecast' }}</button>
        </div>
        <p class="muted">Simulation does not create a Demand Plan. Auto-fit, support series, Enterprise regressors, uplift, Data transfer and downloads are outside this Community screen.</p>
      </OfxSectionCard>
    </template>

    <template v-if="simulation">
      <OfxSectionCard class="simulation-summary" aria-labelledby="demand-analysis-simulation-title">
        <h2 id="demand-analysis-simulation-title">Cluster simulation result</h2>
        <dl>
          <div><dt>Periods</dt><dd>{{ simulation.periodos.length }}</dd></div>
          <div><dt>Forecast starts</dt><dd>{{ simulation.periodoInicioForecast }}</dd></div>
          <div><dt>Last historical sale</dt><dd>{{ simulation.periodoUltimaVenda }}</dd></div>
          <div><dt>Returned material/location series</dt><dd>{{ simulation.materialLocationData.length }}</dd></div>
        </dl>
        <label class="series-selector">
          Render one material/location series
          <select v-model="selectedSeriesKey">
            <option value="">Select a returned material/location series</option>
            <option v-for="line in simulation.materialLocationData" :key="seriesKey(line)" :value="seriesKey(line)">{{ seriesLabel(line) }}</option>
          </select>
        </label>
        <p class="muted">The browser retains the cluster response and renders only the series selected here. It does not issue a per-DFU request or aggregate the remaining series.</p>
      </OfxSectionCard>

      <OfxSectionCard v-if="selectedSeries" class="simulation-series" aria-labelledby="demand-analysis-series-title">
        <h2 id="demand-analysis-series-title">{{ seriesLabel(selectedSeries) }}</h2>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Period</th><th>Historical sales</th><th>Baseline forecast</th><th>Residual</th><th>Absolute residual</th><th>After stockout treatment</th><th>After outlier treatment</th><th>Trend</th><th>Seasonal</th><th>Lower bound</th><th>Upper bound</th></tr></thead>
            <tbody>
              <tr v-for="(period, index) in simulation.periodos" :key="`${selectedSeriesKey}-${period}-${index}`">
                <td>{{ period }}</td><td>{{ formatRawValue(selectedSeries.historicalSales[index]) }}</td><td>{{ formatRawValue(selectedSeries.baselineForecast[index]) }}</td><td>{{ formatRawValue(selectedSeries.residual[index]) }}</td><td>{{ formatRawValue(selectedSeries.absoluteResidual[index]) }}</td><td>{{ formatRawValue(selectedSeries.historicalSalesAfterStockoutTreatment[index]) }}</td><td>{{ formatRawValue(selectedSeries.historicalSalesAfterOutlierTreatment[index]) }}</td><td>{{ formatRawValue(selectedSeries.trend?.[index]) }}</td><td>{{ formatRawValue(selectedSeries.seasonal?.[index]) }}</td><td>{{ formatRawValue(selectedSeries.lowerBound?.[index]) }}</td><td>{{ formatRawValue(selectedSeries.upperBound?.[index]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </OfxSectionCard>
      <OfxSectionCard v-else class="empty-state">Choose one material/location series to render its raw period values.</OfxSectionCard>
    </template>

    <OfxSectionCard v-if="saveConfirmationOpen" class="confirmation" role="dialog" aria-modal="true" aria-labelledby="demand-analysis-save-title">
      <h2 id="demand-analysis-save-title">Save this Community forecast configuration?</h2>
      <p>The selected profile and material/location cluster configuration will be persisted. This does not create or overwrite a Demand Plan.</p>
      <div class="actions"><button class="secondary-button" type="button" :disabled="saving" @click="saveConfirmationOpen = false">Cancel</button><button class="primary-button" type="button" :disabled="saving" @click="confirmSave">{{ saving ? 'Saving configuration…' : 'Save configuration' }}</button></div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.scope-card, .parameters-card, .simulation-summary, .simulation-series { display: grid; gap: 1.1rem; margin-bottom: 1rem; }.scope-card h2, .parameters-card h2, .simulation-summary h2, .simulation-series h2 { margin: 0; }.scope-fields, .parameter-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }.scope-fields label, .parameter-grid label, .series-selector, .actions label { display: grid; gap: .4rem; font-size: .875rem; font-weight: 700; }.scope-fields select, .parameter-grid input, .parameter-grid select, .series-selector select, .actions input { min-height: 2.5rem; border: 1px solid #c8d0de; border-radius: .5rem; background: #fff; padding: .55rem; }.checkbox-grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }.checkbox-grid label { display: flex; align-items: center; gap: .5rem; font-size: .875rem; }.section-header, .actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }.section-header p, .section-header h2 { margin: 0; }.section-header span { color: var(--ofx-muted); font-size: .82rem; }.actions { margin-top: .35rem; }.secondary-button, .primary-button { border: 1px solid #c8d0de; border-radius: .5rem; background: white; cursor: pointer; padding: .7rem 1rem; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.secondary-button:disabled, .primary-button:disabled { cursor: not-allowed; opacity: .55; }dl { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); margin: 0; }dl div { border-left: 3px solid #e7e2ff; padding-left: .75rem; }dt { color: var(--ofx-muted); font-size: .78rem; }dd { margin: .2rem 0 0; font-weight: 700; overflow-wrap: anywhere; }.table-scroll { overflow: auto; }table { min-width: 115rem; width: 100%; border-collapse: collapse; font-size: .82rem; }th, td { border-bottom: 1px solid #e8edf5; padding: .7rem; text-align: right; vertical-align: top; white-space: nowrap; }th:first-child, td:first-child { text-align: left; }th { color: var(--ofx-muted); font-size: .72rem; text-transform: uppercase; }.muted, .empty-state { color: var(--ofx-muted); }.empty-state { margin-bottom: 1rem; }.error { color: #b42318; }.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; padding: .8rem 1rem; }.confirmation { max-width: 42rem; }.confirmation h2 { margin-top: 0; }@media (max-width: 48rem) { .actions { align-items: flex-start; flex-direction: column; } }
</style>
