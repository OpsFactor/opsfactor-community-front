import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type {
  CommunityClusterDeleteRequest,
  CommunityLocationClusterMember,
  CommunityLocationClusterScope,
  CommunityMaterialClusterScope,
} from './cluster-scope.types';

/** Preserves an operational backend explanation without introducing screen-specific transport fallbacks. */
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
 * Transport owned by the Community Demand Planning cluster editor.
 *
 * It handles only bounded definition snapshots. Active members remain a
 * separate on-demand read for one explicitly selected Location Cluster; DFU
 * combinations and global allocation never reach this surface.
 */
export class ClusterScopeInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getMaterialClusters(): Promise<CommunityMaterialClusterScope[]> {

    try {
      return await this.httpClient.request<CommunityMaterialClusterScope[]>('/api/secured/materialclustering');
    } catch (error) {
      throw toBackendError(error, 'Unable to load material cluster definitions.');
    }
  }

  public async getLocationClusters(): Promise<CommunityLocationClusterScope[]> {

    try {
      return await this.httpClient.request<CommunityLocationClusterScope[]>('/api/secured/locationclustering');
    } catch (error) {
      throw toBackendError(error, 'Unable to load location cluster definitions.');
    }
  }

  /** Reads one authoritative Material DP snapshot before it is edited. */
  public async getMaterialCluster(clusterId: number): Promise<CommunityMaterialClusterScope> {

    try {
      return await this.httpClient.request<CommunityMaterialClusterScope>(
        `/api/secured/materialclustering/${encodeURIComponent(String(clusterId))}/DP`,
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load the material cluster definition.');
    }
  }

  /** Reads one authoritative Location snapshot before it is edited. */
  public async getLocationCluster(clusterId: number): Promise<CommunityLocationClusterScope> {

    try {
      return await this.httpClient.request<CommunityLocationClusterScope>(
        `/api/secured/locationclustering/${encodeURIComponent(String(clusterId))}`,
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load the location cluster definition.');
    }
  }

  /** Sends the complete Material DP rule snapshot; omitted persisted rules are removals. */
  public async saveMaterialCluster(cluster: CommunityMaterialClusterScope): Promise<void> {

    await this.requestMutation('/api/secured/materialclustering/save', cluster, 'Unable to save the material cluster definition.');
  }

  /** Sends the complete Location rule snapshot; omitted persisted rules are removals. */
  public async saveLocationCluster(cluster: CommunityLocationClusterScope): Promise<void> {

    await this.requestMutation('/api/secured/locationclustering/save', cluster, 'Unable to save the location cluster definition.');
  }

  /** Deletes only the selected persisted Material DP cluster; the backend owns integrity checks. */
  public async deleteMaterialCluster(request: CommunityClusterDeleteRequest): Promise<void> {

    await this.requestMutation(
      '/api/secured/materialclustering/delete',
      request,
      'Unable to delete the material cluster. The cluster may still be in use.',
      'DELETE',
    );
  }

  /** Deletes only the selected persisted Location cluster; the backend owns integrity checks. */
  public async deleteLocationCluster(request: CommunityClusterDeleteRequest): Promise<void> {

    await this.requestMutation(
      '/api/secured/locationclustering/delete',
      request,
      'Unable to delete the location cluster. The cluster may still be in use.',
      'DELETE',
    );
  }

  /**
   * Reads active members for one selected Location Cluster only.
   *
   * The backend resolves the list from its projection cache. The response is
   * intentionally not paginated, so callers must never prefetch it.
   */
  public async getLocationClusterMembers(clusterLocationsId: number): Promise<CommunityLocationClusterMember[]> {

    try {
      return await this.httpClient.request<CommunityLocationClusterMember[]>(
        `/api/secured/location/cluster/${encodeURIComponent(String(clusterLocationsId))}/locations`,
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load active Location Cluster members.');
    }
  }

  /** Keeps JSON mutation transport uniform and preserves the backend explanation on an integrity failure. */
  private async requestMutation(
    path: string,
    body: unknown,
    fallback: string,
    method: 'POST' | 'DELETE' = 'POST',
  ): Promise<void> {

    try {
      await this.httpClient.request<string>(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
