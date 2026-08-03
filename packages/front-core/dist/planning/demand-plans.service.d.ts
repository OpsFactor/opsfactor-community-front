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
/**
 * Creates the edition-neutral legacy Demand Plan history transport.
 *
 * Authentication and CSRF policy deliberately remain injected by the host;
 * this Community package owns only the stable endpoint semantics and response
 * validation that both Community and Enterprise execute.
 */
export declare function createPlanHistoryService<TPlan>(authenticatedRequest: AuthenticatedRequest, options: {
    historyPath: string;
    deletePath: string;
    collectionLabel: string;
    deletionSuccessMessage: string;
}): {
    fetchPlanHistory(): Promise<TPlan[]>;
    deletePlans(plans: TPlan[]): Promise<string>;
};
/** Community-owned specialization for the legacy Demand Plan history contract. */
export declare function createDemandPlansService<TPlan extends DemandPlanReference>(authenticatedRequest: AuthenticatedRequest): {
    fetchPlanHistory(): Promise<TPlan[]>;
    deletePlans(plans: TPlan[]): Promise<string>;
};
/** Community-owned specialization for the legacy Supply Plan history contract. */
export declare function createSupplyPlansService<TPlan extends SupplyPlanReference>(authenticatedRequest: AuthenticatedRequest): {
    fetchPlanHistory(): Promise<TPlan[]>;
    deletePlans(plans: TPlan[]): Promise<string>;
};
//# sourceMappingURL=demand-plans.service.d.ts.map