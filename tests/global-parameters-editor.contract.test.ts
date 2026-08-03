import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCommunityGlobalParametersSaveRequest,
  type CommunityGlobalParametersDraft,
} from '../src/modules/global-parameters/global-parameters.types.ts';
import { GlobalParametersService } from '../src/modules/global-parameters/global-parameters.service.ts';

test('Global Parameters editor uses the canonical GET and JSON POST contract', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve({});
    },
  };
  const service = new GlobalParametersService(httpClient as never);
  const request = buildCommunityGlobalParametersSaveRequest(createDraft());

  await service.getSnapshot();
  await service.saveSnapshot(request);

  assert.deepEqual(calls, [
    { path: '/api/secured/configs/parameters', options: undefined },
    {
      path: '/api/secured/configs/parameters',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
    },
  ]);
});

test('Global Parameters editor posts only the bounded Community operational subset', () => {
  const request = buildCommunityGlobalParametersSaveRequest(createDraft());

  assert.deepEqual(request, {
    id: 7,
    timeZone: 'America/Sao_Paulo',
    modeloCadastroProdutoLocation: 'ATIVO_SE_AUSENTE',
    tipoDocumentoVenda: 'SELLOUT',
    demandPlanningHistoricalDisplayPeriods: 8,
    horizonteForecastDias: 91,
    diasHistoricosForecastEstatistico: 365,
    dpArredondaParaUnidadeVenda: true,
    demandPlanningGenerateForecastForDiscontinuedMaterials: false,
    diasHorizonteCongelado: 14,
    unidadeMedidaPadraoDP: 'EA',
    unidadeMedidaPadraoSNP: 'EA',
    safetyStockConsiderIndirectDemand: true,
    exibeLocationsClienteFinalLowLevelCode: false,
  });

  for (const enterpriseField of [
    'diasHistoricosDoh',
    'modeloNormalizacao',
    'percentilOutliersVenda',
    'permiteAjusteAgregadoSemBaselineProduto',
    'remessasConsomemDisponibilidadeNoPrimeiroPeriodo',
    'unidadeMedidaPadraoCapacidadeLogisticaPeso',
    'diasHistoricosCurva',
    'numeroDiasMaterialNovo',
    'quantidadesEmPedidosRepresentamSaldoRestante',
  ]) {
    assert.equal(enterpriseField in request, false, `POST must omit ${enterpriseField}`);
  }
});

test('Global Parameters editor rejects invalid operational integers before confirmation', () => {
  const draft = createDraft();
  draft.horizonteForecastDias = '0';

  assert.throws(() => buildCommunityGlobalParametersSaveRequest(draft), /Forecast horizon must be a positive integer/);
});

function createDraft(): CommunityGlobalParametersDraft {

  return {
    id: 7,
    timeZone: 'America/Sao_Paulo',
    modeloCadastroProdutoLocation: 'ATIVO_SE_AUSENTE',
    demandPlanningHistoricalDisplayPeriods: '8',
    horizonteForecastDias: '91',
    diasHistoricosForecastEstatistico: '365',
    dpArredondaParaUnidadeVenda: true,
    demandPlanningGenerateForecastForDiscontinuedMaterials: false,
    diasHorizonteCongelado: '14',
    unidadeMedidaPadraoDP: 'EA',
    unidadeMedidaPadraoSNP: 'EA',
    safetyStockConsiderIndirectDemand: true,
    exibeLocationsClienteFinalLowLevelCode: false,
  };

}
