/** Six raw columns deliberately published by the Community sell-out report. */
export interface CommunityHistoricalSelloutRow {
  documentId: string | null;
  referenceDate: string | null;
  originLocationId: string | null;
  materialId: string | null;
  uomId: string | null;
  quantity: number | null;
}

/** Minimal response envelope kept from the canonical historical report. */
export interface CommunityHistoricalSelloutReport {
  data: CommunityHistoricalSelloutRow[];
}

/** Optional explicit identifiers avoid characteristic filters and catalog preloads. */
export interface CommunityHistoricalSelloutReportRequest {
  startDate: string;
  endDate: string;
  materialLocationFilterDTO?: {
    materialIds: string[];
    locationIds: string[];
  };
}

/** Splits manually entered identifiers without deriving selections from master-data catalogs. */
export function parseExplicitIdentifiers(value: string): string[] {

  return [...new Set(value
    .split(/[\s,;]+/)
    .map((identifier) => identifier.trim())
    .filter((identifier) => identifier.length > 0))];

}

/** Builds the only Community payload accepted by the historical sell-out report. */
export function buildCommunityHistoricalSelloutReportRequest(input: {
  startDate: string;
  endDate: string;
  materialIds: string[];
  locationIds: string[];
}): CommunityHistoricalSelloutReportRequest {

  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();
  if (startDate.length === 0 || endDate.length === 0) {
    throw new Error('Initial and final dates are required.');
  }
  if (startDate > endDate) {
    throw new Error('Initial date must be before or equal to final date.');
  }

  const materialIds = [...new Set(input.materialIds.map((identifier) => identifier.trim()).filter(Boolean))];
  const locationIds = [...new Set(input.locationIds.map((identifier) => identifier.trim()).filter(Boolean))];
  const request: CommunityHistoricalSelloutReportRequest = { startDate, endDate };
  if (materialIds.length > 0 || locationIds.length > 0) {
    request.materialLocationFilterDTO = { materialIds, locationIds };
  }
  return request;

}
