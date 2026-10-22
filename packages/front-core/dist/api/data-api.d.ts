import { type DataResponseFormat } from './data-format-reader.js';
import { type DataCsvOptions, type DataExportFormat } from './data-export-format.js';
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
export declare function createDataApi(request: DataApiTransport): {
    apiData: <T = unknown>(path: string, options?: ApiDataOptions) => Promise<T>;
    apiFile: {
        (path: string, options: ApiFileDownloadOptions): Promise<ApiFileDownloadResult>;
        <T = unknown>(path: string, options: ApiFileUploadOptions): Promise<T>;
    };
};
//# sourceMappingURL=data-api.d.ts.map