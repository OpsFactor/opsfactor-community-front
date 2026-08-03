import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  buildTransportationLaneMaterialEndpoint,
  buildTransportationLanesEndpoint,
  supplyNetworkVersionEndpoint,
  transportationLaneDeleteEndpoint,
  transportationLaneMaterialDeleteEndpoint,
  transportationLaneMaterialUpdateEndpoint,
  transportationLaneUpdateEndpoint,
  type CommunitySupplyNetworkVersion,
  type CommunityTransportationLane,
  type CommunityTransportationLaneMaterial,
  type CommunityTransportationLaneMaterialPrimaryKey,
  type CommunityTransportationLaneMaterialSaveRequest,
  type CommunityTransportationLanePrimaryKey,
  type CommunityTransportationLaneSaveRequest,
} from './transportation-lanes.types';

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

/** Transport for the bounded Community supply-network configuration, never for Data or network analytics. */
export class TransportationLanesInspectorService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getSupplyNetworkVersions(): Promise<CommunitySupplyNetworkVersion[]> {

    try {
      return await this.httpClient.request<CommunitySupplyNetworkVersion[]>(supplyNetworkVersionEndpoint);
    } catch (error) {
      throw toBackendError(error, 'Unable to load Supply Network Versions.');
    }
  }

  public async saveSupplyNetworkVersion(version: CommunitySupplyNetworkVersion): Promise<string> {

    return this.requestTextMutation(supplyNetworkVersionEndpoint, 'POST', version, 'Unable to save the Supply Network Version.');
  }

  /** Reads all base lanes only when the operator explicitly chooses this tab and version. */
  public async getBaseLanes(supplyNetworkVersionId: string): Promise<CommunityTransportationLane[]> {

    try {
      return await this.httpClient.request<CommunityTransportationLane[]>(buildTransportationLanesEndpoint(supplyNetworkVersionId));
    } catch (error) {
      throw toBackendError(error, 'Unable to load base transportation lanes.');
    }
  }

  public async saveBaseLane(request: CommunityTransportationLaneSaveRequest): Promise<string> {

    return this.requestTextMutation(transportationLaneUpdateEndpoint, 'POST', request, 'Unable to save the base transportation lane.');
  }

  /** The backend accepts an array, but the configuration UI always sends exactly one selected key. */
  public async deleteBaseLane(primaryKey: CommunityTransportationLanePrimaryKey): Promise<string> {

    return this.requestTextMutation(transportationLaneDeleteEndpoint, 'DELETE', [primaryKey], 'Unable to delete the base transportation lane.');
  }

  /** Reads material overrides only by explicit action; it is never coupled to base-lane loading. */
  public async getMaterialOverrides(supplyNetworkVersionId: string): Promise<CommunityTransportationLaneMaterial[]> {

    try {
      return await this.httpClient.request<CommunityTransportationLaneMaterial[]>(
        buildTransportationLaneMaterialEndpoint(supplyNetworkVersionId),
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load transportation-lane material overrides.');
    }
  }

  public async saveMaterialOverride(request: CommunityTransportationLaneMaterialSaveRequest): Promise<string> {

    return this.requestTextMutation(transportationLaneMaterialUpdateEndpoint, 'POST', request, 'Unable to save the transportation-lane material override.');
  }

  /** The controller receives one selected override in its historical array envelope. */
  public async deleteMaterialOverride(primaryKey: CommunityTransportationLaneMaterialPrimaryKey): Promise<string> {

    return this.requestTextMutation(transportationLaneMaterialDeleteEndpoint, 'DELETE', [primaryKey], 'Unable to delete the transportation-lane material override.');
  }

  private async requestTextMutation(path: string, method: 'POST' | 'DELETE', body: unknown, fallback: string): Promise<string> {

    try {
      return await this.httpClient.request<string>(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
