/**
 * Summary shape returned by the Community Supply Plan catalog.
 *
 * The catalog is intentionally a lifecycle surface only. It carries the
 * selected DTO back to the delete endpoint without reconstructing its
 * demand-plan relationship or any Supply Planning result locally.
 */
export interface SupplyPlan {
  supplyPlanId: number;
  supplyNetworkVersionId: string | null;
  executionProfileId: string | null;
  description: string | null;
  bucketSize: string | null;
  timeOfExecution: string | null;
  beginsOn: string | null;
  generatedBy: string | null;
  demandPlanDTO?: unknown;
}

/**
 * Persisted calendar bucket returned only for the selected Supply Plan.
 *
 * Dates remain backend values: this catalog never rebuilds a calendar from a
 * plan header, a bucket name, or the current browser clock.
 */
export interface SupplyPlanPeriod {
  periodIndex: number;
  label: string;
  bucketSize: string;
  referenceDate: string;
  startDateTime: string;
  endDateTime: string;
}

/**
 * Minimal administrative selector published by the existing Community Supply
 * Planning profile catalog. The catalog does not define a plan bucket.
 */
export interface SupplyPlanningExecutionProfile {
  id: string;
  description?: string | null;
}

/** Minimal persisted Demand Plan identity used as the forecast source. */
export interface SupplyPlanDemandPlanOption {
  demandPlanId: number;
  description?: string | null;
}

/** Minimal Supply Network version identity accepted by a new Supply Plan. */
export interface SupplyNetworkVersionOption {
  id: string;
  description?: string | null;
}

/**
 * Buckets accepted by the legacy Community Supply Planning command.
 *
 * The Supply execution-profile catalog intentionally does not publish this
 * setting, so it remains an explicit command parameter rather than a browser
 * inference from the Demand Plan or another configuration object.
 */
export type SupplyPlanBucket = 'Yearly' | 'Monthly' | 'Weekly' | 'Daily' | '8-hour turn' | 'Hourly';

/** Exact Community payload for creating one new heuristic Supply Plan. */
export interface CommunitySupplyPlanGenerationRequest {
  executionProfileId: string;
  demandPlanId: number;
  supplyNetworkVersionId: string;
  descricaoSupplyPlan: string;
  tamanhoBucket: SupplyPlanBucket;
  periodoReferencia: string;
}

/** Synchronous response returned after the immediate Community task finishes. */
export interface CommunitySupplyPlanGenerationResponse {
  message?: string;
  status?: number;
}

interface BackendResponse {
  message: string;
  status: number;
}

export type SupplyPlanDeleteResponse = BackendResponse;

/** Canonical Community endpoints for the Supply Plan catalog lifecycle. */
export const SUPPLY_PLAN_ENDPOINTS = {
  list: '/api/secured/planning/supply',
  delete: '/api/secured/planning/supply/delete',
  constrainedExecution: '/api/secured/planning/constrained/execute',
  executionProfiles: '/api/secured/supplyplanexecutionprofile',
  demandPlans: '/api/secured/planning/demand/demandplan',
  supplyNetworkVersions: '/api/secured/supplynetwork/version',
  generate: '/api/secured/planning/supply/execute',
} as const;

/**
 * Keeps the original selected DTOs intact. The backend owns relationship
 * cleanup and rejects plans that still have protected links.
 */
export function buildSupplyPlanDeleteRequest(selectedSupplyPlans: SupplyPlan[]): SupplyPlan[] {

  return selectedSupplyPlans;

}

/** Returns the only reference-period syntax accepted by each exposed bucket. */
export function getSupplyPlanReferencePeriodFormat(bucket: SupplyPlanBucket | ''): string | null {

  switch (bucket) {
    case 'Yearly': return 'YYYY';
    case 'Monthly': return 'YYYYMM';
    case 'Weekly': return 'YYYYWW';
    case 'Daily': return 'YYYY-MM-DD';
    case '8-hour turn':
    case 'Hourly': return 'YYYY-MM-DDTHH:00:00';
    default: return null;
  }

}

/**
 * Validates syntax only. Calendar validity, profile compatibility and all
 * planning semantics remain owned by the canonical Community command.
 */
export function isValidSupplyPlanReferencePeriod(
  referencePeriod: string,
  bucket: SupplyPlanBucket | '',
): boolean {

  const value = referencePeriod.trim();

  switch (bucket) {
    case 'Yearly': return /^\d{4}$/.test(value);
    case 'Monthly': return /^\d{4}(0[1-9]|1[0-2])$/.test(value);
    case 'Weekly': return /^\d{4}(0[1-9]|[1-4]\d|5[0-3])$/.test(value);
    case 'Daily': return isValidIsoDate(value);
    case '8-hour turn':
    case 'Hourly': return isValidIsoDateTime(value);
    default: return false;
  }

}

/** Builds a new-plan command without copy, starting-stock or Enterprise fields. */
export function buildCommunitySupplyPlanGenerationRequest(input: {
  executionProfileId: string;
  demandPlanId: number;
  supplyNetworkVersionId: string;
  description: string;
  bucket: SupplyPlanBucket;
  referencePeriod: string;
}): CommunitySupplyPlanGenerationRequest {

  return {
    executionProfileId: input.executionProfileId,
    demandPlanId: input.demandPlanId,
    supplyNetworkVersionId: input.supplyNetworkVersionId,
    descricaoSupplyPlan: input.description.trim(),
    tamanhoBucket: input.bucket,
    periodoReferencia: input.referencePeriod.trim(),
  };

}

/** Validates calendar dates without converting the selected reference value. */
function isValidIsoDate(value: string): boolean {

  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;

}

/** Validates the legacy timestamp syntax used by hourly and turn Supply buckets. */
function isValidIsoDateTime(value: string): boolean {

  if (!/^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))T([01]\d|2[0-3]):00:00$/.test(value)) {
    return false;
  }

  return isValidIsoDate(value.slice(0, 10));

}
