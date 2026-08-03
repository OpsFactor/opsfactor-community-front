import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import { filterProductionPlanningBookLocations } from './production-planning-book.types';
import type {
  ProductionPlanningBook,
  ProductionPlanningBookUpdate,
  ProductionPlanningLocationOption,
  ProductionPlanningSupplyPlanOption,
} from './production-planning-book.types';

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

/** Loads the existing Community catalogs and retains only production-book locations. */
export async function getProductionPlanningBookSelectors(): Promise<{
  supplyPlans: ProductionPlanningSupplyPlanOption[];
  locations: ProductionPlanningLocationOption[];
}> {

  try {
    const [supplyPlans, locations] = await Promise.all([
      httpClient.request<ProductionPlanningSupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<ProductionPlanningLocationOption[]>('/api/secured/location'),
    ]);

    return {
      supplyPlans,
      locations: filterProductionPlanningBookLocations(locations),
    };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Production Planning Book selectors.');
  }
}

/** Opens the canonical Community Working Plan aggregate for one location. */
export async function getProductionPlanningBook(
  locationId: string,
  supplyPlanId: number,
): Promise<ProductionPlanningBook> {

  try {
    const parameters = new URLSearchParams({ locationId, supplyPlanId: String(supplyPlanId) });
    return await httpClient.request<ProductionPlanningBook>(`/api/secured/planning/production/planningbook?${parameters.toString()}`);
  } catch (error) {
    throw toBackendError(error, 'Unable to load the Production Planning Book.');
  }
}

/** Sends the exact typed update and returns the reconstructed authoritative book. */
export async function updateProductionPlanningBook(
  update: ProductionPlanningBookUpdate,
): Promise<ProductionPlanningBook> {

  try {
    return await httpClient.request<ProductionPlanningBook>('/api/secured/planning/production/planningbook/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to save the planned production change.');
  }
}
