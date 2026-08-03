import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  resolveCanonicalDataIntegrationPath,
  resolveCanonicalJsonDataIntegrationPath,
} from '../packages/front-core/src/api/canonical-data-integration-path.ts';

test('shared transport rewrites only the unambiguous legacy Data JSON namespace', () => {

  assert.equal(
    resolveCanonicalJsonDataIntegrationPath('/api/secured/dataupload/json/material'),
    '/api/secured/data/material',
  );
  assert.equal(
    resolveCanonicalJsonDataIntegrationPath('/api/secured/dataupload/json/workflow/demandplanning/stage'),
    '/api/secured/data/workflow/demandplanning/stage',
  );
  assert.equal(
    resolveCanonicalJsonDataIntegrationPath('/api/secured/dataupload/directdemand/7'),
    '/api/secured/dataupload/directdemand/7',
  );

});

test('explicit Data representation selects the corresponding canonical root', () => {

  assert.equal(
    resolveCanonicalDataIntegrationPath('/api/secured/dataupload/directdemand/7', 'file'),
    '/api/secured/data/file/directdemand/7',
  );
  assert.equal(
    resolveCanonicalDataIntegrationPath('/api/secured/dataupload/planning/demand/autofit/cluster/model/7', 'json'),
    '/api/secured/data/planning/demand/autofit/cluster/model/7',
  );

});

test('both edition HTTP clients consume the Community-owned JSON path adapter', () => {

  const communityHttp = readFileSync(new URL('../src/services/api/http.ts', import.meta.url), 'utf8');
  const enterpriseHttp = readFileSync(
    new URL('../../opsfactor-enterprise-front/src/services/api/http.ts', import.meta.url),
    'utf8',
  );

  for (const httpSource of [communityHttp, enterpriseHttp]) {
    assert.match(httpSource, /resolveCanonicalJsonDataIntegrationPath/);
    assert.match(httpSource, /buildUrl\(resolveCanonicalJsonDataIntegrationPath\(path\), options\.query\)/);
  }

});
