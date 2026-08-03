import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import type { DemandPlan } from './demand-plan.types';
import type { PlanningBook, PlanningBookCellUpdate, PlanningBookSelection, PlanningBookView } from './planning-book.types';

function asFunctionalError(error: unknown, fallback: string): Error {
  if (!(error instanceof ApiRequestError)) return error instanceof Error ? error : new Error(fallback);
  try {
    const parsed = JSON.parse(error.responseText) as { message?: string };
    return new Error(parsed.message?.trim() || fallback);
  } catch {
    return new Error(error.responseText.trim() || fallback);
  }
}

export async function getPlanningBookViews(): Promise<PlanningBookView[]> {
  try {
    return await httpClient.request<PlanningBookView[]>('/api/secured/configuration/user/view/demandplanningbook');
  } catch (error) {
    throw asFunctionalError(error, 'Unable to load Planning Book views.');
  }
}

export async function loadPlanningBook(selection: PlanningBookSelection): Promise<PlanningBook> {
  try {
    return await httpClient.request<PlanningBook>('/api/secured/planning/demand/planningbook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to load the Demand Planning Book.');
  }
}

/**
 * Exports the same selected Demand Planning Book as a read-only spreadsheet.
 *
 * This is not a configured-view transfer: the backend receives only the
 * selection already used to open the current grid and returns a binary file.
 */
export async function exportPlanningBookXlsx(selection: PlanningBookSelection): Promise<Blob> {
  try {
    const response = await httpClient.requestBlob('/api/secured/planning/demand/planningbook/xlsx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection),
    });
    return response.blob;
  } catch (error) {
    throw asFunctionalError(error, 'Unable to export the Demand Planning Book spreadsheet.');
  }
}

export async function savePlanningBookCells(cells: PlanningBookCellUpdate[]): Promise<PlanningBook> {
  try {
    return await httpClient.request<PlanningBook>('/api/secured/planning/demand/planningbook/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cells),
    });
  } catch (error) {
    throw asFunctionalError(error, 'Unable to save Planning Book changes.');
  }
}

export type { DemandPlan };
