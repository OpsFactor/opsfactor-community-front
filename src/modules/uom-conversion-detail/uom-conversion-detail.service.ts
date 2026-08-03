import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type { UomConversionDetail } from '../uom-conversion-gaps/uom-conversion-gaps.types';

/** Builds the same three-segment, material-specific route used by UOM Gaps. */
function buildMaterialUomConversionDetailEndpoint(input: {
  materialId: string;
  originUomId: string;
  targetUomId: string;
}): string {

  const materialId = input.materialId.trim();
  const originUomId = input.originUomId.trim();
  const targetUomId = input.targetUomId.trim();
  if (!materialId || !originUomId || !targetUomId) {
    throw new Error('Material, origin UOM, and target UOM are required for conversion detail.');
  }

  return `/api/secured/unitofmeasure/conversiondetail/${encodeURIComponent(materialId)}/${encodeURIComponent(originUomId)}/${encodeURIComponent(targetUomId)}`;

}

/** Keeps the operational explanation returned by the canonical conversion endpoint. */
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
 * Read-only manual inspector for one material-specific conversion path.
 *
 * <p>The response type remains shared with UOM Gaps. The small local URL
 * builder keeps the Node contract runner independent of runtime TypeScript
 * module resolution while preserving the same three required identifiers.</p>
 */
export class UomConversionDetailInspectorService {

  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;

  }

  /** Reads one explicit material/UOM path without loading a selector catalog. */
  public async getDetail(input: {
    materialId: string;
    originUomId: string;
    targetUomId: string;
  }): Promise<UomConversionDetail> {

    const endpoint = buildMaterialUomConversionDetailEndpoint({
      materialId: input.materialId,
      originUomId: input.originUomId,
      targetUomId: input.targetUomId,
    });

    try {
      return await this.httpClient.request<UomConversionDetail>(endpoint);
    } catch (error) {
      throw toBackendError(error, 'Unable to inspect the material-specific UOM conversion.');
    }

  }

}
