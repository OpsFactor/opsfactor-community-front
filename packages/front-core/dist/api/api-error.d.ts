/**
 * Display-oriented API failure shared by both frontend editions.
 *
 * Unlike {@link ApiRequestError}, this error preserves the application
 * message supplied by the endpoint because existing page-level services use
 * it directly in user-facing feedback.
 */
export interface ApiErrorDetails {
    status: number;
    message: string;
    code?: string;
}
/** Represents an API failure already normalized for a page-level workflow. */
export declare class ApiError extends Error {
    readonly status: number;
    readonly code?: string;
    constructor(details: ApiErrorDetails);
}
//# sourceMappingURL=api-error.d.ts.map