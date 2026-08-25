import { httpRequest } from '@/services/api/http';
import { requestJson } from '@/services/api/request';

interface DemandPlanOptionDto {
  demandPlanId?: number | string;
  description?: string | null;
  executionProfileId?: string | null;
  bucketSize?: string | null;
  beginsOn?: string | null;
}

interface SupplyExecutionProfile {
  id: string;
  description?: string | null;
  bucketSize?: string | null;
  executionModel?: string | null;
}

interface SupplyNetworkVersionOption {
  id: string;
  description?: string | null;
}

interface GeographicDivisionDto {
  id: string;
  description?: string | null;
  geographicHierarchyId?: string | null;
  geographicDivisionId?: string | null;
  geographicDivisionDescription?: string | null;
}

interface SupplyPlanOptionDto {
  supplyPlanId?: number | string;
  bucketSize?: string | null;
  beginsOn?: string | null;
  description?: string | null;
  demandPlanDTO?: {
    demandPlanId?: number | string;
  } | null;
}

interface PricingPlanVersionDto {
  pricingPlanId?: number | string;
  tamanhoBucket?: string | null;
  periodoReferencia?: string | null;
  descricao?: string | null;
}

interface PricingPlanVersionsResponse {
  listaPricingPlanDTO?: PricingPlanVersionDto[];
}

interface DemandExecutionProfileDto {
  id: string;
  description?: string | null;
  bucketSize?: string | null;
}

interface PresetConstraintGroupDto {
  id: string;
  description?: string | null;
}

interface NamedOptionDto {
  id: string;
  description?: string | null;
}

interface InventoryOptimizationModelDto {
  id: string;
  description?: string | null;
  releasedDemandId?: string | number | null;
}

/** Resultado explícito de um disparo que pode concluir na request ou seguir em background. */
export type ProcessExecutionOutcome = 'COMPLETED' | 'ACCEPTED_FOR_BACKGROUND_PROCESSING';

/** Resposta da API preservando a mensagem humana e a semântica operacional da task. */
export interface ProcessExecutionResult {
  message: string;
  processExecutionOutcome?: ProcessExecutionOutcome;
}

export interface ProcessExecutionCatalog {
  demandPlans: DemandPlanOptionDto[];
  supplyPlans: SupplyPlanOptionDto[];
  pricingPlans: PricingPlanVersionDto[];
  supplyNetworks: SupplyNetworkVersionOption[];
  demandExecutionProfiles: DemandExecutionProfileDto[];
  supplyExecutionProfiles: SupplyExecutionProfile[];
  presetConstraintGroups: PresetConstraintGroupDto[];
  temporalSplitCurves: NamedOptionDto[];
  geographicDivisions: GeographicDivisionDto[];
  uomIds: string[];
  inventoryOptimizationModels: InventoryOptimizationModelDto[];
}

export interface ExecuteDemandPlanPayload {
  descricao: string;
  executionProfileId: string;
  periodoReferencia: string;
  demandPlanReferenciaCopiaDados?: string;
  copiaApenasNoHorizonteCongelado?: boolean;
}

export interface ExecuteDemandTrendPayload {
  referenceDemandPlanId: string;
  newDemandPlanDescription: string;
  newDemandPlanBucketSize: string;
  planStartDate: string;
  numberOfFuturePeriods: number;
  consolidateEndClientDemandInInternalLocations: boolean;
  supplyNetworkVersionForDemandConsolidation?: string;
  calculateTrendForPeriodsWithSelloutData: boolean;
  temporalSplitCurveIdSet: string[];
}

export interface ExecuteDemandAutoFitPayload {
  description: string;
  executionProfileId: string;
}

export interface ExecuteSupplyPlanPayload {
  supplyPlanId?: string;
  executionProfileId?: string;
  demandPlanId?: string;
  supplyNetworkVersionId?: string;
  presetConstraintGroupId?: string | null;
  descricaoSupplyPlan?: string;
  tamanhoBucket?: string;
  periodoReferencia?: string;
  supplyPlanIdForStartingStockProjection?: string;
}

export interface ExecutePricingPlanPayload {
  pricingPlanId?: string;
  descricao?: string;
  tamanhoBucket?: string;
  periodoReferencia?: string;
}

export interface ExecuteInventoryPolicyOptimizationPayload {
  inventoryOptimizationModelId: string;
  executeInventoryPolicyOptimization: boolean;
  updateWithDemandVariation: boolean;
  removeExistingDemandVariationBeforeSaving: boolean;
  updateWithSupplyVariation: boolean;
  removeExistingSupplyVariationBeforeSaving: boolean;
  updateWithProfitAndLossUnitContributions: boolean;
  removeExistingProfitAndLossUnitContributionsBeforeSaving: boolean;
  bucketSize: string;
  simulationStartDate: string;
  numberOfSimulatedPeriods: number;
}

export interface ExecuteLogisticsCostCurvesPayload {
  supplyNetworkId?: string;
  description: string;
  freightCurveRegressionType: string;
  locationCostTimeBucket: string;
  targetUomId: string;
  startDate: string;
  endDate: string;
}

export interface ExecuteEmbeddingsPayload {
  bucketSize: string;
  numberOfPastSelloutPeriods: number;
}

export interface DeleteOrdersDataFilter {
  originLocationTypes?: string[];
  destinationLocationTypes?: string[];
  fullDeletionConfirmation?: string;
}

export interface DeleteOrdersPayload {
  description: string;
  dataFilter: DeleteOrdersDataFilter;
}

export interface ScheduleDeleteOrdersCronPayload extends DeleteOrdersPayload {
  cronExpression: string;
}

async function parseProcessExecutionResult(response: Response, path: string): Promise<ProcessExecutionResult> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = await response.clone().json() as {
        message?: string;
        processExecutionOutcome?: ProcessExecutionOutcome;
      } | string;
      if (typeof payload === 'string' && payload.trim()) {
        return { message: payload };
      }
      if (payload && typeof payload === 'object' && 'message' in payload && payload.message) {
        return {
          message: payload.message,
          processExecutionOutcome: payload.processExecutionOutcome,
        };
      }
    } catch {
      // Fall back to text parsing below.
    }
  }

  try {
    const text = await response.text();
    if (text.trim()) return { message: text };
  } catch {
    // Keep default fallback below.
  }

  return { message: `Request finished for ${path}` };
}

async function requestMessage(path: string, options: RequestInit = {}): Promise<ProcessExecutionResult> {
  const response = await httpRequest(path, options);
  const processExecutionResult = await parseProcessExecutionResult(response, path);

  if (!response.ok) {
    throw new Error(processExecutionResult.message);
  }

  return processExecutionResult;
}

export async function fetchProcessExecutionCatalog(): Promise<ProcessExecutionCatalog> {
  const [
    demandPlans,
    supplyPlans,
    supplyNetworks,
    demandExecutionProfiles,
    supplyExecutionProfiles,
  ] = await Promise.all([
    requestJson<DemandPlanOptionDto[]>('/api/secured/planning/demand/demandplan'),
    requestJson<SupplyPlanOptionDto[]>('/api/secured/planning/supply'),
    requestJson<SupplyNetworkVersionOption[]>('/api/secured/supplynetwork/version'),
    requestJson<DemandExecutionProfileDto[]>('/api/secured/demandplanexecutionprofile'),
    requestJson<SupplyExecutionProfile[]>('/api/secured/supplyplanexecutionprofile'),
  ]);

  return {
    demandPlans,
    supplyPlans,
    pricingPlans: [],
    supplyNetworks,
    demandExecutionProfiles,
    supplyExecutionProfiles,
    presetConstraintGroups: [],
    temporalSplitCurves: [],
    geographicDivisions: [],
    uomIds: [],
    inventoryOptimizationModels: [],
  };
}

export function executeDemandPlan(payload: ExecuteDemandPlanPayload) {
  return requestMessage('/api/secured/planning/demand/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function executeDemandTrend(payload: ExecuteDemandTrendPayload) {
  return requestMessage('/api/secured/planning/demand/trend/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function executeDemandPlanFromFile(form: FormData) {
  return requestMessage('/api/secured/planning/demand/generate/fromfile', {
    method: 'POST',
    body: form,
  });
}

export function updateDemandPlanPriceLists(demandPlanId: string) {
  return requestMessage(`/api/secured/planning/demand/${encodeURIComponent(demandPlanId)}/pricelists/update`, {
    method: 'POST',
  });
}

export function executeDemandAutoFit(payload: ExecuteDemandAutoFitPayload) {
  return requestMessage('/api/secured/demandplan/configuration/autofit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function executeSupplyPlan(payload: ExecuteSupplyPlanPayload) {
  return requestMessage('/api/secured/planning/supply/execute', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function executeConstrainedPlan(demandPlanId: string) {
  return requestMessage(`/api/secured/planning/constrained/execute/${encodeURIComponent(demandPlanId)}`);
}

export function executeObservedConstraintsExplanation(supplyPlanId: string) {
  return requestMessage(`/api/secured/planning/constrained/constraints/execute/${encodeURIComponent(supplyPlanId)}`);
}

export function executeProfitAndLoss(supplyPlanId: string) {
  return requestMessage(`/api/secured/planning/finance/execute/${encodeURIComponent(supplyPlanId)}`);
}

export function executePricingPlan(payload: ExecutePricingPlanPayload) {
  return requestMessage('/api/secured/pricing/pricingplan/execute', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function executeInventoryPolicyOptimization(payload: ExecuteInventoryPolicyOptimizationPayload) {
  return requestMessage('/api/secured/inventorypolicyoptimization/execute', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateLocationLatLon() {
  return requestMessage('/api/secured/geographic/latlon/update');
}

export function updateGeographicDivision(division: GeographicDivisionDto) {
  return requestMessage('/api/secured/geographic/region/update', {
    method: 'POST',
    body: JSON.stringify(division),
  });
}

export function updateTransportationRouting(network: SupplyNetworkVersionOption) {
  return requestMessage('/api/secured/geographic/routing/transportationlane/update', {
    method: 'POST',
    body: JSON.stringify(network),
  });
}

export function executeLogisticsCostCurves(payload: ExecuteLogisticsCostCurvesPayload) {
  return requestMessage('/api/secured/logistics/costcurves/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEmbeddings(payload: ExecuteEmbeddingsPayload) {
  return requestMessage('/api/secured/embedding/materiallocation/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteOrdersByFilter(payload: DeleteOrdersPayload) {
  return requestMessage('/api/secured/data/order/delete', {
    method: 'POST',
    body: JSON.stringify({
      dataFilter: payload.dataFilter,
      threadSync: 'sync',
    }),
  });
}

export function scheduleDeleteOrdersByFilterCron(payload: ScheduleDeleteOrdersCronPayload) {
  return requestMessage('/api/secured/scheduler/orders/delete/cron', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
