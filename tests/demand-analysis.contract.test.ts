import assert from 'node:assert/strict';
import test from 'node:test';
import { DemandAnalysisService } from '../src/modules/demand-analysis/demand-analysis.service.ts';
import { buildDemandAnalysisConfigurationPayload } from '../src/modules/demand-analysis/demand-analysis.types.ts';

const configuration = {
  demandPlanExecutionProfileId: 'DP-1',
  materialClusterId: 11,
  locationClusterId: 12,
  demandPlanningGeneralParameters: {
    executeDemandPlan: true,
    uomId: ' EA ',
    roundToSalesUnit: false,
    considerHistoricalSalesOfInactiveDfus: false,
    generateForecastForDiscontinuedMaterials: false,
    materialAggregationType: 'TOP_DOWN' as const,
    locationAggregationType: 'BOTTOM_UP' as const,
    daysSalesHistory: 90,
  },
  demandPlanningForecastParameters: {
    statisticalModel: 'ARIMA' as const,
    daysMovingAverageModel: 120,
    splitModel: 'HISTORICAL_SALES' as const,
    daysTopDownSplit: 120,
    alpha: null,
    beta: null,
    gamma: null,
  },
};

test('Demand Analysis uses only canonical Community selectors, configuration, simulation and save endpoints', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve([]);
    },
  };
  const service = new DemandAnalysisService(httpClient as never);

  await service.getExecutionProfiles();
  await service.getMaterialClusters();
  await service.getLocationClusters();
  await service.getConfiguration('DP-1', 12, 11);
  await service.simulate({ referenceDate: '2026-07-21', demandPlanningConfiguration: configuration });
  await service.save(configuration);

  assert.deepEqual(calls, [
    { path: '/api/secured/demandplanexecutionprofile', options: undefined },
    { path: '/api/secured/materialclustering', options: undefined },
    { path: '/api/secured/locationclustering', options: undefined },
    { path: '/api/secured/demandPlanConfiguration/get/DP-1/12/11', options: undefined },
    { path: '/api/secured/demandPlanConfiguration/simulate', options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referenceDate: '2026-07-21', demandPlanningConfiguration: configuration }) } },
    { path: '/api/secured/demandPlanConfiguration/save', options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(configuration) } },
  ]);
});

test('Demand Analysis payload retains only Community parameters and forces the supported Historical Sales split', () => {
  const payload = buildDemandAnalysisConfigurationPayload(configuration);

  assert.deepEqual(payload, {
    ...configuration,
    demandPlanningGeneralParameters: { ...configuration.demandPlanningGeneralParameters, uomId: 'EA' },
    demandPlanningForecastParameters: { ...configuration.demandPlanningForecastParameters, splitModel: 'HISTORICAL_SALES' },
  });
  assert.deepEqual(Object.keys(payload.demandPlanningGeneralParameters).sort(), [
    'considerHistoricalSalesOfInactiveDfus',
    'daysSalesHistory',
    'executeDemandPlan',
    'generateForecastForDiscontinuedMaterials',
    'locationAggregationType',
    'materialAggregationType',
    'roundToSalesUnit',
    'uomId',
  ]);
  assert.deepEqual(Object.keys(payload.demandPlanningForecastParameters).sort(), [
    'alpha', 'beta', 'daysMovingAverageModel', 'daysTopDownSplit', 'gamma', 'splitModel', 'statisticalModel',
  ]);
});
