/** The three existing Community diagnostics; their contracts intentionally remain separate. */
export type UomConversionGapMode = 'demand-planning' | 'supply-planning' | 'deployment';

/** Minimal selector shape shared by the existing profile catalogs. */
export interface ExecutionProfileOption {
  id: string;
  description?: string | null;
  bucketSize?: string | null;
}

/** Existing Supply Network Version selector returned by the Community catalog. */
export interface SupplyNetworkVersionOption {
  id: string;
  description?: string | null;
}

/** Existing Demand Plan selector. Only its persisted identity is needed by SNP. */
export interface DemandPlanOption {
  demandPlanId: number;
  description?: string | null;
}

/** Existing Supply Plan selector. Only its persisted identity is needed by Deployment. */
export interface SupplyPlanOption {
  supplyPlanId: number;
  description?: string | null;
}

/** Raw Community DTO for a conversion that prevents one planning flow. */
export interface UomConversionGap {
  originUnitOfMeasure?: string | null;
  targetUnitOfMeasure?: string | null;
  locationId?: string | null;
  materialId?: string | null;
  originTask?: string | null;
  targetTask?: string | null;
  originConversionRequirementType?: string | null;
  originConversionRequirementId?: string | null;
  targetConversionRequirementType?: string | null;
  targetConversionRequirementId?: string | null;
}

/** Detail returned only for the selected material and UOM pair. */
export interface UomConversionDetail {
  materialId?: string | null;
  originUomId?: string | null;
  targetUomId?: string | null;
  conversionCoefficient?: number | null;
  stepByStep?: string | null;
}

export const UOM_CONVERSION_GAP_ENDPOINTS = {
  demandPlanningProfiles: '/api/secured/demandplanexecutionprofile',
  supplyPlanningProfiles: '/api/secured/supplyplanexecutionprofile',
  supplyNetworkVersions: '/api/secured/supplynetwork/version',
  demandPlans: '/api/secured/planning/demand/demandplan',
  supplyPlans: '/api/secured/planning/supply',
} as const;

/** Formats accepted by the existing calendar adapter for each selected bucket. */
export function getReferencePeriodFormat(bucketSize: string | null | undefined): string | null {

  switch (bucketSize) {
    case 'Yearly': return 'YYYY';
    case 'Monthly': return 'YYYYMM';
    case 'Weekly': return 'YYYYWW';
    case 'Daily': return 'YYYY-MM-DD';
    default: return null;
  }

}

/** Validates syntax only; calendars and profile relationships remain backend-owned. */
export function isValidReferencePeriod(
  referencePeriod: string,
  bucketSize: string | null | undefined,
): boolean {

  const value = referencePeriod.trim();

  switch (bucketSize) {
    case 'Yearly': return /^\d{4}$/.test(value);
    case 'Monthly': return /^\d{4}(0[1-9]|1[0-2])$/.test(value);
    case 'Weekly': return /^\d{4}(0[1-9]|[1-4]\d|5[0-3])$/.test(value);
    case 'Daily': {
      if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
        return false;
      }

      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
    }
    default: return false;
  }

}

/** Builds the one DP diagnostic route after its selected profile defines the bucket. */
export function buildDemandPlanningUomConversionGapsEndpoint(
  demandPlanningExecutionProfileId: string,
  referencePeriod: string,
): string {

  const profileId = demandPlanningExecutionProfileId.trim();
  const period = referencePeriod.trim();
  if (profileId.length === 0 || period.length === 0) {
    throw new Error('A Demand Planning profile and reference period are required.');
  }

  return `/api/secured/alerts/uomconversiongaps/dp/${encodeURIComponent(profileId)}/${encodeURIComponent(period)}`;

}

/** Builds the SNP diagnostic route from every explicit selection; no relationship is inferred in the browser. */
export function buildSupplyPlanningUomConversionGapsEndpoint(input: {
  referencePeriod: string;
  bucketSize: string;
  supplyNetworkVersionId: string;
  supplyPlanningExecutionProfileId: string;
  demandPlanId: number;
}): string {

  const referencePeriod = input.referencePeriod.trim();
  const bucketSize = input.bucketSize.trim();
  const supplyNetworkVersionId = input.supplyNetworkVersionId.trim();
  const supplyPlanningExecutionProfileId = input.supplyPlanningExecutionProfileId.trim();
  if (!referencePeriod || !bucketSize || !supplyNetworkVersionId || !supplyPlanningExecutionProfileId
    || !Number.isInteger(input.demandPlanId) || input.demandPlanId <= 0) {
    throw new Error('Reference period, bucket, Supply Network, Supply profile, and Demand Plan are required.');
  }

  return `/api/secured/alerts/uomconversiongaps/snp/${encodeURIComponent(referencePeriod)}/${encodeURIComponent(bucketSize)}/${encodeURIComponent(supplyNetworkVersionId)}/${encodeURIComponent(supplyPlanningExecutionProfileId)}/${input.demandPlanId}`;

}

/** Builds the Deployment diagnostic route for one persisted Supply Plan. */
export function buildDeploymentUomConversionGapsEndpoint(supplyPlanId: number): string {

  if (!Number.isInteger(supplyPlanId) || supplyPlanId <= 0) {
    throw new Error('A Supply Plan is required.');
  }

  return `/api/secured/alerts/uomconversiongaps/deployment/${supplyPlanId}`;

}

/**
 * Builds only the material-specific detail route. The two-segment global
 * overload is intentionally never exposed by this Community workspace.
 */
export function buildMaterialUomConversionDetailEndpoint(gap: UomConversionGap): string {

  const materialId = gap.materialId?.trim();
  const originUomId = gap.originUnitOfMeasure?.trim();
  const targetUomId = gap.targetUnitOfMeasure?.trim();
  if (!materialId || !originUomId || !targetUomId) {
    throw new Error('Material, origin UOM, and target UOM are required for conversion detail.');
  }

  return `/api/secured/unitofmeasure/conversiondetail/${encodeURIComponent(materialId)}/${encodeURIComponent(originUomId)}/${encodeURIComponent(targetUomId)}`;

}
