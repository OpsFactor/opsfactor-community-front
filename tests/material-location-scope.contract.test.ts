import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const componentSource = readSource('src/features/material-location-scope/MaterialLocationScopeFilters.vue');
const typesSource = readSource('src/features/material-location-scope/material-location-scope.types.ts');
const catalogSource = readSource('src/services/community-option-catalog.service.ts');
const salesPageSource = readSource('src/modules/demand-planning/pages/SalesDemandOverviewPage.vue');
const inventoryPageSource = readSource('src/modules/inventory-overview/InventoryOverviewPage.vue');

test('shared material/location scope composes neutral shell controls and owns no API endpoint', () => {

  assert.match(componentSource, /OfxOperationFilters/);
  assert.match(componentSource, /OfxMaterialsFilter/);
  assert.match(componentSource, /OfxLocationsFilter/);
  assert.match(componentSource, /OfxMaterialCharacteristicsFilter/);
  assert.match(componentSource, /OfxLocationCharacteristicsFilter/);
  assert.doesNotMatch(componentSource, /\/api\/secured\//);
  assert.match(typesSource, /materialIds: \[\]/);
  assert.match(typesSource, /locationIds: \[\]/);
  assert.match(typesSource, /valuesByMaterialCharacteristicId/);
  assert.match(typesSource, /valuesByLocationCharacteristicId/);

});

test('one catalog loader and one scope component are reused by Sales and Inventory', () => {

  assert.match(catalogSource, /\/api\/secured\/material\/characteristics/);
  assert.match(catalogSource, /\/api\/secured\/location\/characteristics/);
  assert.match(catalogSource, /loadCommunityMaterialLocationFilterCatalog/);
  assert.match(salesPageSource, /<MaterialLocationScopeFilters/);
  assert.match(inventoryPageSource, /<MaterialLocationScopeFilters/);

});
