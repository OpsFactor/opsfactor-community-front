import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from './community-authentication.service';

/** Shared option shape used by Community selectors that point to persisted master data. */
export interface CommunityNamedOption {
  id: string;
  description?: string | null;
}

/** Material attributes published by the bounded Community master-data catalog. */
export interface CommunityMaterialOption extends CommunityNamedOption {
  active?: boolean | null;
  materialStatus?: string | null;
}

/** Location attributes that can be reused as filter-only characteristics. */
export interface CommunityLocationOption extends CommunityNamedOption {
  active?: boolean | null;
  locationType?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
}

/** Persisted plan summary used as a selector rather than a manually entered identifier. */
export interface CommunityPlanOption {
  demandPlanId?: number;
  supplyPlanId?: number;
  description?: string | null;
  executionProfileId?: string | null;
  bucketSize?: string | null;
  beginsOn?: string | null;
}

/** Inventory-policy summary returned by the bounded Community configuration API. */
export interface CommunityInventoryPolicyOption {
  id: string;
  prioridade?: number | null;
}

export const COMMUNITY_OPTION_CATALOG_ENDPOINTS = {
  demandPlans: '/api/secured/planning/demand/demandplan',
  supplyPlans: '/api/secured/planning/supply',
  supplyNetworkVersions: '/api/secured/supplynetwork/version',
  locations: '/api/secured/location',
  materials: '/api/secured/material',
  unitOfMeasureIds: '/api/secured/unitofmeasure/findids',
  inventoryPolicies: '/api/secured/configs/inventorypolicy',
} as const;

function toCatalogError(error: unknown, label: string): Error {

  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(`Unable to load ${label}.`);
  }

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || `Unable to load ${label}.`);
  } catch {
    return new Error(error.responseText.trim() || `Unable to load ${label}.`);
  }

}

/** Loads one existing catalog without allowing forms to fall back to free-form IDs. */
async function loadCatalog<T>(endpoint: string, label: string): Promise<T> {

  try {
    return await httpClient.request<T>(endpoint);
  } catch (error) {
    throw toCatalogError(error, label);
  }

}

export const loadCommunityDemandPlans = () => loadCatalog<CommunityPlanOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.demandPlans, 'Demand Plans');
export const loadCommunitySupplyPlans = () => loadCatalog<CommunityPlanOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.supplyPlans, 'Supply Plans');
export const loadCommunitySupplyNetworkVersions = () => loadCatalog<CommunityNamedOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.supplyNetworkVersions, 'Supply Network Versions');
export const loadCommunityLocations = () => loadCatalog<CommunityLocationOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.locations, 'Locations');
export const loadCommunityMaterials = () => loadCatalog<CommunityMaterialOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.materials, 'Materials');
export const loadCommunityUnitOfMeasureIds = () => loadCatalog<string[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.unitOfMeasureIds, 'units of measure');
export const loadCommunityInventoryPolicies = () => loadCatalog<CommunityInventoryPolicyOption[]>(COMMUNITY_OPTION_CATALOG_ENDPOINTS.inventoryPolicies, 'Inventory Policies');

/** Keeps persisted identity visible while making descriptions the primary recognition aid. */
export function communityNamedOptionLabel(option: CommunityNamedOption): string {

  return option.description?.trim() ? `${option.id} — ${option.description}` : option.id;

}

/** Produces the same compact plan labels used by the Planning Front selectors. */
export function communityPlanOptionLabel(option: CommunityPlanOption): string {

  return [
    option.supplyPlanId ?? option.demandPlanId,
    option.executionProfileId,
    option.bucketSize,
    option.beginsOn,
    option.description,
  ].filter((value) => value !== null && value !== undefined && String(value).trim().length > 0).join(' — ');

}
