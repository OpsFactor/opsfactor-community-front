import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import { buildCommunityConfiguredViewPayload } from './configured-views.contract';
import type { ConfiguredView } from './configured-views.contract';

export type { CommunityConfiguredViewPayload, ConfiguredView, ConfiguredViewKeyFigure } from './configured-views.contract';

export interface ConfiguredViewUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  active?: boolean | null;
}

/** Public characteristic catalog used by the Planning Front configured-view editor. */
export interface ConfiguredViewCharacteristicLookup {
  caracteristicaId: string;
  descricao: string;
  listaAtributos: string[];
}

function errorFromApi(error: unknown, fallback: string): Error {
  if (!(error instanceof ApiRequestError)) return error instanceof Error ? error : new Error(fallback);
  try { return new Error((JSON.parse(error.responseText) as { message?: string }).message?.trim() || fallback); }
  catch { return new Error(error.responseText.trim() || fallback); }
}
function endpoint(viewType: ConfiguredView['viewType']): string { return viewType === 'Demand Planning Book' ? 'demandplanningbook' : 'supplyplanningbook'; }

export async function getConfiguredViews(viewType: ConfiguredView['viewType']): Promise<ConfiguredView[]> {
  try { return await httpClient.request<ConfiguredView[]>(`/api/secured/configuration/user/view/${endpoint(viewType)}`); }
  catch (error) { throw errorFromApi(error, 'Unable to load Planning Book views.'); }
}
export async function getConfiguredViewUsers(viewType: ConfiguredView['viewType']): Promise<ConfiguredViewUser[]> {
  try { return await httpClient.request<ConfiguredViewUser[]>(`/api/secured/user/configuredview/${encodeURIComponent(viewType)}`); }
  catch (error) { throw errorFromApi(error, 'Unable to load users available for Planning Book views.'); }
}
export async function getConfiguredViewsForUser(viewType: ConfiguredView['viewType'], userId: string): Promise<ConfiguredView[]> {
  try {
    return await httpClient.request<ConfiguredView[]>('/api/secured/configuration/user/view/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, viewType }),
    });
  } catch (error) { throw errorFromApi(error, 'Unable to load Planning Book views for the selected user.'); }
}
export async function getUnitOfMeasureIds(): Promise<string[]> {
  try { return await httpClient.request<string[]>('/api/secured/unitofmeasure/findids'); }
  catch (error) { throw errorFromApi(error, 'Unable to load units of measure.'); }
}
export async function getMaterialCharacteristics(): Promise<ConfiguredViewCharacteristicLookup[]> {
  try { return await httpClient.request<ConfiguredViewCharacteristicLookup[]>('/api/secured/material/characteristics'); }
  catch (error) { throw errorFromApi(error, 'Unable to load material characteristics.'); }
}
export async function getLocationCharacteristics(): Promise<ConfiguredViewCharacteristicLookup[]> {
  try { return await httpClient.request<ConfiguredViewCharacteristicLookup[]>('/api/secured/location/characteristics'); }
  catch (error) { throw errorFromApi(error, 'Unable to load location characteristics.'); }
}
export async function createConfiguredView(view: Pick<ConfiguredView, 'userId' | 'viewName' | 'viewType'>): Promise<void> {
  try { await httpClient.request<string>('/api/secured/configuration/user/view/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(view) }); }
  catch (error) { throw errorFromApi(error, 'Unable to create the Planning Book view.'); }
}
export async function saveConfiguredView(view: ConfiguredView): Promise<void> {
  const communityView = buildCommunityConfiguredViewPayload(view);
  try { await httpClient.request<string>('/api/secured/configuration/user/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(communityView) }); }
  catch (error) { throw errorFromApi(error, 'Unable to save the Planning Book view.'); }
}
export async function deleteConfiguredView(view: Pick<ConfiguredView, 'userId' | 'viewName' | 'viewType'>): Promise<void> {
  try { await httpClient.request<string>('/api/secured/configuration/user/view/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(view) }); }
  catch (error) { throw errorFromApi(error, 'Unable to delete the Planning Book view.'); }
}
