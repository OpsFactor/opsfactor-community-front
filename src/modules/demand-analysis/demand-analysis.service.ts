import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type {
  DemandAnalysisConfiguration,
  DemandAnalysisExecutionProfile,
  DemandAnalysisLocationCluster,
  DemandAnalysisMaterialCluster,
  DemandAnalysisSimulation,
  DemandAnalysisSimulationRequest,
} from './demand-analysis.types';

/** Preserves the backend functional explanation when an operational request is rejected. */
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
 * Community Demand Analysis transport. It owns only the profile/cluster
 * configuration and explicit forecast simulation, never Demand Plan creation.
 */
export class DemandAnalysisService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getExecutionProfiles(): Promise<DemandAnalysisExecutionProfile[]> {

    try {
      return await this.httpClient.request<DemandAnalysisExecutionProfile[]>('/api/secured/demandplanexecutionprofile');
    } catch (error) {
      throw toBackendError(error, 'Unable to load Demand Planning execution profiles.');
    }
  }

  public async getMaterialClusters(): Promise<DemandAnalysisMaterialCluster[]> {

    try {
      return await this.httpClient.request<DemandAnalysisMaterialCluster[]>('/api/secured/materialclustering');
    } catch (error) {
      throw toBackendError(error, 'Unable to load material clusters.');
    }
  }

  public async getLocationClusters(): Promise<DemandAnalysisLocationCluster[]> {

    try {
      return await this.httpClient.request<DemandAnalysisLocationCluster[]>('/api/secured/locationclustering');
    } catch (error) {
      throw toBackendError(error, 'Unable to load location clusters.');
    }
  }

  /** Loads defaults or persisted Community configuration only after the three selectors are complete. */
  public async getConfiguration(
    executionProfileId: string,
    locationClusterId: number,
    materialClusterId: number,
  ): Promise<DemandAnalysisConfiguration> {

    try {
      return await this.httpClient.request<DemandAnalysisConfiguration>(
        `/api/secured/demandPlanConfiguration/get/${encodeURIComponent(executionProfileId)}/${encodeURIComponent(String(locationClusterId))}/${encodeURIComponent(String(materialClusterId))}`,
      );
    } catch (error) {
      throw toBackendError(error, 'Unable to load Demand Analysis configuration.');
    }
  }

  /** Simulates the current local configuration once; it never persists a Demand Plan. */
  public async simulate(
    request: DemandAnalysisSimulationRequest,
  ): Promise<DemandAnalysisSimulation> {

    try {
      return await this.httpClient.request<DemandAnalysisSimulation>('/api/secured/demandPlanConfiguration/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to simulate the Demand Planning forecast.');
    }
  }

  /** Persists the selected Community cluster-level configuration after user confirmation. */
  public async save(configuration: DemandAnalysisConfiguration): Promise<string> {

    try {
      return await this.httpClient.request<string>('/api/secured/demandPlanConfiguration/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuration),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save Demand Analysis configuration.');
    }
  }
}
