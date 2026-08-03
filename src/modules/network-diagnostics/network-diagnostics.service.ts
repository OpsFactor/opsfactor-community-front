import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import {
  buildCircularNetworkAlertsEndpoint,
  SUPPLY_NETWORK_VERSION_ENDPOINT,
  type CircularNetworkAlert,
  type SupplyNetworkVersion,
} from './network-diagnostics.types';

/** Keeps a backend diagnostic explanation visible instead of replacing it with a generic error. */
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

/** Loads only the existing Community selector; it does not trigger the diagnostic. */
export async function getSupplyNetworkVersions(): Promise<SupplyNetworkVersion[]> {

  try {
    return await httpClient.request<SupplyNetworkVersion[]>(SUPPLY_NETWORK_VERSION_ENDPOINT);
  } catch (error) {
    throw toBackendError(error, 'Unable to load Supply Network Versions.');
  }

}

/** Reads the raw Low Level Code circularity edges after an explicit user action. */
export async function getCircularNetworkAlerts(supplyNetworkVersionId: string): Promise<CircularNetworkAlert[]> {

  try {
    return await httpClient.request<CircularNetworkAlert[]>(
      buildCircularNetworkAlertsEndpoint(supplyNetworkVersionId),
    );
  } catch (error) {
    throw toBackendError(error, 'Unable to diagnose Supply Network circularity.');
  }

}
