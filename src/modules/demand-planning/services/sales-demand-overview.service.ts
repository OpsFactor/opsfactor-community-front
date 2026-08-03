import { requestJson } from '@/services/api/request';

export interface DemandPlanVersionOptionDto {
  id: number;
  descricao: string;
  executionProfileId?: string;
  bucketSize?: string | null;
  horarioGeracao?: string;
  periodoReferencia?: string;
  planStartDate?: string;
  planEndDate?: string;
}

export interface DemandPlanSalesHistorySelectionPayload {
  demandPlanId: string | number;
  unitOfMeasureId: string;
  historicalPeriods: number;
}

export interface DemandPlanSalesHistoryDetailDto extends Record<string, unknown> {
  series?: string;
  date?: string;
  gross?: number;
  net?: number;
  cogs?: number;
  margin?: number;
  quantity?: number;
}

export interface DemandPlanSalesHistoryResponse {
  data: DemandPlanSalesHistoryDetailDto[];
  periods: string[];
}

export async function fetchDemandPlanVersions() {
  return requestJson<DemandPlanVersionOptionDto[]>('/api/secured/planning/demand/versions');
}

export async function fetchUomIds() {
  return requestJson<string[]>('/api/secured/unitofmeasure/findids');
}

export async function fetchDemandPlanAndSalesHistory(payload: DemandPlanSalesHistorySelectionPayload) {
  const response = await requestJson<{
    periods: string[];
    data: Array<{ locationId: string; materialId: string; referenceDate: string; historicalSales: number; unconstrainedPlan: number }>;
  }>('/api/secured/planning/demand/overview', {
    method: 'POST',
    body: JSON.stringify({
      demandPlanId: Number(payload.demandPlanId),
      unitOfMeasureId: payload.unitOfMeasureId,
      historicalPeriods: payload.historicalPeriods,
      materialIds: [],
      locationIds: [],
    }),
  });

  return {
    periods: response.periods,
    data: response.data.flatMap((period) => [
      { series: 'Sales', date: period.referenceDate, quantity: period.historicalSales, locationId: period.locationId, materialId: period.materialId },
      { series: 'Demand Plan', date: period.referenceDate, quantity: period.unconstrainedPlan, locationId: period.locationId, materialId: period.materialId },
    ]),
  } satisfies DemandPlanSalesHistoryResponse;
}
