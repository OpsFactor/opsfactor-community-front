import * as XLSX from 'xlsx';

type ExcelDate = Date & { __ofxExcelDateOnly?: boolean };

export function objectRowsToWorksheet(rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(normalizeRowsForWorkbook(rows), { cellDates: true });
  applyWorkbookDateFormats(worksheet);
  return worksheet;
}

export function matrixRowsToWorksheet(matrix: unknown[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(normalizeMatrixForWorkbook(matrix), { cellDates: true });
  applyWorkbookDateFormats(worksheet);
  return worksheet;
}

function normalizeRowsForWorkbook(rows: Record<string, unknown>[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeCellForWorkbook(value)])));
}

function normalizeMatrixForWorkbook(matrix: unknown[][]) {
  return matrix.map((row) => row.map(normalizeCellForWorkbook));
}

function normalizeCellForWorkbook(value: unknown): unknown {
  return typeof value === 'string' ? parseIsoDateForWorkbook(value) ?? value : value;
}

function parseIsoDateForWorkbook(value: string): ExcelDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const millisecond = Number((match[7] ?? '0').slice(0, 3).padEnd(3, '0'));
  const isDateOnly = match[4] === undefined;
  const date = isDateOnly
    ? new Date(year, month - 1, day, 0, 0, 0, 0)
    : new Date(year, month - 1, day, hour, minute, second, millisecond);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const excelDate = date as ExcelDate;
  excelDate.__ofxExcelDateOnly = isDateOnly;
  return excelDate;
}

function applyWorkbookDateFormats(worksheet: XLSX.WorkSheet) {
  for (const cellAddress of Object.keys(worksheet)) {
    if (cellAddress.startsWith('!')) continue;
    const cell = worksheet[cellAddress];
    if (cell?.t === 'd' && cell.v instanceof Date) {
      const value = cell.v as ExcelDate;
      cell.t = 'n';
      cell.v = toExcelSerialDate(value, value.__ofxExcelDateOnly === true);
      cell.z = value.__ofxExcelDateOnly ? 'yyyy-mm-dd' : 'yyyy-mm-dd hh:mm:ss';
      delete cell.w;
    }
  }
}

function toExcelSerialDate(date: Date, dateOnly: boolean) {
  const excelEpochUtc = Date.UTC(1899, 11, 30);
  const dateUtc = Date.UTC(
    date.getFullYear(), date.getMonth(), date.getDate(),
    dateOnly ? 0 : date.getHours(), dateOnly ? 0 : date.getMinutes(),
    dateOnly ? 0 : date.getSeconds(), dateOnly ? 0 : date.getMilliseconds(),
  );
  return (dateUtc - excelEpochUtc) / 86400000;
}
