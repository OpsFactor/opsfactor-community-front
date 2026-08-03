/** Raw Community location catalog entry, intentionally without private geography or characteristics. */
export interface CommunityLocationMasterData {
  id: string;
  description: string | null;
  locationType: string | null;
  active: boolean | null;
  country: string | null;
  state: string | null;
  city: string | null;
  showInSupplyPlanningBook: boolean | null;
  showInProductionPlanningBook: boolean | null;
  applyInboundConstraints: boolean | null;
  safetyStockConsiderIndirectDemand: boolean | null;
  applyProductionConstraints: boolean | null;
}

export const locationMasterDataEndpoint = '/api/secured/location';
