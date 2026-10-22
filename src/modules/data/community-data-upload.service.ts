import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import { dataExportFileName, assertDataExportContentType, dataExportDescriptor, dataExportQuery, dataImportContentType, resolveDataExportPath } from '@opsfactor/front-core';
import {
  buildCommunityDataEndpoint,
  type CommunityDataDownloadFormat,
  type CommunityDataTarget,
} from './community-data-upload.types';

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

  const extension = dataExportDescriptor(format).extension;
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
   * Downloads the server representation unchanged. CSV locale choices only
   * supply separators; no rows or workbook are converted in the browser.
   */
  public async downloadTabularData(target: CommunityDataTarget, format: CommunityDataDownloadFormat): Promise<void> {

    try {
      const query = new URLSearchParams(Object.entries(dataExportQuery(format)).map(([key, value]) => [key, String(value)]));
      const path = `${resolveDataExportPath(buildCommunityDataEndpoint(target))}?${query}`;
      const response = await this.httpClient.requestBlob(path, { headers: { Accept: dataExportDescriptor(format).mimeType } });
      assertDataExportContentType(response.blob.type, format);
      triggerDownload(response.blob, dataExportFileName(downloadFileName(target, format), format));
    } catch (error) {
      throw toBackendError(error, 'Unable to download the selected data.');
    }
  }

  /** Reads the canonical JSON representation of the selected Community family. */
  public async downloadJson(target: CommunityDataTarget): Promise<unknown> {

    return this.read(target, 'Unable to download the JSON payload.');
  }

  /** Posts an untouched browser file as multipart field `file`, matching the controller contract exactly. */
  public async uploadFile(target: CommunityDataTarget, file: File): Promise<string> {

    if (file.size === 0) {
      throw new Error('Choose a non-empty file to import.');
    }

    const contentType = dataImportContentType(file.name);
    if (contentType) {
      const supportsStructuredImport = target.family.operations.some((operation) => operation.kind === 'upload-json');
      if (!supportsStructuredImport) throw new Error('This dataset accepts spreadsheet uploads only.');
      try {
        const response = await this.httpClient.request<unknown>(resolveDataExportPath(buildCommunityDataEndpoint(target)), {
          method: 'POST', headers: { 'Content-Type': contentType }, body: file,
        });
        return toResponseMessage(response, 'Data upload completed.');
      } catch (error) {
        throw toBackendError(error, 'Unable to upload the selected data.');
      }
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
