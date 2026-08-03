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

/** Reads a useful platform error without exposing an HTML login response as an API message. */
async function readErrorResponseMessage(response: Response, fallback: string): Promise<string> {

  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { message?: string; error?: string } | unknown[];

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
  } catch {
    return fallback;
  }

}

/**
 * Creates the historical JSON/text facades from the host HTTP policy.
 *
 * This preserves each edition's public service signatures while avoiding a
 * second implementation of status handling and response-message decoding.
 */
export function createJsonRequestService<RequestOptions>(transport: JsonRequestTransport<RequestOptions>) {

  async function requestJson<ResponsePayload>(path: string, options: RequestOptions): Promise<ResponsePayload> {

    const response = await transport.httpRequest(path, options);

    if (!response.ok) {
      throw transport.createError({
        status: response.status,
        message: await readErrorResponseMessage(response, `Request failed for ${path} (${response.status})`),
      });
    }

    if (response.status === 204) {
      return undefined as ResponsePayload;
    }

    return response.json() as Promise<ResponsePayload>;

  }

  async function requestText(path: string, options: RequestOptions): Promise<string> {

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
