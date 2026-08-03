import { ApiRequestError } from '@opsfactor/front-core';
import { httpClient } from '../../services/community-authentication.service';
import { buildCommunityConfiguredViewPayload } from './configured-views.contract';
import type { ConfiguredView } from './configured-views.contract';

export type { CommunityConfiguredViewPayload, ConfiguredView, ConfiguredViewKeyFigure } from './configured-views.contract';

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
export async function getUnitOfMeasureIds(): Promise<string[]> {
  try { return await httpClient.request<string[]>('/api/secured/unitofmeasure/findids'); }
  catch (error) { throw errorFromApi(error, 'Unable to load units of measure.'); }
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
