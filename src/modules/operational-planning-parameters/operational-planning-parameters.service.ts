import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  buildMaterialLocationOperationalParametersEndpoint,
  clusterOperationalParametersEndpoint,
  materialOperationalParametersEndpoint,
  operationalParameterLocationsEndpoint,
  type CommunityClusterOperationalParameter,
  type CommunityClusterOperationalParameterSaveRequest,
  type CommunityMaterialLocationOperationalParameter,
  type CommunityMaterialLocationOperationalParameterSaveRequest,
  type CommunityMaterialOperationalParameter,
  type CommunityMaterialOperationalParameterSaveRequest,
  type CommunityOperationalParameterLocation,
} from './operational-planning-parameters.types';

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

/** Uses only the pre-existing Community operational-parameter HTTP contract. */
export class OperationalPlanningParametersService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getClusterParameters(): Promise<CommunityClusterOperationalParameter[]> {

    return this.readSnapshot(clusterOperationalParametersEndpoint, 'Unable to load Location Cluster operational parameters.');
  }

  public async getMaterialParameters(): Promise<CommunityMaterialOperationalParameter[]> {

    return this.readSnapshot(materialOperationalParametersEndpoint, 'Unable to load Material operational parameters.');
  }

  public async getLocations(): Promise<CommunityOperationalParameterLocation[]> {

    return this.readSnapshot(operationalParameterLocationsEndpoint, 'Unable to load Locations for material-location parameters.');
  }

  public async getMaterialLocationParameters(locationId: string): Promise<CommunityMaterialLocationOperationalParameter[]> {

    return this.readSnapshot(
      buildMaterialLocationOperationalParametersEndpoint(locationId),
      'Unable to load Material-Location operational parameters.',
    );
  }

  public async saveClusterParameter(request: CommunityClusterOperationalParameterSaveRequest): Promise<void> {

    await this.saveBoolean(clusterOperationalParametersEndpoint, request, 'Unable to save Location Cluster operational parameters.');
  }

  public async saveMaterialParameter(request: CommunityMaterialOperationalParameterSaveRequest): Promise<void> {

    await this.saveBoolean(materialOperationalParametersEndpoint, request, 'Unable to save Material operational parameters.');
  }

  public async saveMaterialLocationParameter(request: CommunityMaterialLocationOperationalParameterSaveRequest): Promise<void> {

    await this.saveBoolean(
      '/api/secured/configs/parametros/materialLocation',
      request,
      'Unable to save Material-Location operational parameters.',
    );
  }

  private async readSnapshot<T>(endpoint: string, fallback: string): Promise<T> {

    try {
      return await this.httpClient.request<T>(endpoint);
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }

  private async saveBoolean(endpoint: string, request: object, fallback: string): Promise<void> {

    try {
      const saved = await this.httpClient.request<boolean>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (saved !== true) {
        throw new Error('The Community server rejected the requested operational-parameter save.');
      }
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
