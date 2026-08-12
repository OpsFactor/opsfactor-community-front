import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import { loadCommunityMaterialLocationFilterCatalog } from '@/services/community-option-catalog.service';
import type {
  InventoryOverview,
  InventoryOverviewSelection,
  InventoryOverviewCharacteristic,
  SupplyPlanOption,
} from './inventory-overview.types';
import { buildInventoryOverviewRequest } from './inventory-overview.types';
import type { MaterialLocationScopeCatalog } from '@/features/material-location-scope/material-location-scope.types';

/** Turns the standard HTTP boundary error into an actionable UI message. */
function toBackendError(error: unknown, fallback: string): Error {
  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(fallback);
  }

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }
}

/** Loads the four existing Community selectors needed by the physical read. */
export async function getInventoryOverviewSelectors(): Promise<{
  supplyPlans: SupplyPlanOption[];
  unitOfMeasureIds: string[];
  materials: MaterialLocationScopeCatalog['materials'];
  locations: MaterialLocationScopeCatalog['locations'];
  materialCharacteristics: InventoryOverviewCharacteristic[];
  locationCharacteristics: InventoryOverviewCharacteristic[];
}> {
  try {
    const [supplyPlans, unitOfMeasureIds, materialLocationCatalog] = await Promise.all([
      httpClient.request<SupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<string[]>('/api/secured/unitofmeasure/findids'),
      loadCommunityMaterialLocationFilterCatalog(),
    ]);

    return {
      supplyPlans,
      unitOfMeasureIds,
      materials: materialLocationCatalog.materials,
      locations: materialLocationCatalog.locations,
      materialCharacteristics: materialLocationCatalog.materialCharacteristics,
      locationCharacteristics: materialLocationCatalog.locationCharacteristics,
    };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Inventory Overview selectors.');
  }
}

/** Requests one detailed Community physical snapshot used by the local analysis. */
export async function getInventoryOverview(selection: InventoryOverviewSelection): Promise<InventoryOverview> {
  try {
    return await httpClient.request<InventoryOverview>('/api/secured/bi/supply/inventory-overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInventoryOverviewRequest(selection)),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to load the Inventory Overview.');
  }
}
