/**
 * Minimal HTTP boundary shared by both product editions.
 *
 * Authentication is intentionally injected by the in-memory strategy instead
 * of being persisted in browser storage or inferred from the edition.
 */
export class ApiRequestError extends Error {
    status;
    responseText;
    constructor(status, responseText) {
        super(`The API request failed with status ${status}.`);
        this.name = 'ApiRequestError';
        this.status = status;
        this.responseText = responseText;
    }
}
export class HttpClient {
    getAuthorizationHeader;
    constructor(getAuthorizationHeader) {
        this.getAuthorizationHeader = getAuthorizationHeader;
    }
    /**
     * Builds the common request headers for JSON and binary requests.
     *
     * The injected active-session authorization is the authoritative transport
     * credential. It therefore replaces a caller-provided Authorization value,
     * preventing page-level services from duplicating or accidentally diverging
     * from the edition authentication strategy.
     */
    createHeaders(requestHeaders, defaultAccept) {
        const headers = new Headers(requestHeaders);
        if (!headers.has('Accept')) {
            headers.set('Accept', defaultAccept);
        }
        const authorizationHeader = this.getAuthorizationHeader();
        if (authorizationHeader !== null) {
            headers.set('Authorization', authorizationHeader);
        }
        return headers;
    }
    async request(path, options = {}) {
        const headers = this.createHeaders(options.headers, 'application/json');
        const response = await fetch(path, {
            ...options,
            headers,
        });
        if (!response.ok) {
            throw new ApiRequestError(response.status, await response.text());
        }
        if (response.status === 204) {
            return undefined;
        }
        const responseText = await response.text();
        if (responseText.length === 0) {
            return undefined;
        }
        /*
         * Platform endpoints intentionally return short text confirmations for a
         * few configuration commands. Do not make those successful commands look
         * like client failures by unconditionally parsing their body as JSON.
         */
        if (!response.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
            return responseText;
        }
        /*
         * Spring can negotiate application/json for ResponseEntity<String> while
         * still writing the unquoted confirmation text. Treat that successful,
         * non-JSON scalar as text; object/array endpoints still parse normally.
         */
        try {
            return JSON.parse(responseText);
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                return responseText;
            }
            throw error;
        }
    }
    /**
     * Executes an authenticated download without interpreting its successful
     * body as JSON or text.
     *
     * Callers can use any HTTP verb and body supported by {@link ApiRequestOptions},
     * including POST exports. The shared client applies the same in-memory
     * authentication strategy used by ordinary API calls and maps failed HTTP
     * responses to {@link ApiRequestError} before exposing any binary content.
     */
    async requestBlob(path, options = {}) {
        const headers = this.createHeaders(options.headers, 'application/octet-stream, */*;q=0.8');
        const response = await fetch(path, {
            ...options,
            headers,
        });
        if (!response.ok) {
            throw new ApiRequestError(response.status, await response.text());
        }
        return {
            blob: await response.blob(),
            contentDisposition: response.headers.get('Content-Disposition'),
        };
    }
}
//# sourceMappingURL=http.js.map