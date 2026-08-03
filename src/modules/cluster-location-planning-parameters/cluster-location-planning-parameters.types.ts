/** Raw administrative parameter published for one Location Cluster. */
export interface CommunityClusterLocationPlanningParameter {
  id: number;
  clusterLocations: string | null;
  clusterLocationsID: number | null;
  planejaDP: boolean | null;
  planejaPricing: boolean | null;
}

/** The sole Community administrative snapshot endpoint used by this inspector. */
export const CLUSTER_LOCATION_PLANNING_PARAMETERS_ENDPOINT = '/api/secured/configs/parametros/clusterLocation';
