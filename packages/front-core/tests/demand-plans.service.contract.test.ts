import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemandPlansService, createSupplyPlansService } from '../src/planning/demand-plans.service.ts';

test('Community-owned Demand Plan transport keeps the two legacy endpoints and host-injected request policy', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const authenticatedRequest = async (path: string, options?: RequestInit) => {
    calls.push({ path, options });
    return new Response(JSON.stringify(path.endsWith('/demandplan') ? [{ demandPlanId: 17 }] : { message: 'submitted' }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  const service = createDemandPlansService<{ demandPlanId: number; description?: string }>(authenticatedRequest);

  assert.deepEqual(await service.fetchPlanHistory(), [{ demandPlanId: 17 }]);
  assert.equal(await service.deletePlans([{ demandPlanId: 17 }]), 'submitted');
  assert.deepEqual(calls.map((call) => call.path), [
    '/api/secured/planning/demand/demandplan',
    '/api/secured/planning/demand/delete',
  ]);
  assert.equal(calls[1].options?.method, 'POST');
  assert.equal(calls[1].options?.body, JSON.stringify([{ demandPlanId: 17 }]));
});

test('Community-owned Supply Plan transport shares the same host-injected history boundary', async () => {
  const calls: string[] = [];
  const service = createSupplyPlansService<{ supplyPlanId: number }>(async (path) => {
    calls.push(path);
    return new Response(JSON.stringify(path.endsWith('/supply') ? [{ supplyPlanId: 23 }] : { message: 'submitted' }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  assert.deepEqual(await service.fetchPlanHistory(), [{ supplyPlanId: 23 }]);
  assert.equal(await service.deletePlans([{ supplyPlanId: 23 }]), 'submitted');
  assert.deepEqual(calls, ['/api/secured/planning/supply', '/api/secured/planning/supply/delete']);
});
