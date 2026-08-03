import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type {
  CommunityBillOfMaterials,
  CommunityBillOfMaterialsComponent,
  CommunityProductionResource,
  CommunityProductionResourceSaveRequest,
  CommunityRouting,
  CommunityRoutingBomInconsistency,
  CommunityRoutingOperation,
} from './production-master-data.types';

/** Preserves the backend explanation for a read request without adding a local fallback dataset. */
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
 * Read-only Community production master-data transport.
 *
 * Each method maps exactly one catalog endpoint. The page decides when to
 * invoke it so unrelated, potentially large lists are never preloaded or
 * joined in the browser.
 */
export class ProductionMasterDataService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  public async getRoutings(): Promise<CommunityRouting[]> {

    return this.getCatalog('/api/secured/production/routing', 'Unable to load routings.');
  }

  public async getRoutingOperations(): Promise<CommunityRoutingOperation[]> {

    return this.getCatalog('/api/secured/production/routingoperation', 'Unable to load routing operations.');
  }

  public async getBillsOfMaterials(): Promise<CommunityBillOfMaterials[]> {

    return this.getCatalog('/api/secured/production/billofmaterials', 'Unable to load bills of materials.');
  }

  public async getBillOfMaterialsComponents(): Promise<CommunityBillOfMaterialsComponent[]> {

    return this.getCatalog('/api/secured/production/billofmaterialscomponents', 'Unable to load bill of materials components.');
  }

  public async getProductionResources(): Promise<CommunityProductionResource[]> {

    return this.getCatalog('/api/secured/production/productionresource', 'Unable to load production resources.');
  }

  /** Saves one basic resource only; scheduling-related master data has no Community transport here. */
  public async saveProductionResource(request: CommunityProductionResourceSaveRequest): Promise<string> {

    try {
      return await this.httpClient.request<string>('/api/secured/production/productionresource/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to save the production resource.');
    }
  }

  public async getRoutingBomInconsistencies(): Promise<CommunityRoutingBomInconsistency[]> {

    return this.getCatalog('/api/secured/production/routing/inconsistencies', 'Unable to load routing/BOM inconsistencies.');
  }

  private async getCatalog<T>(path: string, fallback: string): Promise<T[]> {

    try {
      return await this.httpClient.request<T[]>(path);
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
