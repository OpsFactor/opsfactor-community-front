/** Minimal transport contract supplied by each edition host. */
export type AuthenticatedRequest = (path: string, options?: RequestInit) => Promise<Response>;

/** Identity fields shared by the legacy Demand Plan history and deletion endpoints. */
export interface DemandPlanReference {
  demandPlanId: number;
}

/** Identity field shared by the legacy Supply Plan history and deletion endpoints. */
export interface SupplyPlanReference {
  supplyPlanId: number;
}

async function readResponseMessage<TPlan>(
  response: Response,
  fallback: string,
): Promise<string> {

  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: string } | TPlan[];
      return Array.isArray(payload) ? fallback : payload.message?.trim() || fallback;
    }

    return (await response.text()).trim() || fallback;
  } catch {
    return fallback;
  }

}

/**
 * Creates the edition-neutral legacy Demand Plan history transport.
 *
 * Authentication and CSRF policy deliberately remain injected by the host;
 * this Community package owns only the stable endpoint semantics and response
 * validation that both Community and Enterprise execute.
 */
export function createPlanHistoryService<TPlan>(
  authenticatedRequest: AuthenticatedRequest,
  options: {
    historyPath: string;
    deletePath: string;
    collectionLabel: string;
    deletionSuccessMessage: string;
  },
) {

  return {
    async fetchPlanHistory(): Promise<TPlan[]> {

      const response = await authenticatedRequest(options.historyPath);
      if (!response.ok) {
        throw new Error(await readResponseMessage<TPlan>(response, `Unable to load ${options.collectionLabel} (${response.status})`));
      }
      return (await response.json()) as TPlan[];
    },

    async deletePlans(plans: TPlan[]): Promise<string> {

      const response = await authenticatedRequest(options.deletePath, {
        method: 'POST',
        body: JSON.stringify(plans),
      });
      if (!response.ok) {
        throw new Error(await readResponseMessage<TPlan>(response, `Unable to delete ${options.collectionLabel} (${response.status})`));
      }
      return readResponseMessage<TPlan>(response, options.deletionSuccessMessage);
    },
  };

}

/** Community-owned specialization for the legacy Demand Plan history contract. */
export function createDemandPlansService<TPlan extends DemandPlanReference>(authenticatedRequest: AuthenticatedRequest) {

  return createPlanHistoryService<TPlan>(authenticatedRequest, {
    historyPath: '/api/secured/planning/demand/demandplan',
    deletePath: '/api/secured/planning/demand/delete',
    collectionLabel: 'demand plans',
    deletionSuccessMessage: 'Demand plan deletion request submitted.',
  });

}

/** Community-owned specialization for the legacy Supply Plan history contract. */
export function createSupplyPlansService<TPlan extends SupplyPlanReference>(authenticatedRequest: AuthenticatedRequest) {

  return createPlanHistoryService<TPlan>(authenticatedRequest, {
    historyPath: '/api/secured/planning/supply',
    deletePath: '/api/secured/planning/supply/delete',
    collectionLabel: 'supply plans',
    deletionSuccessMessage: 'Supply plan deletion request submitted.',
  });

}
