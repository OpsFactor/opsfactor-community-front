async function readResponseMessage(response, fallback) {
    const contentType = response.headers.get('content-type') ?? '';
    try {
        if (contentType.includes('application/json')) {
            const payload = (await response.json());
            return Array.isArray(payload) ? fallback : payload.message?.trim() || fallback;
        }
        return (await response.text()).trim() || fallback;
    }
    catch {
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
export function createPlanHistoryService(authenticatedRequest, options) {
    return {
        async fetchPlanHistory() {
            const response = await authenticatedRequest(options.historyPath);
            if (!response.ok) {
                throw new Error(await readResponseMessage(response, `Unable to load ${options.collectionLabel} (${response.status})`));
            }
            return (await response.json());
        },
        async deletePlans(plans) {
            const response = await authenticatedRequest(options.deletePath, {
                method: 'POST',
                body: JSON.stringify(plans),
            });
            if (!response.ok) {
                throw new Error(await readResponseMessage(response, `Unable to delete ${options.collectionLabel} (${response.status})`));
            }
            return readResponseMessage(response, options.deletionSuccessMessage);
        },
    };
}
/** Community-owned specialization for the legacy Demand Plan history contract. */
export function createDemandPlansService(authenticatedRequest) {
    return createPlanHistoryService(authenticatedRequest, {
        historyPath: '/api/secured/planning/demand/demandplan',
        deletePath: '/api/secured/planning/demand/delete',
        collectionLabel: 'demand plans',
        deletionSuccessMessage: 'Demand plan deletion request submitted.',
    });
}
/** Community-owned specialization for the legacy Supply Plan history contract. */
export function createSupplyPlansService(authenticatedRequest) {
    return createPlanHistoryService(authenticatedRequest, {
        historyPath: '/api/secured/planning/supply',
        deletePath: '/api/secured/planning/supply/delete',
        collectionLabel: 'supply plans',
        deletionSuccessMessage: 'Supply plan deletion request submitted.',
    });
}
//# sourceMappingURL=demand-plans.service.js.map