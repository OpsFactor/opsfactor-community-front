import assert from 'node:assert/strict';
import test from 'node:test';
import { locationMasterDataEndpoint } from '../src/modules/location-master-data/location-master-data.types.ts';

test('Location Master-Data Catalog uses exactly the explicit Community location snapshot endpoint', async () => {

  assert.equal(locationMasterDataEndpoint, '/api/secured/location');

  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/location-master-data/location-master-data.service.ts', import.meta.url),
    'utf8',
  ));
  assert.match(source, /request<CommunityLocationMasterData\[\]>\(locationMasterDataEndpoint\)/);
  assert.equal(source.includes('/api/secured/location/'), false);

});

test('Location Master-Data Catalog stays an explicit read-only raw Community snapshot', async () => {

  const source = await import('node:fs/promises').then((fs) => fs.readFile(
    new URL('../src/modules/location-master-data/LocationMasterDataCatalogPage.vue', import.meta.url),
    'utf8',
  ));

  assert.match(source, /async function loadLocations/);
  assert.match(source, /locationMasterDataCatalogService\.getLocations\(\)/);
  assert.match(source, /Creation, update, activation, deactivation, and import remain in Data Operations/);
  assert.match(source, /location\.locationType/);
  assert.match(source, /location\.applyInboundConstraints/);
  assert.equal(source.includes('onMounted'), false);
  assert.equal(source.includes('/cluster'), false);
  assert.equal(source.includes('location.latitude'), false);
  assert.equal(source.includes('location.longitude'), false);
  assert.equal(source.includes('location.characteristicValues'), false);
  assert.equal(source.includes('deactivateLocation'), false);
  assert.equal(source.includes('deleteLocation'), false);
  assert.equal(source.includes('saveLocation'), false);
  assert.equal(source.includes("method: 'POST'"), false);
  assert.equal(source.includes("method: 'DELETE'"), false);

});
