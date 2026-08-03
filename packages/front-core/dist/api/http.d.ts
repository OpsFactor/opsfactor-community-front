/**
 * Minimal HTTP boundary shared by both product editions.
 *
 * Authentication is intentionally injected by the in-memory strategy instead
 * of being persisted in browser storage or inferred from the edition.
 */
export declare class ApiRequestError extends Error {
    readonly status: number;
    readonly responseText: string;
    constructor(status: number, responseText: string);
}
export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
    body?: BodyInit | null;
    headers?: HeadersInit;
}
/**
 * Successful binary download returned by {@link HttpClient.requestBlob}.
 *
 * The transport header is preserved verbatim because endpoints may use it to
 * describe a server-selected filename or attachment policy. File-name parsing
 * deliberately stays with the edition-specific caller, which knows whether a
 * response represents a spreadsheet, report, or another product artifact.
 */
export interface ApiBlobResponse {
    blob: Blob;
    contentDisposition: string | null;
}
export declare class HttpClient {
    private readonly getAuthorizationHeader;
    constructor(getAuthorizationHeader: () => string | null);
    /**
     * Builds the common request headers for JSON and binary requests.
     *
     * The injected active-session authorization is the authoritative transport
     * credential. It therefore replaces a caller-provided Authorization value,
     * preventing page-level services from duplicating or accidentally diverging
     * from the edition authentication strategy.
     */
    private createHeaders;
    request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
    /**
     * Executes an authenticated download without interpreting its successful
     * body as JSON or text.
     *
     * Callers can use any HTTP verb and body supported by {@link ApiRequestOptions},
     * including POST exports. The shared client applies the same in-memory
     * authentication strategy used by ordinary API calls and maps failed HTTP
     * responses to {@link ApiRequestError} before exposing any binary content.
     */
    requestBlob(path: string, options?: ApiRequestOptions): Promise<ApiBlobResponse>;
}
//# sourceMappingURL=http.d.ts.map