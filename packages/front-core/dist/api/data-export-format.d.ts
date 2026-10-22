/** Representations negotiated by the shared data-integration HTTP boundary. */
export type DataExportFormat = 'json' | 'arrow' | 'parquet' | 'xlsx' | 'csv' | 'csvStandard' | 'csvSystemLocale';
export interface DataCsvOptions {
    fieldSeparator?: string;
    decimalSeparator?: 'comma' | 'dot' | ',' | '.';
}
/** Maps presentation choices to their actual wire format, MIME type and suffix. */
export declare function dataExportDescriptor(format: DataExportFormat): {
    format: string;
    mimeType: string;
    extension: string;
};
/**
 * Selects the current data route explicitly; old FILE routes remain compatible
 * on the server and are still used for multipart spreadsheet imports.
 */
export declare function resolveDataExportPath(path: string): string;
/** Encodes the existing CSV profiles without formatting numbers in the browser. */
export declare function dataExportQuery(format: DataExportFormat, options?: DataCsvOptions, locale?: string): Record<string, string | boolean>;
/** Identifies raw imports; spreadsheet uploads retain their multipart contract. */
export declare function dataImportContentType(fileName: string): string | null;
/** Uses a safe filename leaf and makes its suffix match the chosen representation. */
export declare function dataExportFileName(fileName: string, format: DataExportFormat): string;
/** Prevents an obsolete JSON matrix response from being saved as a corrupt workbook. */
export declare function assertDataExportContentType(contentType: string, format: DataExportFormat): void;
//# sourceMappingURL=data-export-format.d.ts.map