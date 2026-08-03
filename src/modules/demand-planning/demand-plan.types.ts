/** Summary shape returned by the Community Demand Planning history endpoint. */
export interface DemandPlan {
  demandPlanId: number;
  description: string | null;
  executionProfileId: string | null;
  bucketSize: string | null;
  timeOfExecution: string | null;
  referencePeriod: string | null;
  beginsOn: string | null;
  generatedBy: string | null;
}

/**
 * Persisted calendar bucket returned for one selected Demand Plan.
 *
 * This is a read-only catalog used by the Community plan history drawer. It
 * deliberately carries dates as returned by the API; the browser does not
 * rebuild a calendar or infer a period from the summary header.
 */
export interface DemandPlanPeriod {
  periodIndex: number;
  label: string;
  bucketSize: string;
  referenceDate: string;
  startDateTime: string;
  endDateTime: string;
}

/**
 * Read-only subset returned by the Community execution-profile catalog.
 *
 * The generation form uses the profile only as command input and to validate
 * the reference-period syntax locally. It never edits profile configuration.
 */
export interface DemandPlanningExecutionProfile {
  id: string;
  description: string | null | undefined;
  bucketSize: string | null | undefined;
}

/** Exact, minimal Community command accepted by Demand Planning generation. */
export interface CommunityDemandPlanGenerationRequest {
  descricao: string;
  executionProfileId: string;
  periodoReferencia: string;
}

/** Synchronous command response returned by the Community scheduler. */
export interface CommunityDemandPlanGenerationResponse {
  message?: string;
  status?: number;
}

interface BackendResponse {
  message: string;
  status: number;
}

export type DemandPlanDeleteResponse = BackendResponse;

/**
 * Formats supported by the Demand Planning command. Operational buckets that
 * do not map to a persisted Demand Plan reference period stay unavailable in
 * this screen instead of receiving a browser-specific convention.
 */
export function getDemandPlanReferencePeriodFormat(bucketSize: string | null | undefined): string | null {

  switch (bucketSize) {
    case 'Yearly': return 'YYYY';
    case 'Monthly': return 'YYYYMM';
    case 'Weekly': return 'YYYYWW';
    case 'Daily': return 'YYYY-MM-DD';
    default: return null;
  }

}

/**
 * Validates only syntax before submitting the canonical command. The backend
 * remains responsible for calendar, profile and planning-domain validation.
 */
export function isValidDemandPlanReferencePeriod(
  referencePeriod: string,
  bucketSize: string | null | undefined,
): boolean {

  const value = referencePeriod.trim();

  switch (bucketSize) {
    case 'Yearly':
      return /^\d{4}$/.test(value);
    case 'Monthly':
      return /^\d{4}(0[1-9]|1[0-2])$/.test(value);
    case 'Weekly':
      return /^\d{4}(0[1-9]|[1-4]\d|5[0-3])$/.test(value);
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
    default:
      return false;
  }

}

/** Builds the one Community command without Enterprise reference-plan fields. */
export function buildCommunityDemandPlanGenerationRequest(input: {
  description: string;
  executionProfileId: string;
  referencePeriod: string;
}): CommunityDemandPlanGenerationRequest {

  return {
    descricao: input.description.trim(),
    executionProfileId: input.executionProfileId,
    periodoReferencia: input.referencePeriod.trim(),
  };

}
