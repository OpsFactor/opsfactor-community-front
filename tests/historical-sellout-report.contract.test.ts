import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  HistoricalSelloutReportService,
  historicalSelloutReportEndpoint,
} from '../src/modules/historical-sellout/historical-sellout.service.ts';
import {
  buildCommunityHistoricalSelloutReportRequest,
  parseExplicitIdentifiers,
} from '../src/modules/historical-sellout/historical-sellout.types.ts';

test('Historical sell-out report uses only the canonical POST with an explicit date interval', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const httpClient = {
    request(path: string, options?: RequestInit) {
      calls.push({ path, options });
      return Promise.resolve({ data: [] });
    },
  };
  const service = new HistoricalSelloutReportService(httpClient as never);
  const request = buildCommunityHistoricalSelloutReportRequest({
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    materialIds: [' MATERIAL-01 ', 'MATERIAL-01'],
    locationIds: ['LOCATION-01'],
  });

  await service.getReport(request);

  assert.equal(historicalSelloutReportEndpoint, '/api/secured/historical/sellout');
  assert.deepEqual(calls, [{
    path: '/api/secured/historical/sellout',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        materialLocationFilterDTO: { materialIds: ['MATERIAL-01'], locationIds: ['LOCATION-01'] },
      }),
    },
  }]);
});

test('Historical sell-out report normalizes identifiers and omits an empty optional scope', () => {
  assert.deepEqual(parseExplicitIdentifiers(' A;B\nA, C '), ['A', 'B', 'C']);
  assert.deepEqual(buildCommunityHistoricalSelloutReportRequest({
    startDate: '2026-07-01', endDate: '2026-07-31', materialIds: [], locationIds: [],
  }), { startDate: '2026-07-01', endDate: '2026-07-31' });
  assert.throws(() => buildCommunityHistoricalSelloutReportRequest({
    startDate: '2026-08-01', endDate: '2026-07-31', materialIds: [], locationIds: [],
  }), /before or equal/);
});

test('Historical sell-out page uses bounded master-data selectors and excludes characteristics, Data, conversions and aggregation', () => {
  const page = readFileSync(new URL('../src/modules/historical-sellout/HistoricalSelloutReportPage.vue', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/modules/historical-sellout/historical-sellout.service.ts', import.meta.url), 'utf8');

  assert.match(page, /Document ID<\/th><th>Reference date<\/th><th>Origin location<\/th><th>Material<\/th><th>Document UOM<\/th><th>Quantity/);
  assert.match(page, /loadCommunityMaterials/);
  assert.match(page, /loadCommunityLocations/);
  assert.match(page, /Characteristics, aggregation, demand-plan comparison, conversion, Data operations/);
  assert.match(service, /historicalSelloutReportEndpoint/);
  for (const forbiddenFragment of [
    'characteristic', 'unitofmeasure', '/api/secured/data/', 'GET', 'DELETE', 'PUT',
  ]) {
    assert.equal(service.includes(forbiddenFragment), false, `Historical sell-out transport must not use ${forbiddenFragment}`);
  }
});
