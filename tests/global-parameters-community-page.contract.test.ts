import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const pagePath = new URL('../src/modules/configuration/GlobalParametersCommunityPage.vue', import.meta.url);

async function readPageSource(): Promise<string> {

  return readFile(pagePath, 'utf8');
}

test('Community Global Parameters preserves the legacy dashboard composition', async () => {

  const pageSource = await readPageSource();

  assert.match(pageSource, /DashboardPageLayout/);
  assert.match(pageSource, /title="General Parameters"/);
  assert.match(pageSource, /title="Transactional Data"/);
  assert.match(pageSource, /title="Demand Planning"/);
  assert.match(pageSource, /title="Supply Planning"/);
  assert.match(pageSource, /title="Clustering, Sales\/Outbound Curves, New Products"/);
});

test('Community Global Parameters marks unavailable controls instead of removing their visual place', async () => {

  const pageSource = await readPageSource();

  assert.match(pageSource, /Stockout Normalization Model/);
  assert.match(pageSource, /Fleet Capacity Weight Standard Unit/);
  assert.match(pageSource, /description="Enterprise" disabled/);
  assert.match(pageSource, /help-text="Enterprise" disabled/);
});

test('Community Global Parameters continues posting only its bounded controller payload', async () => {

  const pageSource = await readPageSource();

  assert.match(pageSource, /function toCommunityParameters/);
  assert.match(pageSource, /tipoDocumentoVenda: 'SELLOUT'/);
  assert.match(pageSource, /body: JSON\.stringify\(toCommunityParameters\(parameters\.value\)\)/);
  assert.doesNotMatch(pageSource, /unidadeMedidaPadraoCapacidadeLogisticaPeso:/);
  assert.doesNotMatch(pageSource, /quantidadesEmPedidosRepresentamSaldoRestante:/);
});
