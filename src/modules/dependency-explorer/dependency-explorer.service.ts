import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import {
  buildDependencyExplorerEndpoint,
  DEPENDENCY_EXPLORER_ENDPOINTS,
  type InternalLocationOption,
  type MaterialLocationDependency,
  type MaterialOption,
  type SupplyNetworkVersionOption,
} from './dependency-explorer.types';

/** Preserves the server explanation for invalid roots or a failed projection read. */
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

/** Loads only the three existing selectors. It does not build a dependency snapshot. */
export async function getDependencyExplorerSelectors(): Promise<{
  supplyNetworkVersions: SupplyNetworkVersionOption[];
  internalLocations: InternalLocationOption[];
  materials: MaterialOption[];
}> {

  try {
    const [supplyNetworkVersions, internalLocations, materials] = await Promise.all([
      httpClient.request<SupplyNetworkVersionOption[]>(DEPENDENCY_EXPLORER_ENDPOINTS.supplyNetworkVersions),
      httpClient.request<InternalLocationOption[]>(DEPENDENCY_EXPLORER_ENDPOINTS.internalLocations),
      httpClient.request<MaterialOption[]>(DEPENDENCY_EXPLORER_ENDPOINTS.materials),
    ]);
    return { supplyNetworkVersions, internalLocations, materials };
  } catch (error) {
    throw toBackendError(error, 'Unable to load Supply Network dependency explorer selectors.');
  }

}

/** Loads one fully materialized and bounded tree only after the operator requests it. */
export async function getDependencyExplorerTree(input: {
  supplyNetworkId: string;
  locationId: string;
  materialId: string;
  maximumTreeDepth: string;
}): Promise<MaterialLocationDependency[]> {

  try {
    return await httpClient.request<MaterialLocationDependency[]>(buildDependencyExplorerEndpoint(input));
  } catch (error) {
    throw toBackendError(error, 'Unable to load the Supply Network dependency tree.');
  }

}
