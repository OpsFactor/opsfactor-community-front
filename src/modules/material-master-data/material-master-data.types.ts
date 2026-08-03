/** Raw Community material catalog entry. */
export interface CommunityMaterial {
  id: string;
  description?: string | null;
  active?: boolean | null;
  materialStatus?: string | null;
}

/** Header only: members are loaded by a separate, explicit request. */
export interface CommunityMaterialCluster {
  id: number;
  description?: string | null;
  priority?: number | null;
  process?: string | null;
}

export type MaterialMasterDataCatalogTab = 'materials' | 'clusters';
