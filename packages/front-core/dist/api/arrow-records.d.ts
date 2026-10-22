/** Arrow document data plus the small schema metadata used by the HTTP envelope. */
export interface ArrowRecordDocument<T extends Record<string, unknown>> {
    records: T[];
    metadata: ReadonlyMap<string, string>;
}
/** The normalized scalar schema already used by the Perspective adapter. */
export type ArrowPivotColumnType = 'string' | 'float' | 'date';
/**
 * Decodes one complete IPC response, including all of its internal record batches.
 * Nullable values and leading-zero identifiers retain their original meaning.
 */
export declare function decodeArrowDocument<T extends Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): ArrowRecordDocument<T>;
/** Convenience entry point for callers whose payload is explicitly a record list. */
export declare function decodeArrowRecords<T extends Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): T[];
/**
 * Writes normalized pivot rows as IPC before crossing Perspective's WASM boundary.
 * Explicit column types also preserve schemas when the dataset contains no rows.
 */
export declare function encodeArrowRows(rows: Record<string, unknown>[], schema: Record<string, ArrowPivotColumnType>): ArrayBuffer;
//# sourceMappingURL=arrow-records.d.ts.map