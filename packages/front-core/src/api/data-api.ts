import { decodeDataResponse, decodeJsonData, type DataResponseFormat } from './data-format-reader.js';
import { assertDataExportContentType, dataImportContentType, dataExportDescriptor, dataExportQuery, type DataCsvOptions, type DataExportFormat } from './data-export-format.js';

/** The host owns authentication, CSRF and URL resolution; this layer owns representation. */
export interface DataApiTransportOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}
export type DataApiTransport = (path: string, options?: DataApiTransportOptions) => Promise<Response>;

export interface DataApiRequestOptions extends Omit<DataApiTransportOptions, 'body'> {
  /** Plain objects/arrays are JSON encoded; native fetch bodies are passed through. */
  body?: BodyInit | object | number | boolean | null;
}
export interface ApiDataOptions extends DataApiRequestOptions {
  /** Omitted means no format parameter is added to the request. */
  format?: DataResponseFormat;
}
export interface ApiFileDownloadOptions extends Omit<DataApiRequestOptions, 'mode'> {
  mode: 'download';
  format?: DataExportFormat;
  csvOptions?: DataCsvOptions;
  locale?: string;
}
export interface ApiFileUploadOptions extends Omit<DataApiRequestOptions, 'body' | 'mode'> {
  mode: 'upload';
  file: Blob;
  fileName?: string;
  /** Structured formats default to raw; spreadsheets default to the existing multipart contract. */
  uploadMode?: 'raw' | 'multipart';
  fileFormat?: 'json' | 'arrow' | 'parquet' | 'xlsx' | 'csv';
  fieldName?: string;
  fields?: Record<string, string | number | boolean>;
}
export type ApiFileOptions = ApiFileDownloadOptions | ApiFileUploadOptions;
export interface ApiFileDownloadResult {
  blob: Blob;
  contentType: string | null;
  contentDisposition: string | null;
}

/** Bind once per host to its existing authenticated client, never directly to global fetch. */
export function createDataApi(request: DataApiTransport) {

  /** Serialize only the small inbound JSON payload; successful binary responses never use JSON. */
  function prepare(options: DataApiRequestOptions, format?: DataExportFormat, csvOptions?: DataCsvOptions, locale?: string): DataApiTransportOptions {
    const { body, ...requestOptions } = options;
    const headers = new Headers(options.headers);
    let encodedBody: BodyInit | null | undefined;
    if (body == null || typeof body === 'string' || body instanceof FormData) {
      encodedBody = body;
    } else if (body instanceof Blob) {
      encodedBody = body;
      if (!headers.has('Content-Type')) headers.set('Content-Type', body.type || 'application/octet-stream');
    } else if (body instanceof URLSearchParams) {
      encodedBody = body;
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body) || body instanceof ReadableStream) {
      encodedBody = body as BodyInit;
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
    } else {
      encodedBody = JSON.stringify(body);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
    // Do not send format=json merely because JSON is the default decoder.
    // The host URL builder merges explicit query values without dropping existing filters.
    const query = format === undefined ? options.query : { ...options.query, ...dataExportQuery(format, csvOptions, locale) };
    if (format !== undefined) headers.set('Accept', dataExportDescriptor(format).mimeType);
    return { ...requestOptions, body: encodedBody, headers, query };
  }

  /** Fetch and decode a complete JSON/Arrow/Parquet document into its original DTO shape. */
  async function apiData<T = unknown>(path: string, options: ApiDataOptions = {}): Promise<T> {
    const { format, ...requestOptions } = options;
    requestOptions.signal?.throwIfAborted();
    const response = await request(path, prepare(requestOptions, format));
    requestOptions.signal?.throwIfAborted();
    const result = await decodeDataResponse<T>(response, { format, strictFormat: format !== undefined });
    requestOptions.signal?.throwIfAborted();
    return result;
  }

  /** Explicit direction avoids guessing from POST, which is also used for filtered downloads. */
  function apiFile(path: string, options: ApiFileDownloadOptions): Promise<ApiFileDownloadResult>;
  function apiFile<T = unknown>(path: string, options: ApiFileUploadOptions): Promise<T>;
  async function apiFile<T = unknown>(path: string, options: ApiFileOptions): Promise<ApiFileDownloadResult | T> {
    options.signal?.throwIfAborted();
    if (options.mode === 'upload') {
      const { mode, file, fileName, uploadMode, fileFormat, fieldName, fields, ...requestOptions } = options;
      const name = fileName ?? ('name' in file && typeof file.name === 'string' ? file.name : 'upload');
      const structuredType = fileFormat ? dataImportContentType(`file.${fileFormat}`) : dataImportContentType(name);
      const raw = uploadMode === 'raw' || (uploadMode !== 'multipart' && structuredType !== null);
      const headers = new Headers(requestOptions.headers);
      let body: Blob | FormData;
      if (raw) {
        if (fields && Object.keys(fields).length) throw new Error('Raw file uploads cannot include multipart fields; use query parameters or multipart mode.');
        body = file;
        if (!headers.has('Content-Type')) headers.set('Content-Type', structuredType ?? (file.type || 'application/octet-stream'));
      } else {
        body = new FormData();
        body.set(fieldName ?? 'file', file, name);
        for (const [key, value] of Object.entries(fields ?? {})) body.set(key, String(value));
      }
      // Output format is not inferred from the uploaded file. Confirmations keep their native JSON/text contract.
      const response = await request(path, prepare({ ...requestOptions, method: requestOptions.method ?? 'POST', headers, body }));
      options.signal?.throwIfAborted();
      if (!response.ok) await decodeDataResponse(response);
      const text = response.status === 204 ? '' : await response.text();
      options.signal?.throwIfAborted();
      if (!text.trim()) return null as T;
      if (response.headers.get('Content-Type')?.toLowerCase().includes('json')) {
        try { return decodeJsonData<T>(text); }
        catch (error) {
          // Legacy ResponseEntity<String> may be labeled JSON but contain an unquoted confirmation.
          // Malformed structured payloads remain explicit errors instead of being silently accepted.
          if (/^\s*[\[{"]/.test(text)) throw error;
        }
      }
      return text as T;
    }
    if (options.mode !== 'download') throw new Error('apiFile requires mode=download or mode=upload.');
    const { mode, format, csvOptions, locale, ...requestOptions } = options;
    const response = await request(path, prepare(requestOptions, format, csvOptions, locale));
    options.signal?.throwIfAborted();
    if (!response.ok) await decodeDataResponse(response);
    if (format !== undefined) assertDataExportContentType(response.headers.get('Content-Type') ?? '', format);
    const blob = await response.blob();
    options.signal?.throwIfAborted();
    return { blob, contentType: response.headers.get('Content-Type'), contentDisposition: response.headers.get('Content-Disposition') };
  }

  return { apiData, apiFile };
}
