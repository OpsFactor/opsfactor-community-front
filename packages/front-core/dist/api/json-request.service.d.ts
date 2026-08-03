/** Error payload expected by the legacy request facades in both editions. */
export interface JsonRequestErrorDetails {
    status: number;
    message: string;
    code?: string;
}
/**
 * Host adapter for the request policy that is intentionally edition-specific.
 * Community supplies Basic authorization; Enterprise supplies form-session and
 * CSRF behavior through its own `httpRequest` implementation.
 */
export interface JsonRequestTransport<RequestOptions> {
    httpRequest: (path: string, options: RequestOptions) => Promise<Response>;
    createError: (details: JsonRequestErrorDetails) => Error;
}
/**
 * Creates the historical JSON/text facades from the host HTTP policy.
 *
 * This preserves each edition's public service signatures while avoiding a
 * second implementation of status handling and response-message decoding.
 */
export declare function createJsonRequestService<RequestOptions>(transport: JsonRequestTransport<RequestOptions>): {
    requestJson: <ResponsePayload>(path: string, options: RequestOptions) => Promise<ResponsePayload>;
    requestText: (path: string, options: RequestOptions) => Promise<string>;
};
//# sourceMappingURL=json-request.service.d.ts.map