import { ApiRequestError, type HttpClient } from '@opsfactor/front-core';
import type {
  CommunityHistoricalSelloutReport,
  CommunityHistoricalSelloutReportRequest,
} from './historical-sellout.types';

export const historicalSelloutReportEndpoint = '/api/secured/historical/sellout';

function toBackendError(error: unknown, fallback: string): Error {

  if (!(error instanceof ApiRequestError) || error.responseText.length === 0) {
    return error instanceof Error ? error : new Error(fallback);
  }

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }

}

/** Transport for the read-only Community historical sell-out report. */
export class HistoricalSelloutReportService {

  private readonly httpClient: HttpClient;

  public constructor(httpClient: HttpClient) {

    this.httpClient = httpClient;

  }

  public async getReport(
    request: CommunityHistoricalSelloutReportRequest,
  ): Promise<CommunityHistoricalSelloutReport> {

    try {
      return await this.httpClient.request<CommunityHistoricalSelloutReport>(historicalSelloutReportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw toBackendError(error, 'Unable to load the historical sell-out report.');
    }

  }

}
