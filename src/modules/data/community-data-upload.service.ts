import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import { matrixRowsToWorksheet, objectRowsToWorksheet } from '@opsfactor/front-shell';
import * as XLSX from 'xlsx';
import {
  buildCommunityDataEndpoint,
  type CommunityDataDownloadFormat,
  type CommunityDataTarget,
} from './community-data-upload.types';

interface TabularDownloadPayload {
  objectRows: Record<string, unknown>[];
  matrixRows: unknown[][];
}

/**
 * Extracts the row collection returned by the canonical Data endpoint.
 *
 * The backend may return an array directly or wrap it in one of the historic
 * collection keys. The export remains faithful to the server columns and does
 * not manufacture an alternate data model in the browser.
 */
function extractTabularDownloadPayload(payload: unknown): TabularDownloadPayload {

  if (Array.isArray(payload)) {
    return payload.every((item) => Array.isArray(item))
      ? { objectRows: [], matrixRows: payload.filter((item): item is unknown[] => Array.isArray(item)) }
      : { objectRows: payload.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item)), matrixRows: [] };
  }

  if (payload !== null && typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>;
    for (const key of ['rows', 'items', 'data', 'result']) {
      if (Array.isArray(candidate[key])) {
        return extractTabularDownloadPayload(candidate[key]);
      }
    }
    return { objectRows: [candidate], matrixRows: [] };
  }

  return { objectRows: [], matrixRows: [] };
}

/** Builds the locale-aware CSV profile used by the Planning Front Data workspace. */
function csvSettings(format: Exclude<CommunityDataDownloadFormat, 'xlsx'>) {

  if (format === 'csvStandard') {
    return { delimiter: ',', decimalDelimiter: '.', lineDelimiter: '\n' };
  }

  if (format !== 'csvSystemLocale') {
    throw new Error(`Unsupported CSV format: ${format}`);
  }

  const decimalDelimiter = new Intl.NumberFormat().format(1.1).includes(',') ? ',' : '.';
  return {
    delimiter: decimalDelimiter === ',' ? ';' : ',',
    decimalDelimiter,
    lineDelimiter: '\r\n',
  };
}

/** Serializes a cell without losing booleans, dates or nested values in CSV downloads. */
function csvCell(value: unknown, decimalDelimiter: string): string {

  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    const formatted = new Intl.NumberFormat(undefined, { useGrouping: false, maximumFractionDigits: 20 }).format(value);
    return decimalDelimiter === '.' ? formatted : formatted.replace('.', decimalDelimiter);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Escapes a CSV token according to the selected field delimiter. */
function csvToken(value: string, delimiter: string): string {

  const escaped = value.replace(/"/g, '""');
  return escaped.includes(delimiter) || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')
    ? `"${escaped}"`
    : escaped;
}

/** Converts object rows to a stable-delimiter CSV while preserving every returned column. */
function objectRowsToCsv(rows: Record<string, unknown>[], format: Exclude<CommunityDataDownloadFormat, 'xlsx'>): string {

  if (rows.length === 0) return '';

  const settings = csvSettings(format);
  const columns = Array.from(rows.reduce<Set<string>>((allColumns, row) => {
    Object.keys(row).forEach((column) => allColumns.add(column));
    return allColumns;
  }, new Set<string>()));
  const lines = [columns.map((column) => csvToken(column, settings.delimiter)).join(settings.delimiter)];
  rows.forEach((row) => lines.push(columns.map((column) => csvToken(csvCell(row[column], settings.decimalDelimiter), settings.delimiter)).join(settings.delimiter)));
  return lines.join(settings.lineDelimiter);
}

/** Converts matrix rows to CSV without assigning synthetic column names. */
function matrixRowsToCsv(rows: unknown[][], format: Exclude<CommunityDataDownloadFormat, 'xlsx'>): string {

  const settings = csvSettings(format);
  return rows
    .map((row) => row.map((cell) => csvToken(csvCell(cell, settings.decimalDelimiter), settings.delimiter)).join(settings.delimiter))
    .join(settings.lineDelimiter);
}

/** Uses the same browser-download lifecycle as the Planning Front data service. */
function triggerDownload(blob: Blob, fileName: string): void {

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

/** Keeps generated filenames readable while preventing endpoint text from leaking into the UI. */
function downloadFileName(target: CommunityDataTarget, format: CommunityDataDownloadFormat): string {

  const extension = format === 'xlsx' ? 'xlsx' : 'csv';
  return `${target.family.subPath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${extension}`;
}

/** Converts the standard backend envelope or plain text into one operator-facing message. */
function toResponseMessage(response: unknown, fallback: string): string {

  if (typeof response === 'string') {
    return response.trim() || fallback;
  }
  if (response !== null && typeof response === 'object' && 'message' in response) {
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }
  }
  return fallback;
}

/** Keeps server error details visible instead of replacing them with a generic browser failure. */
function toBackendError(error: unknown, fallback: string): Error {

  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(fallback);
  }

  try {
    return new Error(toResponseMessage(JSON.parse(error.responseText), fallback));
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }
}

/**
 * Narrow transport for the statically classified Community catalog.
 *
 * Every method receives a resolved catalog target, never a caller-provided
 * URL, so the page cannot accidentally expose an Enterprise data family.
 */
export class CommunityDataUploadService {
  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;
  }

  /** Reads the server FILE row layout as JSON because these controllers return row arrays, not an attachment. */
  public async downloadFileRows(target: CommunityDataTarget): Promise<unknown> {

    return this.read(target, 'Unable to download the selected file rows.');
  }

  /**
   * Exports the canonical tabular response through the Planning Front's XLSX
   * and CSV choices instead of exposing the internal FILE/JSON transport split.
   */
  public async downloadTabularData(target: CommunityDataTarget, format: CommunityDataDownloadFormat): Promise<void> {

    const payload = await this.read(target, 'Unable to download the selected data.');
    const { objectRows, matrixRows } = extractTabularDownloadPayload(payload);
    const fileName = downloadFileName(target, format);

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = matrixRows.length > 0
        ? matrixRowsToWorksheet(matrixRows)
        : objectRowsToWorksheet(objectRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
      return;
    }

    const csv = matrixRows.length > 0
      ? matrixRowsToCsv(matrixRows, format)
      : objectRowsToCsv(objectRows, format);
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName);
  }

  /** Reads the canonical JSON representation of the selected Community family. */
  public async downloadJson(target: CommunityDataTarget): Promise<unknown> {

    return this.read(target, 'Unable to download the JSON payload.');
  }

  /** Posts an untouched browser file as multipart field `file`, matching the controller contract exactly. */
  public async uploadFile(target: CommunityDataTarget, file: File): Promise<string> {

    if (file.size === 0) {
      throw new Error('Choose a non-empty file before confirming the upload.');
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.write(target, formData, 'File upload completed.');
  }

  /** Posts a validated JSON body without adding client-side fields other than the enforced SYNC mode. */
  public async uploadJson(target: CommunityDataTarget, body: string): Promise<string> {

    return this.write(target, body, 'JSON upload completed.', { 'Content-Type': 'application/json' });
  }

  /** Sends only a confirmed canonical delete request. The body remains visible in the dialog before execution. */
  public async deleteJson(target: CommunityDataTarget, body: string): Promise<string> {

    return this.write(target, body, 'Data deletion completed.', { 'Content-Type': 'application/json' });
  }

  private async read(target: CommunityDataTarget, fallback: string): Promise<unknown> {

    try {
      return await this.httpClient.request<unknown>(buildCommunityDataEndpoint(target));
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }

  private async write(
    target: CommunityDataTarget,
    body: BodyInit,
    fallback: string,
    headers?: HeadersInit,
  ): Promise<string> {

    try {
      const response = await this.httpClient.request<unknown>(buildCommunityDataEndpoint(target), {
        method: target.operation.kind === 'delete-json' ? 'DELETE' : 'POST',
        headers,
        body,
      });
      return toResponseMessage(response, fallback);
    } catch (error) {
      throw toBackendError(error, fallback);
    }
  }
}
