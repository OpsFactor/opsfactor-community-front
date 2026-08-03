/** Reads a useful platform error without exposing an HTML login response as an API message. */
async function readErrorResponseMessage(response, fallback) {
    const contentType = response.headers.get('content-type') ?? '';
    try {
        if (contentType.includes('application/json')) {
            const payload = (await response.json());
            if (!Array.isArray(payload)) {
                const message = payload.message?.trim();
                const error = payload.error?.trim();
                return message || error || fallback;
            }
        }
        const text = (await response.text()).trim();
        if (contentType.includes('text/html') || /^<!doctype html/i.test(text) || /^<html/i.test(text)) {
            return fallback;
        }
        return text || fallback;
    }
    catch {
        return fallback;
    }
}
/**
 * Creates the historical JSON/text facades from the host HTTP policy.
 *
 * This preserves each edition's public service signatures while avoiding a
 * second implementation of status handling and response-message decoding.
 */
export function createJsonRequestService(transport) {
    async function requestJson(path, options) {
        const response = await transport.httpRequest(path, options);
        if (!response.ok) {
            throw transport.createError({
                status: response.status,
                message: await readErrorResponseMessage(response, `Request failed for ${path} (${response.status})`),
            });
        }
        if (response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    async function requestText(path, options) {
        const response = await transport.httpRequest(path, options);
        if (!response.ok) {
            throw transport.createError({
                status: response.status,
                message: await readErrorResponseMessage(response, `Request failed for ${path} (${response.status})`),
            });
        }
        if (response.status === 204) {
            return '';
        }
        return response.text();
    }
    return { requestJson, requestText };
}
//# sourceMappingURL=json-request.service.js.map