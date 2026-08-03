import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import {
  buildCommunityDataEndpoint,
  type CommunityDataTarget,
} from './community-data-upload.types';

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

    return this.read(target, 'Unable to download the Community FILE rows.');
  }

  /** Reads the canonical JSON representation of the selected Community family. */
  public async downloadJson(target: CommunityDataTarget): Promise<unknown> {

    return this.read(target, 'Unable to download the Community JSON payload.');
  }

  /** Posts an untouched browser file as multipart field `file`, matching the controller contract exactly. */
  public async uploadFile(target: CommunityDataTarget, file: File): Promise<string> {

    if (file.size === 0) {
      throw new Error('Choose a non-empty file before confirming the upload.');
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.write(target, formData, 'Community file upload completed.');
  }

  /** Posts a validated JSON body without adding client-side fields other than the enforced SYNC mode. */
  public async uploadJson(target: CommunityDataTarget, body: string): Promise<string> {

    return this.write(target, body, 'Community JSON upload completed.', { 'Content-Type': 'application/json' });
  }

  /** Sends only a confirmed canonical delete request. The body remains visible in the dialog before execution. */
  public async deleteJson(target: CommunityDataTarget, body: string): Promise<string> {

    return this.write(target, body, 'Community data deletion completed.', { 'Content-Type': 'application/json' });
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
