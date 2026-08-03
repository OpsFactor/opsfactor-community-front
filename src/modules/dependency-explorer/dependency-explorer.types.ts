/** Existing Community selector shared by Supply Network diagnostics. */
export interface SupplyNetworkVersionOption {
  id: string;
  description?: string | null;
}

/** Existing internal-location selector used by Supply Planning diagnostics. */
export interface InternalLocationOption {
  id: string;
  description?: string | null;
}

/** Existing Community material selector. No characteristics are needed by this explorer. */
export interface MaterialOption {
  id: string;
  description?: string | null;
}

export type SupplyDependencyElementType =
  | 'Material-Location'
  | 'Production Version'
  | 'Routing-Bom Combination'
  | 'Bill of Materials'
  | 'Routing'
  | 'Production Resource'
  | 'Transportation Line';

interface SupplyDependencyBase {
  elementType: SupplyDependencyElementType;
  viableStep?: boolean | null;
}

export interface MaterialLocationDependency extends SupplyDependencyBase {
  elementType: 'Material-Location';
  materialId?: string | null;
  locationId?: string | null;
  active?: boolean | null;
  viableProduction?: boolean | null;
  viableInbound?: boolean | null;
  /** The backend currently leaves this field false; the UI must not use it as a boundary marker. */
  recursionCut?: boolean | null;
  depth?: number | null;
  productionVersionDependencies?: ProductionVersionDependency[];
  inboundTransportationLineDependencies?: TransportationLineDependency[];
}

export interface ProductionVersionDependency extends SupplyDependencyBase {
  elementType: 'Production Version';
  productionVersionId?: string | null;
  active?: boolean | null;
  parallelRoutingsOmitted?: boolean | null;
  omittedParallelRoutingCount?: number | null;
  routingAndBomCombinationDependencies?: RoutingBomCombinationDependency[];
}

export interface RoutingBomCombinationDependency extends SupplyDependencyBase {
  elementType: 'Routing-Bom Combination';
  routingDependency?: RoutingDependency | null;
  bomDependency?: BillOfMaterialsDependency | null;
  parallelRoutingsOmitted?: boolean | null;
  omittedParallelRoutingCount?: number | null;
}

export interface BillOfMaterialsDependency extends SupplyDependencyBase {
  elementType: 'Bill of Materials';
  bomId?: string | null;
  active?: boolean | null;
  bomComponentDependencies?: MaterialLocationDependency[];
}

export interface RoutingDependency extends SupplyDependencyBase {
  elementType: 'Routing';
  routingId?: string | null;
  active?: boolean | null;
  productionResourceDependencies?: ProductionResourceDependency[];
}

export interface ProductionResourceDependency extends SupplyDependencyBase {
  elementType: 'Production Resource';
  productionResourceId?: string | null;
  active?: boolean | null;
}

export interface TransportationLineDependency extends SupplyDependencyBase {
  elementType: 'Transportation Line';
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  materialId?: string | null;
  active?: boolean | null;
  materialAtOriginLocationDependency?: MaterialLocationDependency | null;
}

export type SupplyDependencyNode =
  | MaterialLocationDependency
  | ProductionVersionDependency
  | RoutingBomCombinationDependency
  | BillOfMaterialsDependency
  | RoutingDependency
  | ProductionResourceDependency
  | TransportationLineDependency;

export const DEPENDENCY_EXPLORER_ENDPOINTS = {
  supplyNetworkVersions: '/api/secured/supplynetwork/version',
  internalLocations: '/api/secured/location/internal',
  materials: '/api/secured/material',
  dependencies: '/api/secured/supplynetwork/dependencies',
} as const;

/** Matches the safe depth range already presented by the legacy explorer. */
export function isValidMaximumTreeDepth(value: string): boolean {

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue >= 1 && parsedValue <= 15;

}

/** Builds the only explorer request from a fully explicit and bounded physical root. */
export function buildDependencyExplorerEndpoint(input: {
  supplyNetworkId: string;
  locationId: string;
  materialId: string;
  maximumTreeDepth: string;
}): string {

  const supplyNetworkId = input.supplyNetworkId.trim();
  const locationId = input.locationId.trim();
  const materialId = input.materialId.trim();
  if (!supplyNetworkId || !locationId || !materialId || !isValidMaximumTreeDepth(input.maximumTreeDepth)) {
    throw new Error('Supply Network Version, internal location, material, and a tree depth from 1 to 15 are required.');
  }

  const query = new URLSearchParams({
    supplyNetworkId,
    locationId,
    materialId,
    maximumTreeDepth: input.maximumTreeDepth,
  });
  return `${DEPENDENCY_EXPLORER_ENDPOINTS.dependencies}?${query.toString()}`;

}
