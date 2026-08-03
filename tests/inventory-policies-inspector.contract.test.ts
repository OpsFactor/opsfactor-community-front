import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildCommunityInventoryPolicyDraft,
  buildCommunityInventoryPolicySaveRequest,
  buildInventoryPolicyDetailEndpoint,
} from '../src/modules/inventory-policies/inventory-policies.types.ts';

test('Inventory Policy editor builds the complete Community replacement snapshot without Enterprise frequency', () => {
  const draft = buildCommunityInventoryPolicyDraft({
    id: 'POLICY-01',
    prioridade: 5,
    dataHorarioInicio: '2026-07-01T00:00:00',
    dataHorarioFim: null,
    materialLocationList: [{
      materialId: 'MAT-01',
      locationId: 'LOC-01',
      modeloReabastecimento: 'DRP',
      modeloOperacional: 'PUSH',
      calculoSafetyStock: 'DIAS',
      estoqueSegurancaDrpOuTargetKanban: 12.5,
      estoqueMaximoDrp: 50,
    }],
  });

  draft.prioridade = ' 7 ';
  draft.materialLocationList[0].estoqueMaximoDrp = ' 55 ';
  assert.deepEqual(buildCommunityInventoryPolicySaveRequest(draft), {
    id: 'POLICY-01',
    prioridade: 7,
    dataHorarioInicio: '2026-07-01T00:00:00',
    dataHorarioFim: null,
    materialLocationList: [{
      materialId: 'MAT-01',
      locationId: 'LOC-01',
      modeloReabastecimento: 'DRP',
      modeloOperacional: 'PUSH',
      calculoSafetyStock: 'DIAS',
      estoqueSegurancaDrpOuTargetKanban: 12.5,
      estoqueMaximoDrp: 55,
    }],
  });
});

test('Inventory Policy editor requires explicit material and Location identifiers for every replacement rule', () => {
  assert.throws(() => buildCommunityInventoryPolicySaveRequest({
    id: 'POLICY-01',
    prioridade: '',
    dataHorarioInicio: '',
    dataHorarioFim: '',
    materialLocationList: [{
      materialId: '   ',
      locationId: 'LOC-01',
      modeloReabastecimento: '',
      modeloOperacional: '',
      calculoSafetyStock: '',
      estoqueSegurancaDrpOuTargetKanban: '',
      estoqueMaximoDrp: '',
    }],
  }), /material id is required/i);
});

test('Inventory Policy editor uses one explicit detail GET and one complete-snapshot POST only', () => {
  const service = readFileSync(new URL('../src/modules/inventory-policies/inventory-policies.service.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/modules/inventory-policies/InventoryPoliciesInspectorPage.vue', import.meta.url), 'utf8');

  assert.equal(
    buildInventoryPolicyDetailEndpoint(' Policy / A '),
    '/api/secured/configs/inventorypolicy/Policy%20%2F%20A',
  );
  assert.match(service, /buildInventoryPolicyDetailEndpoint\(inventoryPolicyId\)/);
  assert.match(service, /httpClient\.request<CommunityInventoryPolicy>/);
  assert.match(service, /httpClient\.request<string>\('\/api\/secured\/configs\/inventorypolicy'/);
  assert.match(service, /method: 'POST'/);
  assert.match(service, /JSON\.stringify\(snapshot\)/);
  assert.match(page, /Replace all policy rules/);
  assert.match(page, /reloadCapturedInventoryPolicy/);
  assert.match(page, /pendingSaveSnapshot/);
  assert.doesNotMatch(page, /setInterval|setTimeout/);

  for (const forbiddenFragment of [
    'frequenciaReabastecimentoDias',
    'delete',
    '/data/',
    'optimizer',
    'simulation',
    'forecast',
  ]) {
    assert.equal(service.toLowerCase().includes(forbiddenFragment.toLowerCase()), false, `Policy transport must not expose ${forbiddenFragment}`);
  }
});

test('Inventory Policy editor requires a nonblank explicit ID', () => {
  assert.throws(
    () => buildInventoryPolicyDetailEndpoint('   '),
    /inventory policy ID is required/i,
  );
});
