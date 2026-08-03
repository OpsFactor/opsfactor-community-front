import * as XLSX from 'xlsx';
import { objectRowsToWorksheet } from './xlsx-workbook.js';
import type { OfxTableColumn } from './data-table.types.js';

export type OfxExportFormat = 'csv' | 'xlsx';

function timestampLabel() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function sanitizeFileName(baseName: string) {
  return baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function exportTableData(options: { baseName: string; columns: OfxTableColumn[]; rows: Record<string, unknown>[]; format: OfxExportFormat }) {
  const columns = options.columns.map((column) => ({ key: column.field, header: column.exportHeader ?? column.header }));
  const exportRows = options.rows.map((row) => Object.fromEntries(columns.map((column) => [column.header, row[column.key] ?? ''])));
  const workbook = XLSX.utils.book_new();
  const worksheet = options.format === 'xlsx' ? objectRowsToWorksheet(exportRows) : XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const fileBase = `${sanitizeFileName(options.baseName)}-${timestampLabel()}`;
  XLSX.writeFile(workbook, `${fileBase}.${options.format}`, { bookType: options.format });
}
