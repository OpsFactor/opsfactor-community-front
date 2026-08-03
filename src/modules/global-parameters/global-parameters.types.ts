/** Exact read model published by the Community Global Parameters endpoint. */
export interface CommunityGlobalParametersSnapshot {
  id: number | null;
  timeZone: string | null;
  modeloCadastroProdutoLocation: string | null;
  tipoDocumentoVenda: string | null;
  demandPlanningHistoricalDisplayPeriods: number | null;
  horizonteForecastDias: number | null;
  modeloDemandaBase: string | null;
  diasHistoricosDoh: number | null;
  diasHistoricosDohStockout: number | null;
  modeloNormalizacao: string | null;
  diasHistoricosNormalizacao: number | null;
  percentilOutliersVenda: number | null;
  diasHistoricosForecastEstatistico: number | null;
  dpArredondaParaUnidadeVenda: boolean | null;
  demandPlanningGenerateForecastForDiscontinuedMaterials: boolean | null;
  permiteAjusteAgregadoSemBaselineProduto: boolean | null;
  permiteAjusteAgregadoSemBaselineLocation: boolean | null;
  diasHorizonteCongelado: number | null;
  unidadeMedidaPadraoDP: string | null;
  safetyStockConsiderIndirectDemand: boolean | null;
  remessasConsomemDisponibilidadeNoPrimeiroPeriodo: boolean | null;
  unidadeMedidaPadraoSNP: string | null;
  unidadeMedidaPadraoCapacidadeLogisticaPeso: string | null;
  unidadeMedidaPadraoCapacidadeLogisticaVolume: string | null;
  exibeLocationsClienteFinalLowLevelCode: boolean | null;
  diasHistoricosCurva: number | null;
  numeroDiasMaterialNovo: number | null;
  quantidadesEmPedidosRepresentamSaldoRestante: boolean | null;
}

/** Only the operational Global Parameters accepted by the Community policy. */
export interface CommunityGlobalParametersDraft {
  id: number | null;
  timeZone: string;
  modeloCadastroProdutoLocation: 'ATIVO_SE_AUSENTE' | 'INATIVO_SE_AUSENTE';
  demandPlanningHistoricalDisplayPeriods: string;
  horizonteForecastDias: string;
  diasHistoricosForecastEstatistico: string;
  dpArredondaParaUnidadeVenda: boolean | null;
  demandPlanningGenerateForecastForDiscontinuedMaterials: boolean | null;
  diasHorizonteCongelado: string;
  unidadeMedidaPadraoDP: string;
  unidadeMedidaPadraoSNP: string;
  safetyStockConsiderIndirectDemand: boolean | null;
  exibeLocationsClienteFinalLowLevelCode: boolean | null;
}

/** Minimal POST body: Enterprise and transitional fields are deliberately absent. */
export interface CommunityGlobalParametersSaveRequest {
  id: number | null;
  timeZone: string | null;
  modeloCadastroProdutoLocation: 'ATIVO_SE_AUSENTE' | 'INATIVO_SE_AUSENTE';
  /** Community always uses sell-out; this is fixed rather than editable. */
  tipoDocumentoVenda: 'SELLOUT';
  demandPlanningHistoricalDisplayPeriods: number | null;
  horizonteForecastDias: number | null;
  diasHistoricosForecastEstatistico: number | null;
  dpArredondaParaUnidadeVenda: boolean | null;
  demandPlanningGenerateForecastForDiscontinuedMaterials: boolean | null;
  diasHorizonteCongelado: number | null;
  unidadeMedidaPadraoDP: string | null;
  unidadeMedidaPadraoSNP: string | null;
  safetyStockConsiderIndirectDemand: boolean | null;
  exibeLocationsClienteFinalLowLevelCode: boolean | null;
}

/** Creates an isolated draft from the authoritative server snapshot. */
export function buildCommunityGlobalParametersDraft(
  snapshot: CommunityGlobalParametersSnapshot,
): CommunityGlobalParametersDraft {

  return {
    id: snapshot.id,
    timeZone: snapshot.timeZone ?? '',
    modeloCadastroProdutoLocation: snapshot.modeloCadastroProdutoLocation === 'INATIVO_SE_AUSENTE'
      ? 'INATIVO_SE_AUSENTE'
      : 'ATIVO_SE_AUSENTE',
    demandPlanningHistoricalDisplayPeriods: formatNumber(snapshot.demandPlanningHistoricalDisplayPeriods),
    horizonteForecastDias: formatNumber(snapshot.horizonteForecastDias),
    diasHistoricosForecastEstatistico: formatNumber(snapshot.diasHistoricosForecastEstatistico),
    dpArredondaParaUnidadeVenda: snapshot.dpArredondaParaUnidadeVenda,
    demandPlanningGenerateForecastForDiscontinuedMaterials:
      snapshot.demandPlanningGenerateForecastForDiscontinuedMaterials,
    diasHorizonteCongelado: formatNumber(snapshot.diasHorizonteCongelado),
    unidadeMedidaPadraoDP: snapshot.unidadeMedidaPadraoDP ?? '',
    unidadeMedidaPadraoSNP: snapshot.unidadeMedidaPadraoSNP ?? '',
    safetyStockConsiderIndirectDemand: snapshot.safetyStockConsiderIndirectDemand,
    exibeLocationsClienteFinalLowLevelCode: snapshot.exibeLocationsClienteFinalLowLevelCode,
  };

}

/** Validates and serializes exactly the editable Community fields. */
export function buildCommunityGlobalParametersSaveRequest(
  draft: CommunityGlobalParametersDraft,
): CommunityGlobalParametersSaveRequest {

  return {
    id: draft.id,
    timeZone: toOptionalText(draft.timeZone),
    modeloCadastroProdutoLocation: draft.modeloCadastroProdutoLocation,
    tipoDocumentoVenda: 'SELLOUT',
    demandPlanningHistoricalDisplayPeriods: parseOptionalPositiveInteger(
      draft.demandPlanningHistoricalDisplayPeriods,
      'Demand Planning historical display periods',
    ),
    horizonteForecastDias: parseOptionalPositiveInteger(draft.horizonteForecastDias, 'Forecast horizon'),
    diasHistoricosForecastEstatistico: parseOptionalPositiveInteger(
      draft.diasHistoricosForecastEstatistico,
      'Statistical forecast history',
    ),
    dpArredondaParaUnidadeVenda: draft.dpArredondaParaUnidadeVenda,
    demandPlanningGenerateForecastForDiscontinuedMaterials:
      draft.demandPlanningGenerateForecastForDiscontinuedMaterials,
    diasHorizonteCongelado: parseOptionalNonNegativeInteger(
      draft.diasHorizonteCongelado,
      'Frozen horizon',
    ),
    unidadeMedidaPadraoDP: toOptionalText(draft.unidadeMedidaPadraoDP),
    unidadeMedidaPadraoSNP: toOptionalText(draft.unidadeMedidaPadraoSNP),
    safetyStockConsiderIndirectDemand: draft.safetyStockConsiderIndirectDemand,
    exibeLocationsClienteFinalLowLevelCode: draft.exibeLocationsClienteFinalLowLevelCode,
  };

}

function formatNumber(value: number | null): string {

  return value === null ? '' : String(value);

}

function toOptionalText(value: string): string | null {

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;

}

function parseOptionalPositiveInteger(value: string, fieldName: string): number | null {

  return parseOptionalInteger(value, fieldName, true);

}

function parseOptionalNonNegativeInteger(value: string, fieldName: string): number | null {

  return parseOptionalInteger(value, fieldName, false);

}

function parseOptionalInteger(value: string, fieldName: string, requirePositive: boolean): number | null {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || (requirePositive ? parsedValue <= 0 : parsedValue < 0)) {
    throw new Error(`${fieldName} must be ${requirePositive ? 'a positive integer' : 'a non-negative integer'} when informed.`);
  }

  return parsedValue;

}
