/**
 * Minimal HTTP boundary shared by both product editions.
 *
 * Authentication is intentionally injected by the in-memory strategy instead
 * of being persisted in browser storage or inferred from the edition.
 */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly responseText: string;

  public constructor(
    status: number,
    responseText: string,
  ) {
    super(`The API request failed with status ${status}.`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.responseText = responseText;
  }
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

export class HttpClient {
  private readonly getAuthorizationHeader: () => string | null;

  public constructor(
    getAuthorizationHeader: () => string | null,
  ) {
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
  private createHeaders(requestHeaders: HeadersInit | undefined, defaultAccept: string): Headers {
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

  public async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const headers = this.createHeaders(options.headers, 'application/json');

    const response = await fetch(path, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(response.status, await response.text());
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const responseText = await response.text();
    if (responseText.length === 0) {
      return undefined as T;
    }

    /*
     * Platform endpoints intentionally return short text confirmations for a
     * few configuration commands. Do not make those successful commands look
     * like client failures by unconditionally parsing their body as JSON.
     */
    if (!response.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
      return responseText as T;
    }

    /*
     * Spring can negotiate application/json for ResponseEntity<String> while
     * still writing the unquoted confirmation text. Treat that successful,
     * non-JSON scalar as text; object/array endpoints still parse normally.
     */
    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return responseText as T;
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
  public async requestBlob(path: string, options: ApiRequestOptions = {}): Promise<ApiBlobResponse> {
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
