/**
 * One persisted Community material-cluster rule.
 *
 * The backend reuses a characteristic-shaped object to carry the fixed
 * material-status value. The editor deliberately retains that wire shape;
 * it must not invent a general characteristic capability.
 */
export interface CommunityMaterialClusterRule {
  id: number | null;
  criterio: string | null;
  caracteristicaDTO: {
    caracteristicaId?: string | null;
    description?: string | null;
    descricao?: string | null;
  } | null;
}

/** Complete Community material-cluster snapshot used by the DP editor. */
export interface CommunityMaterialClusterScope {
  id: number | null;
  description: string | null;
  priority: number | null;
  process: string | null;
  regraAlocacaoClusterDTOList: CommunityMaterialClusterRule[];
}

/**
 * One persisted Community location-cluster rule. The API deserializes this
 * polymorphic DTO by the public criterion label, so its values must remain
 * `Location Type` or `Country / State` in outbound snapshots.
 */
export interface CommunityLocationClusterRule {
  id: number | null;
  criterio: string | null;
  locationType?: string | null;
  pais?: string | null;
  estado?: string | null;
}

/** Complete Community location-cluster snapshot used by the DP editor. */
export interface CommunityLocationClusterScope {
  id: number | null;
  description: string | null;
  priority: number | null;
  regraAlocacaoClusterDTOList: CommunityLocationClusterRule[];
}

/** Minimal historical delete envelope accepted by both cluster endpoints. */
export interface CommunityClusterDeleteRequest {
  id: number;
  process?: 'DP';
}

/**
 * Community LocationDTO returned for one selected Location Cluster.
 *
 * Characteristics and Enterprise-only geographic/deployment capabilities are
 * intentionally absent from this read model.
 */
export interface CommunityLocationClusterMember {
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
