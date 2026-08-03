/** Existing Community planning flags registered for one Location Cluster. */
export interface CommunityClusterOperationalParameter {
  id: number;
  clusterLocations: string | null;
  clusterLocationsID: number | null;
  planejaDP: boolean | null;
  planejaPricing: boolean | null;
}

/** Existing Community material operational parameters. */
export interface CommunityMaterialOperationalParameter {
  id: string | null;
  descricao: string | null;
  ativo: boolean | null;
  foraLinha: boolean | null;
  novo: boolean | null;
}

/** Location option used only to choose the explicit material-location snapshot. */
export interface CommunityOperationalParameterLocation {
  id: string | null;
  description: string | null;
}

/** Existing Community override for one material at one selected location. */
export interface CommunityMaterialLocationOperationalParameter {
  locationID: string | null;
  location: string | null;
  materialID: string | null;
  material: string | null;
  productionMinimumQuantity: number | null;
  productionMultipleQuantity: number | null;
  foraLinha: boolean | null;
  novo: boolean | null;
  inativo: boolean | null;
  lifecycleStage: string | null;
  introductionDate: string | null;
  discontinuationDate: string | null;
  frozenHorizonDpInDays: number | null;
  defaultUomId: string | null;
  productionMinimumMultipleUomId: string | null;
}

export interface CommunityClusterOperationalParameterSaveRequest {
  id: number;
  clusterLocations: string | null;
  clusterLocationsID: number;
  planejaDP: boolean | null;
  planejaPricing: false;
}

export interface CommunityMaterialOperationalParameterSaveRequest {
  id: string;
  descricao: string | null;
  ativo: boolean | null;
}

export interface CommunityMaterialLocationOperationalParameterSaveRequest {
  locationID: string;
  materialID: string;
  productionMinimumQuantity?: number;
  productionMultipleQuantity?: number;
  inativo?: boolean;
  lifecycleStage?: string;
  introductionDate?: string;
  discontinuationDate?: string;
  frozenHorizonDpInDays?: number;
  defaultUomId?: string;
  productionMinimumMultipleUomId?: string;
}

export interface CommunityClusterOperationalParameterDraft {
  id: number;
  clusterLocations: string | null;
  clusterLocationsID: number;
  planejaDP: boolean | null;
}

export interface CommunityMaterialOperationalParameterDraft {
  id: string;
  descricao: string;
  ativo: boolean | null;
}

export interface CommunityMaterialLocationOperationalParameterDraft {
  locationID: string;
  location: string;
  materialID: string;
  material: string;
  productionMinimumQuantity: string;
  productionMultipleQuantity: string;
  inativo: boolean | null;
  lifecycleStage: string;
  introductionDate: string;
  discontinuationDate: string;
  frozenHorizonDpInDays: string;
  defaultUomId: string;
  productionMinimumMultipleUomId: string;
}

export const clusterOperationalParametersEndpoint = '/api/secured/configs/parametros/clusterLocation';
export const materialOperationalParametersEndpoint = '/api/secured/configs/parametros/material';
export const operationalParameterLocationsEndpoint = '/api/secured/configs/parametros/locationList';

/** The selector must be nonblank so the browser can never reach the broad material-location GET. */
export function buildMaterialLocationOperationalParametersEndpoint(locationId: string): string {

  const normalizedLocationId = locationId.trim();
  if (normalizedLocationId.length === 0) {
    throw new Error('A Location ID is required to load material-location parameters.');
  }

  return `/api/secured/configs/parametros/materialLocation/${encodeURIComponent(normalizedLocationId)}`;
}

export function buildCommunityClusterOperationalParameterDraft(
  parameter: CommunityClusterOperationalParameter,
): CommunityClusterOperationalParameterDraft {

  const clusterLocationsID = parameter.clusterLocationsID;
  if (!Number.isFinite(parameter.id) || clusterLocationsID === null || !Number.isFinite(clusterLocationsID)) {
    throw new Error('The selected Location Cluster parameter requires immutable numeric identifiers.');
  }

  return {
    id: parameter.id,
    clusterLocations: parameter.clusterLocations,
    clusterLocationsID,
    planejaDP: parameter.planejaDP,
  };
}

export function buildCommunityClusterOperationalParameterSaveRequest(
  draft: CommunityClusterOperationalParameterDraft,
): CommunityClusterOperationalParameterSaveRequest {

  return {
    id: requireFiniteNumber(draft.id, 'Location Cluster parameter ID'),
    clusterLocations: draft.clusterLocations,
    clusterLocationsID: requireFiniteNumber(draft.clusterLocationsID, 'Location Cluster ID'),
    planejaDP: draft.planejaDP,
    planejaPricing: false,
  };
}

export function buildCommunityMaterialOperationalParameterDraft(
  parameter: CommunityMaterialOperationalParameter,
): CommunityMaterialOperationalParameterDraft {

  return {
    id: requireText(parameter.id, 'Material ID'),
    descricao: parameter.descricao ?? '',
    ativo: parameter.ativo,
  };
}

export function buildCommunityMaterialOperationalParameterSaveRequest(
  draft: CommunityMaterialOperationalParameterDraft,
): CommunityMaterialOperationalParameterSaveRequest {

  return {
    id: requireText(draft.id, 'Material ID'),
    descricao: draft.descricao.trim() || null,
    ativo: draft.ativo,
  };
}

export function buildCommunityMaterialLocationOperationalParameterDraft(
  parameter: CommunityMaterialLocationOperationalParameter,
): CommunityMaterialLocationOperationalParameterDraft {

  return {
    locationID: requireText(parameter.locationID, 'Location ID'),
    location: parameter.location ?? '',
    materialID: requireText(parameter.materialID, 'Material ID'),
    material: parameter.material ?? '',
    productionMinimumQuantity: toOptionalNumberText(parameter.productionMinimumQuantity),
    productionMultipleQuantity: toOptionalNumberText(parameter.productionMultipleQuantity),
    inativo: parameter.inativo,
    lifecycleStage: parameter.lifecycleStage ?? '',
    introductionDate: toDateTimeLocalText(parameter.introductionDate),
    discontinuationDate: toDateTimeLocalText(parameter.discontinuationDate),
    frozenHorizonDpInDays: toOptionalNumberText(parameter.frozenHorizonDpInDays),
    defaultUomId: parameter.defaultUomId ?? '',
    productionMinimumMultipleUomId: parameter.productionMinimumMultipleUomId ?? '',
  };
}

export function buildCommunityMaterialLocationOperationalParameterSaveRequest(
  draft: CommunityMaterialLocationOperationalParameterDraft,
): CommunityMaterialLocationOperationalParameterSaveRequest {

  const productionMinimumQuantity = parseOptionalFiniteNumber(
    draft.productionMinimumQuantity,
    'Production minimum quantity',
  );
  const productionMultipleQuantity = parseOptionalFiniteNumber(
    draft.productionMultipleQuantity,
    'Production multiple quantity',
  );
  const frozenHorizonDpInDays = parseOptionalNonNegativeInteger(
    draft.frozenHorizonDpInDays,
    'Frozen Demand Planning horizon in days',
  );
  if (productionMinimumQuantity !== undefined && productionMinimumQuantity < 0) {
    throw new Error('Production minimum quantity must be non-negative.');
  }
  if (productionMultipleQuantity !== undefined && productionMultipleQuantity <= 0) {
    throw new Error('Production multiple quantity must be positive.');
  }

  return {
    locationID: requireText(draft.locationID, 'Location ID'),
    materialID: requireText(draft.materialID, 'Material ID'),
    productionMinimumQuantity,
    productionMultipleQuantity,
    inativo: draft.inativo ?? undefined,
    lifecycleStage: draft.lifecycleStage.trim() || undefined,
    introductionDate: normalizeOptionalDateTime(draft.introductionDate, 'Introduction date'),
    discontinuationDate: normalizeOptionalDateTime(draft.discontinuationDate, 'Discontinuation date'),
    frozenHorizonDpInDays,
    defaultUomId: draft.defaultUomId.trim() || undefined,
    productionMinimumMultipleUomId: draft.productionMinimumMultipleUomId.trim() || undefined,
  };
}

function requireText(value: string | null, label: string): string {

  const normalizedValue = value?.trim() ?? '';
  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required from the selected Community snapshot.`);
  }

  return normalizedValue;
}

function requireFiniteNumber(value: number, label: string): number {

  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number from the selected Community snapshot.`);
  }

  return value;
}

function toOptionalNumberText(value: number | null): string {

  return value === null ? '' : String(value);
}

function parseOptionalFiniteNumber(value: string, label: string): number | undefined {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a finite number when informed.`);
  }

  return parsedValue;
}

function parseOptionalNonNegativeInteger(value: string, label: string): number | undefined {

  const parsedValue = parseOptionalFiniteNumber(value, label);
  if (parsedValue === undefined) {
    return undefined;
  }
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} must be a non-negative integer when informed.`);
  }

  return parsedValue;
}

function toDateTimeLocalText(value: string | null): string {

  return value === null ? '' : value.slice(0, 16);
}

function normalizeOptionalDateTime(value: string, label: string): string | undefined {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return undefined;
  }
  if (Number.isNaN(Date.parse(normalizedValue))) {
    throw new Error(`${label} must be a valid local date and time when informed.`);
  }

  return normalizedValue;
}
