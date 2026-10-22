export { decodeParquetDocument, decodeParquetRecords } from './parquet-records.js';
export type { ParquetDataDocument } from './parquet-records.js';
export type DataResponseFormat = 'json' | 'arrow' | 'parquet';
export interface DataDocument<T extends Record<string, unknown> = Record<string, unknown>> {
    records: T[];
    metadata: ReadonlyMap<string, string>;
}
export interface DataResponseOptions {
    /** Fallback only when Content-Type is absent; the actual HTTP representation wins. */
    format?: DataResponseFormat;
    /** Fail before reading a successful body if the server did not honor this format. */
    strictFormat?: boolean;
}
export declare function decodeJsonData<T = unknown>(payload: string | ArrayBuffer | Uint8Array | unknown): T;
/** Restores the same root shape written by the generic Spring codec. */
export declare function restoreDataDocument<T>(document: DataDocument): T;
export declare function decodeDataPayload<T = unknown>(payload: string | ArrayBuffer | Uint8Array | unknown, format?: DataResponseFormat): Promise<T>;
/** One reusable HTTP boundary for reports, grids and other DTO consumers. */
export declare function decodeDataResponse<T = unknown>(response: Response, options?: DataResponseOptions | DataResponseFormat): Promise<T>;
//# sourceMappingURL=data-format-reader.d.ts.map