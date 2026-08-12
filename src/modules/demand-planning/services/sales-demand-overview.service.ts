import { requestJson } from '@/services/api/request';
import type { MaterialLocationScope } from '@/features/material-location-scope/material-location-scope.types';

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

export interface DemandPlanSalesHistorySelectionPayload extends MaterialLocationScope {
  demandPlanId: string | number | null;
  historicalSalesDocumentType: 'Sell-out' | null;
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
  valuesByMaterialCharacteristicId?: Record<string, string>;
  valuesByLocationCharacteristicId?: Record<string, string>;
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
    data: Array<{
      locationId: string;
      materialId: string;
      valuesByMaterialCharacteristicId?: Record<string, string>;
      valuesByLocationCharacteristicId?: Record<string, string>;
      referenceDate: string;
      historicalSales: number;
      unconstrainedPlan: number;
    }>;
  }>('/api/secured/planning/demand/overview', {
    method: 'POST',
    body: JSON.stringify({
      demandPlanId: payload.demandPlanId ? Number(payload.demandPlanId) : null,
      historicalSalesDocumentType: payload.historicalSalesDocumentType,
      unitOfMeasureId: payload.unitOfMeasureId,
      historicalPeriods: payload.historicalPeriods,
      materialIds: payload.materialIds,
      locationIds: payload.locationIds,
      valuesByMaterialCharacteristicId: payload.valuesByMaterialCharacteristicId,
      valuesByLocationCharacteristicId: payload.valuesByLocationCharacteristicId,
    }),
  });

  return {
    periods: response.periods,
    data: response.data.flatMap((period) => {
      const salesRow = {
        series: 'Sales',
        date: period.referenceDate,
        quantity: period.historicalSales,
        locationId: period.locationId,
        materialId: period.materialId,
        valuesByMaterialCharacteristicId: period.valuesByMaterialCharacteristicId ?? {},
        valuesByLocationCharacteristicId: period.valuesByLocationCharacteristicId ?? {},
      };

      if (!payload.demandPlanId) return [salesRow];

      return [
        salesRow,
        {
          series: 'Demand Plan',
          date: period.referenceDate,
          quantity: period.unconstrainedPlan,
          locationId: period.locationId,
          materialId: period.materialId,
          valuesByMaterialCharacteristicId: period.valuesByMaterialCharacteristicId ?? {},
          valuesByLocationCharacteristicId: period.valuesByLocationCharacteristicId ?? {},
        },
      ];
    }),
  } satisfies DemandPlanSalesHistoryResponse;
}
