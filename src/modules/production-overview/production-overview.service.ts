import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import {
  buildProductionOverviewRequest,
  buildProductionOverviewResourceDetailRequest,
  type NamedOption,
  type ProductionOverview,
  type ProductionOverviewResourceDetail,
  type ProductionOverviewSelection,
  type SupplyPlanOption,
} from './production-overview.types';

/** Preserves a backend functional explanation instead of hiding it in a generic browser error. */
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

/** Loads only the four generic Community catalogs needed to form the physical selection. */
export async function getProductionOverviewSelectors(): Promise<{
  supplyPlans: SupplyPlanOption[];
  unitOfMeasureIds: string[];
  materials: NamedOption[];
  locations: NamedOption[];
}> {

  try {
    const [supplyPlans, unitOfMeasureIds, materials, locations] = await Promise.all([
      httpClient.request<SupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<string[]>('/api/secured/unitofmeasure/findids'),
      httpClient.request<NamedOption[]>('/api/secured/material'),
      httpClient.request<NamedOption[]>('/api/secured/location'),
    ]);
    return { supplyPlans, unitOfMeasureIds, materials, locations };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Production Overview selectors.');
  }

}

/** Reads one canonical, projection-backed Production Overview snapshot. */
export async function getProductionOverview(selection: ProductionOverviewSelection): Promise<ProductionOverview> {

  try {
    return await httpClient.request<ProductionOverview>('/api/secured/bi/planning/supply/productionoverview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProductionOverviewRequest(selection)),
    });
  } catch (error) {
    throw toBackendError(error, 'Unable to load Production Overview.');
  }

}

/**
 * Opens one resource-period cell on demand.
 *
 * The body deliberately carries only the published material filter. Resource,
 * period and plan never come from mutable browser state in the request body.
 */
export async function getProductionOverviewResourceDetail(
  supplyPlanId: number,
  productionResourceId: string,
  periodIndex: number,
  materialIds: string[],
): Promise<ProductionOverviewResourceDetail> {

  try {
    return await httpClient.request<ProductionOverviewResourceDetail>(
      `/api/secured/bi/planning/supply/productionoverview/${supplyPlanId}/${encodeURIComponent(productionResourceId)}/${periodIndex}/details`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProductionOverviewResourceDetailRequest(materialIds)),
      },
    );
  } catch (error) {
    throw toBackendError(error, 'Unable to load Production Overview resource detail.');
  }

}
