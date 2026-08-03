import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import type {
  InventoryOverview,
  InventoryOverviewSelection,
  LocationOption,
  MaterialOption,
  SupplyPlanOption,
} from './inventory-overview.types';
import { buildInventoryOverviewRequest } from './inventory-overview.types';

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
  materials: MaterialOption[];
  locations: LocationOption[];
}> {
  try {
    const [supplyPlans, unitOfMeasureIds, materials, locations] = await Promise.all([
      httpClient.request<SupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<string[]>('/api/secured/unitofmeasure/findids'),
      httpClient.request<MaterialOption[]>('/api/secured/material'),
      httpClient.request<LocationOption[]>('/api/secured/location'),
    ]);

    return { supplyPlans, unitOfMeasureIds, materials, locations };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Inventory Overview selectors.');
  }
}

/** Requests only the Community physical inventory contract. */
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
