/** Minimal Community execution-profile catalog shape used to select a forecast configuration. */
export interface DemandAnalysisExecutionProfile {
  id: string;
  description: string | null;
  bucketSize: string | null;
}

/** Minimal material-cluster catalog shape; the backend validates Demand Planning eligibility. */
export interface DemandAnalysisMaterialCluster {
  id: number;
  description: string | null;
  process: string | null;
}

/** Minimal location-cluster catalog shape. */
export interface DemandAnalysisLocationCluster {
  id: number;
  description: string | null;
}

/** Community-owned general parameters editable at material/location cluster level. */
export interface DemandAnalysisGeneralParameters {
  executeDemandPlan: boolean;
  uomId: string;
  roundToSalesUnit: boolean;
  considerHistoricalSalesOfInactiveDfus: boolean;
  generateForecastForDiscontinuedMaterials: boolean;
  materialAggregationType: 'BOTTOM_UP' | 'TOP_DOWN';
  locationAggregationType: 'BOTTOM_UP' | 'TOP_DOWN';
  daysSalesHistory: number | null;
}

/** Community statistical-model parameters, deliberately excluding Enterprise treatments and regressors. */
export interface DemandAnalysisForecastParameters {
  statisticalModel: 'MM' | 'RMM' | 'ARIMA' | 'HOLT_WINTERS' | 'ES';
  daysMovingAverageModel: number | null;
  splitModel: 'HISTORICAL_SALES';
  daysTopDownSplit: number | null;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

/** The complete Community configuration persisted for one profile/material/location cluster triple. */
export interface DemandAnalysisConfiguration {
  demandPlanExecutionProfileId: string;
  materialClusterId: number;
  locationClusterId: number;
  demandPlanningGeneralParameters: DemandAnalysisGeneralParameters;
  demandPlanningForecastParameters: DemandAnalysisForecastParameters;
}

/** One material/location simulation series returned from the already scoped cluster calculation. */
export interface SimulatedDemandPlanMaterialLocation {
  locationId: string;
  materialId: string;
  historicalSales: number[];
  residual: number[];
  absoluteResidual: number[];
  baselineForecast: number[];
  historicalSalesAfterStockoutTreatment: number[];
  historicalSalesAfterOutlierTreatment: number[];
  trend: number[] | null;
  seasonal: number[] | null;
  lowerBound: number[] | null;
  upperBound: number[] | null;
}

/** Server-owned result of one explicit Community forecast simulation. */
export interface DemandAnalysisSimulation {
  periodos: string[];
  periodoInicioForecast: string;
  posicaoPeriodoInicioForecast: number;
  periodoUltimaVenda: string;
  posicaoPeriodoUltimaVenda: number;
  materialLocationData: SimulatedDemandPlanMaterialLocation[];
}

export interface DemandAnalysisSimulationRequest {
  referenceDate: string;
  demandPlanningConfiguration: DemandAnalysisConfiguration;
}

/** Builds a clean Community payload and intentionally drops every transition/Enterprise-only DTO field. */
export function buildDemandAnalysisConfigurationPayload(
  configuration: DemandAnalysisConfiguration,
): DemandAnalysisConfiguration {

  return {
    demandPlanExecutionProfileId: configuration.demandPlanExecutionProfileId,
    materialClusterId: configuration.materialClusterId,
    locationClusterId: configuration.locationClusterId,
    demandPlanningGeneralParameters: {
      executeDemandPlan: configuration.demandPlanningGeneralParameters.executeDemandPlan,
      uomId: configuration.demandPlanningGeneralParameters.uomId.trim(),
      roundToSalesUnit: configuration.demandPlanningGeneralParameters.roundToSalesUnit,
      considerHistoricalSalesOfInactiveDfus: configuration.demandPlanningGeneralParameters.considerHistoricalSalesOfInactiveDfus,
      generateForecastForDiscontinuedMaterials: configuration.demandPlanningGeneralParameters.generateForecastForDiscontinuedMaterials,
      materialAggregationType: configuration.demandPlanningGeneralParameters.materialAggregationType,
      locationAggregationType: configuration.demandPlanningGeneralParameters.locationAggregationType,
      daysSalesHistory: configuration.demandPlanningGeneralParameters.daysSalesHistory,
    },
    demandPlanningForecastParameters: {
      statisticalModel: configuration.demandPlanningForecastParameters.statisticalModel,
      daysMovingAverageModel: configuration.demandPlanningForecastParameters.daysMovingAverageModel,
      splitModel: 'HISTORICAL_SALES',
      daysTopDownSplit: configuration.demandPlanningForecastParameters.daysTopDownSplit,
      alpha: configuration.demandPlanningForecastParameters.alpha,
      beta: configuration.demandPlanningForecastParameters.beta,
      gamma: configuration.demandPlanningForecastParameters.gamma,
    },
  };
}

/** Positive optional day windows remain server-defaulted when the user leaves them empty. */
export function isOptionalPositiveInteger(value: number | null): boolean {

  return value === null || (Number.isInteger(value) && value > 0);
}
