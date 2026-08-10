import { httpRequest } from '@/services/api/http';
import { requestJson } from '@/services/api/request';

export interface DemandExecutionProfileOption {
  id: string;
  description?: string | null;
  bucketSize?: string | null;
  defaultDemandPlanningUomId?: string | null;
  defaultAutoTunedDemandPlanConfigurationId?: number | null;
  [key: string]: unknown;
}

export interface DemandLocationClusterOption {
  id: number;
  description?: string | null;
  locations?: Array<{
    id: string;
    description?: string | null;
  }>;
  [key: string]: unknown;
}

export interface DemandProductClusterOption {
  id?: number | null;
  description?: string | null;
  process?: string | null;
  codigo?: string | number | null;
  descricao?: string | null;
  materials?: Array<{
    id: string;
    description?: string | null;
  }>;
  [key: string]: unknown;
}

export interface DemandBudgetVersionOption {
  budgetId: number;
  description?: string | null;
  bucketSize?: string | null;
  timeOfExecution?: string | null;
  generatedBy?: string | null;
  [key: string]: unknown;
}

export interface DemandTimeSeriesOption {
  id: string;
  description?: string | null;
  bucketSize?: string | null;
  [key: string]: unknown;
}

export interface DemandPlanningGeneralParameters {
  executeDemandPlan?: boolean | null;
  useExecutionProfileAutofitModel?: boolean | null;
  uomId?: string | null;
  roundToSalesUnit?: boolean | null;
  considerHistoricalSalesOfInactiveDfus?: boolean | null;
  generateForecastForDiscontinuedMaterials?: boolean | null;
  generateForecastForDiscontinuedProducts?: boolean | null;
  materialAggregationType?: string | null;
  locationAggregationType?: string | null;
  productAggregationLevel?: string | null;
  locationAggregationLevel?: string | null;
  budgetId?: number | null;
  daysAsNewProduct?: number | null;
  daysSalesHistory?: number | null;
  pricingDaysSalesHistory?: number | null;
  regressionTimeSeries?: DemandTimeSeriesOption[];
  generatePricingModel?: boolean | null;
  allowsPositiveElasticity?: boolean | null;
  minimumPercentualErrorReduction?: number | null;
  errorMetricRegressionTreeSplit?: string | null;
  errorMetricRegressionTreePruningCrossValidation?: string | null;
  pricingModelBucketSize?: string | null;
  considerTargetTrendGrowthYoy?: boolean | null;
  numberOfDaysCurrentLevelAsAverageOfHistoricalStl?: number | null;
  targetGrowthYoy?: number | null;
  includeWorkingDaysRegressor?: boolean | null;
  [key: string]: unknown;
}

export interface DemandPlanningForecastParameters {
  statisticalModel?: string | null;
  daysMovingAverageModel?: number | null;
  considerStockoutData?: string | null;
  daysSmoothingModel?: number | null;
  enableUpperPercentileSmoothing?: boolean | null;
  smoothingUpperPercentile?: number | null;
  enableLowerPercentileSmoothing?: boolean | null;
  smoothingLowerPercentile?: number | null;
  smoothingModel?: string | null;
  upliftModel?: string | null;
  splitModel?: string | null;
  daysTopDownSplit?: number | null;
  alpha?: number | null;
  beta?: number | null;
  gamma?: number | null;
  prophetAutoSeasonalityPriorScale?: boolean | null;
  prophetSeasonalityPriorScale?: number | null;
  prophetAutoChangepointPriorScale?: boolean | null;
  prophetChangepointPriorScale?: number | null;
  prophetAutoYearlyFourierOrder?: boolean | null;
  prophetYearlyFourierOrder?: number | null;
  chronosForceAggregatedForecast?: boolean | null;
  [key: string]: unknown;
}

export interface DemandClusterLevelConfiguration {
  demandPlanExecutionProfileId?: string | null;
  materialClusterId?: number | null;
  locationClusterId?: number | null;
  demandPlanningGeneralParameters: DemandPlanningGeneralParameters;
  demandPlanningForecastParameters: DemandPlanningForecastParameters;
  [key: string]: unknown;
}

export interface DemandSimulationSeriesRow {
  historicalSales?: number[];
  residual?: number[];
  absoluteResidual?: number[];
  baselineForecast?: number[];
  baselineAndUpliftForecast?: number[];
  cleansedHistoricalSales?: number[];
  stlTrend?: number[];
  trend?: number[];
  seasonal?: number[];
  lowerBound?: number[];
  upperBound?: number[];
}

export interface SimulatedDemandPlanMaterialLocationDto extends DemandSimulationSeriesRow {
  locationId?: string;
  materialId?: string;
  productId?: string;
}

export interface SimulatedDemandPlanAggregatedDto extends DemandSimulationSeriesRow {
  locationDimension?: string;
  materialDimension?: string;
}

export interface SimulatedDemandPlanResponse {
  periodos: string[];
  agrupadoresPeriodoDesagregado?: number[];
  agrupadoresPeriodoAgregado?: number[];
  periodoInicioForecast?: string | null;
  posicaoPeriodoInicioForecast?: number | null;
  periodoUltimaVenda?: string | null;
  posicaoPeriodoUltimaVenda?: number | null;
  clusterProdutosDTO?: DemandProductClusterOption | null;
  materialClusterDTO?: DemandProductClusterOption | null;
  clusterLocationsDTO?: DemandLocationClusterOption | null;
  materialLocationData?: SimulatedDemandPlanMaterialLocationDto[];
  aggregatedDataAtMapeLevel?: SimulatedDemandPlanAggregatedDto[];
  [key: string]: unknown;
}

export function fetchDemandExecutionProfiles() {
  return requestJson<DemandExecutionProfileOption[]>('/api/secured/demandplanexecutionprofile');
}

export function fetchDemandLocationClusters() {
  return requestJson<DemandLocationClusterOption[]>('/api/secured/location/cluster');
}

export async function fetchDemandProductClusters() {
  const materialClusters = await requestJson<DemandProductClusterOption[]>('/api/secured/material/cluster');
  const demandPlanningClusters = materialClusters
    .filter((cluster) => {
      if (cluster.process?.toUpperCase() === 'DP') return true;
      if (cluster.process?.toUpperCase() === 'PRICING') return false;
      return true;
    });

  return demandPlanningClusters;
}

export function fetchDemandBudgetVersions() {
  return requestJson<DemandBudgetVersionOption[]>('/api/secured/planning/budget/versions');
}

export function fetchDemandTimeSeries() {
  return requestJson<DemandTimeSeriesOption[]>('/api/secured/planning/demand/timeseries');
}

export function fetchUomIds() {
  return requestJson<string[]>('/api/secured/unitofmeasure/findids');
}

export function fetchClusterLevelConfiguration(executionProfileId: string, locationClusterId: string, productClusterId: string) {
  return requestJson<DemandClusterLevelConfiguration>(`/api/secured/demandPlanConfiguration/get/${executionProfileId}/${locationClusterId}/${productClusterId}`);
}

export async function saveClusterLevelConfiguration(configuration: DemandClusterLevelConfiguration) {
  const response = await httpRequest('/api/secured/demandPlanConfiguration/save', {
    method: 'POST',
    body: JSON.stringify(configuration),
  });

  if (!response.ok) {
    throw new Error('Unable to save cluster-level configuration');
  }
}

export function simulateClusterLevelConfiguration(configuration: DemandClusterLevelConfiguration, referenceDate: string) {
  return requestJson<SimulatedDemandPlanResponse>('/api/secured/demandPlanConfiguration/simulate', {
    method: 'POST',
    body: JSON.stringify({
      demandPlanningConfiguration: configuration,
      referenceDate,
    }),
  });
}
