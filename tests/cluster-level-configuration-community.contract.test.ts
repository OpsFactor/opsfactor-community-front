import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Community cluster-level configuration uses Community material-cluster catalogs only', () => {

  const pageSource = readFileSync(new URL('../src/modules/demand-planning/ClusterLevelConfigurationCommunityPage.vue', import.meta.url), 'utf8');
  const serviceSource = readFileSync(new URL('../src/modules/demand-planning/services/cluster-level-configuration.service.ts', import.meta.url), 'utf8');

  for (const source of [pageSource, serviceSource]) {
    assert.match(source, /\/api\/secured\/material\/cluster/);
    assert.doesNotMatch(source, /\/api\/secured\/product\/cluster|\/DTO\/clusterprodutos/);
  }

  assert.match(pageSource, /TaskPageLayout/);
  assert.match(pageSource, /title="Demand Planning Cluster-Level Configuration"/);
  assert.match(pageSource, /title="Execution Profile Selection"/);
  assert.match(pageSource, /title="Cluster Selection"/);
  assert.match(pageSource, /title="Outlier Smoothing"/);
  assert.match(pageSource, /title="DFU Split"/);
  assert.match(pageSource, /title="Forecast Model Parametrization"/);
  assert.match(pageSource, /Bucket Size/);
  assert.match(pageSource, /Default Auto-Fit/);
  assert.match(pageSource, /Use Auto-fitted Model/);
  assert.match(pageSource, /Outlier Smoothing Model/);
  assert.match(pageSource, /Days for Outlier Smoothing/);
  assert.match(pageSource, /Lower Percentile Smoothing/);
  assert.match(pageSource, /Upper Percentile Smoothing/);
  assert.match(pageSource, /Split Model/);
  assert.match(pageSource, /Days for Top-Down Split/);
  assert.match(pageSource, /Budget Version/);
  assert.match(pageSource, /Event Uplift/);
  assert.match(pageSource, /Product Aggregation/);
  assert.match(pageSource, /Location Aggregation/);
  assert.match(pageSource, /Unit of Measure/);
  assert.match(pageSource, /Stockout Treatment/);
  assert.match(pageSource, /Seasonality Scale/);
  assert.match(pageSource, /Monthly Fourier Order/);
  assert.match(pageSource, /Trend Change Flexibility/);
  assert.match(pageSource, /Force Aggregated Forecast/);
  assert.match(pageSource, /Trend \/ Growth Regressor/);
  assert.match(pageSource, /Working Days Regressor/);
  assert.match(pageSource, /title="Sales History and Coverage"/);
  assert.match(pageSource, /title="Simulation Parameters"/);
  assert.match(pageSource, /title="Pricing Model Parametrization"/);
  assert.match(pageSource, /title="Forecast Accuracy"/);
  assert.match(pageSource, /title="Detailed View Filters"/);
  assert.match(pageSource, /title="Forecast Preview"/);
  assert.match(pageSource, /title="Seasonality Comparison"/);
  assert.match(pageSource, /Enterprise/);
  assert.doesNotMatch(pageSource, /budget\/|uplift\/|stockout\/|autofit\/|forecastpreview/);

});
