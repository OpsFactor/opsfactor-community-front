/** Representations negotiated by the shared data-integration HTTP boundary. */
export type DataExportFormat = 'json' | 'arrow' | 'parquet' | 'xlsx' | 'csv' | 'csvStandard' | 'csvSystemLocale';

export interface DataCsvOptions {
  fieldSeparator?: string;
  decimalSeparator?: 'comma' | 'dot' | ',' | '.';
}

/** Maps presentation choices to their actual wire format, MIME type and suffix. */
export function dataExportDescriptor(format: DataExportFormat): { format: string; mimeType: string; extension: string } {

  switch (format) {
    case 'json': return { format, mimeType: 'application/json', extension: 'json' };
    case 'arrow': return { format, mimeType: 'application/vnd.apache.arrow.stream', extension: 'arrow' };
    case 'parquet': return { format, mimeType: 'application/vnd.apache.parquet', extension: 'parquet' };
    case 'xlsx': return { format, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
    default: return { format: 'csv', mimeType: 'text/csv', extension: 'csv' };
  }

}

/**
 * Selects the current data route explicitly; old FILE routes remain compatible
 * on the server and are still used for multipart spreadsheet imports.
 */
export function resolveDataExportPath(path: string): string {

  return path
    .replace(/^\/api\/secured\/dataupload\/json\//, '/api/secured/data/')
    .replace(/^\/api\/secured\/dataupload\//, '/api/secured/data/')
    .replace(/^\/api\/secured\/data\/file\//, '/api/secured/data/')
    .replace('/profitlossbydfu/new/file/', '/profitlossbydfu/');

}

/** Encodes the existing CSV profiles without formatting numbers in the browser. */
export function dataExportQuery(format: DataExportFormat, options: DataCsvOptions = {}, locale?: string): Record<string, string | boolean> {

  const descriptor = dataExportDescriptor(format);
  const query: Record<string, string | boolean> = { format: descriptor.format };
  if (descriptor.format !== 'csv') return query;
  // Standard CSV deliberately relies on server defaults: comma and dot.
  if (format !== 'csvSystemLocale' && !options.fieldSeparator && !options.decimalSeparator) return query;

  const localeDecimal = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
  const localeProfile = format === 'csvSystemLocale';
  const decimal = options.decimalSeparator === 'comma' || options.decimalSeparator === ',' ? ','
    : options.decimalSeparator === 'dot' || options.decimalSeparator === '.' ? '.'
      : localeProfile ? localeDecimal : '.';
  query.fieldSeparator = options.fieldSeparator ?? (localeProfile && decimal === ',' ? ';' : ',');
  query.decimalSeparator = decimal === ',' ? 'comma' : 'dot';
  return query;

}

/** Identifies raw imports; spreadsheet uploads retain their multipart contract. */
export function dataImportContentType(fileName: string): string | null {

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'arrow' || extension === 'ipc') return dataExportDescriptor('arrow').mimeType;
  if (extension === 'parquet') return dataExportDescriptor('parquet').mimeType;
  if (extension === 'json') return dataExportDescriptor('json').mimeType;
  return null;

}

/** Uses a safe filename leaf and makes its suffix match the chosen representation. */
export function dataExportFileName(fileName: string, format: DataExportFormat): string {

  const leaf = fileName.replace(/\\/g, '/').split('/').pop() || 'data';
  const safeName = leaf.replace(/[<>:"|?*\u0000-\u001f]/g, '_').replace(/\.(json|arrow|ipc|parquet|xlsx|xls|csv)$/i, '');
  return `${safeName}.${dataExportDescriptor(format).extension}`;

}

/** Prevents an obsolete JSON matrix response from being saved as a corrupt workbook. */
export function assertDataExportContentType(contentType: string, format: DataExportFormat): void {

  const actual = contentType.split(';', 1)[0]?.trim().toLowerCase();
  const expected = dataExportDescriptor(format).mimeType;
  if (!actual || actual === expected || actual === 'application/octet-stream' || (expected === 'text/csv' && actual === 'application/csv')) return;
  throw new Error(`The server did not return the requested ${dataExportDescriptor(format).format.toUpperCase()} format.`);

}
