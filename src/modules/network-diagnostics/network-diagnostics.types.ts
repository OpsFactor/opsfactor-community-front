/**
 * Minimal selector returned by the Community Supply Network version catalog.
 *
 * The diagnostic accepts the version identifier as a path segment; no network
 * data is reconstructed or joined by the browser.
 */
export interface SupplyNetworkVersion {
  id: string;
  description?: string | null;
}

/**
 * Raw edge returned by the Community Low Level Code circularity diagnostic.
 *
 * These six fields intentionally match the existing DTO instead of deriving a
 * graph, a route, or a material/location projection in the browser.
 */
export interface CircularNetworkAlert {
  masterData?: string | null;
  masterDataId?: string | null;
  lowLevelCode?: number | null;
  circularNetworkId?: number | null;
  materialId?: string | null;
  outputMaterialId?: string | null;
}

export const SUPPLY_NETWORK_VERSION_ENDPOINT = '/api/secured/supplynetwork/version';

/** Builds the only circularity endpoint and rejects a malformed selector locally. */
export function buildCircularNetworkAlertsEndpoint(supplyNetworkVersionId: string): string {

  const normalizedSupplyNetworkVersionId = supplyNetworkVersionId.trim();
  if (normalizedSupplyNetworkVersionId.length === 0) {
    throw new Error('A Supply Network Version ID is required to diagnose circularity.');
  }

  return `/api/secured/alerts/circularnetwork/${encodeURIComponent(normalizedSupplyNetworkVersionId)}`;

}
