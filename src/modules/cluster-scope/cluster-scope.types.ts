/**
 * One persisted Community material-cluster rule.
 *
 * The backend reuses a characteristic-shaped object for material status and
 * for one public material characteristic with selected values.
 */
export interface CommunityMaterialClusterRule {
  id: number | null;
  criterio: string | null;
  caracteristicaDTO: {
    caracteristicaId?: string | null;
    description?: string | null;
    descricao?: string | null;
    listaAtributos?: string[] | null;
    atributo?: string | null;
  } | null;
}

/** One public material characteristic and its current selectable values. */
export interface CommunityMaterialCharacteristic {
  caracteristicaId: string;
  descricao: string;
  listaAtributos: string[];
}

/** Complete Community material-cluster snapshot used by the shared clustering scheme. */
export interface CommunityMaterialClusterScope {
  id: number | null;
  description: string | null;
  priority: number | null;
  regraAlocacaoClusterDTOList: CommunityMaterialClusterRule[];
}

/** Minimal material identity returned when resolving one selected cluster. */
export interface CommunityMaterialClusterMember {
  id: string;
  description: string | null;
  active: boolean | null;
  materialStatus: string | null;
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

/** Minimal delete envelope accepted by both cluster endpoints. */
export interface CommunityClusterDeleteRequest {
  id: number;
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
