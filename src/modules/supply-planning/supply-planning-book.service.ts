import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import { SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS } from './supply-planning-book.types';
import type {
  SupplyPlanOption,
  SupplyPlanningBook,
  SupplyPlanningBookCellUpdate,
  SupplyPlanningBookCellDetails,
  SupplyPlanningBookDetailSelection,
  SupplyPlanningBookLocation,
  SupplyPlanningBookSelection,
  SupplyPlanningBookView,
} from './supply-planning-book.types';

function asFunctionalError(error: unknown, fallback: string): Error {

  if (!(error instanceof ApiRequestError)) return error instanceof Error ? error : new Error(fallback);

  try {
    const response = JSON.parse(error.responseText) as { message?: string };
    return new Error(response.message?.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }
}

/** Loads only the three selector catalogs already published by Community. */
export async function getSupplyPlanningBookCatalog(): Promise<{
  supplyPlans: SupplyPlanOption[];
  views: SupplyPlanningBookView[];
  locations: SupplyPlanningBookLocation[];
}> {

  try {
    const [supplyPlans, views, locations] = await Promise.all([
      httpClient.request<SupplyPlanOption[]>('/api/secured/planning/supply'),
      httpClient.request<SupplyPlanningBookView[]>('/api/secured/configuration/user/view/supplyplanningbook'),
      httpClient.request<SupplyPlanningBookLocation[]>('/api/secured/location/supplyplanning'),
    ]);

    return { supplyPlans, views, locations };
  } catch (error) {
    throw asFunctionalError(error, 'Unable to load Supply Planning Book options.');
  }
}

/** Opens the material/location Working Plan with no reference or aggregation fields. */
export async function loadSupplyPlanningBook(selection: SupplyPlanningBookSelection): Promise<SupplyPlanningBook> {

  try {
    return await httpClient.request<SupplyPlanningBook>('/api/secured/planning/supply/planningbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to load the Supply Planning Book.');
  }
}

/**
 * Sends one homogeneous backend operation and returns its authoritative grid.
 * Passing an array is required by the REST contract; callers must pass one cell.
 */
export async function saveSupplyPlanningBookCell(cell: SupplyPlanningBookCellUpdate): Promise<SupplyPlanningBook> {

  try {
    return await httpClient.request<SupplyPlanningBook>('/api/secured/planning/supply/planningbook/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([cell]),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to save the Supply Planning Book change.');
  }
}

/** Loads detail contributors only after the user explicitly selects a grid cell. */
export async function loadSupplyPlanningBookCellDetails(
  selection: SupplyPlanningBookDetailSelection,
): Promise<SupplyPlanningBookCellDetails> {

  try {
    return await httpClient.request<SupplyPlanningBookCellDetails>(SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS.read, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to load the Supply Planning Book cell details.');
  }
}

/** Persists the complete authoritative detail snapshot and returns a refreshed book. */
export async function saveSupplyPlanningBookCellDetails(
  details: SupplyPlanningBookCellDetails,
): Promise<SupplyPlanningBook> {

  try {
    return await httpClient.request<SupplyPlanningBook>(SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS.update, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to save the Supply Planning Book cell details.');
  }
}
