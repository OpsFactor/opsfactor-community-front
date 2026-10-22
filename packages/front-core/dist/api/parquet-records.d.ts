export interface ParquetDataDocument<T extends Record<string, unknown> = Record<string, unknown>> {
    records: T[];
    metadata: ReadonlyMap<string, string>;
}
/** Reads one already downloaded Parquet file. It never issues range/network requests. */
export declare function decodeParquetDocument<T extends Record<string, unknown> = Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): Promise<ParquetDataDocument<T>>;
export declare function decodeParquetRecords<T extends Record<string, unknown> = Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): Promise<T[]>;
//# sourceMappingURL=parquet-records.d.ts.map