import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type { CommunityMaterial, CommunityMaterialCluster } from './material-master-data.types';

/** Preserves the backend message and never creates a local fallback catalog. */
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

/**
 * Community material master-data read transport.
 *
 * Each request has a single catalog scope. The page deliberately decides when
 * to load it, so material members are never prefetched for every cluster.
 */
export class MaterialMasterDataCatalogService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getMaterials(): Promise<CommunityMaterial[]> {

    return this.getCatalog('/api/secured/material', 'Unable to load materials.');
  }

  public async getMaterialClusters(): Promise<CommunityMaterialCluster[]> {

    return this.getCatalog('/api/secured/material/cluster', 'Unable to load material clusters.');
  }

  public async getMaterialClusterMembers(clusterId: number): Promise<CommunityMaterial[]> {

    return this.getCatalog(
      `/api/secured/material/cluster/${encodeURIComponent(String(clusterId))}/materials`,
      'Unable to load material-cluster members.',
    );
  }

  private async getCatalog<T>(path: string, fallback: string): Promise<T[]> {

    try {
      return await this.httpClient.request<T[]>(path);
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
