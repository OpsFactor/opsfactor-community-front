/** Supply Network Version header published by the Community master-data controller. */
export interface CommunitySupplyNetworkVersion {
  id: string;
  description: string | null;
  defaultRawMaterialOriginLocationId: string | null;
  defaultRawMaterialOriginLeadTimeDays: number | null;
}

export interface CommunitySupplyNetworkVersionDraft {
  isNew: boolean;
  id: string;
  description: string;
  defaultRawMaterialOriginLocationId: string;
  defaultRawMaterialOriginLeadTimeDays: string;
}

/** Raw Community base-lane snapshot returned only for one selected version. */
export interface CommunityTransportationLane {
  supplyNetworkVersionId: string | null;
  originLocationId: string | null;
  destinationLocationId: string | null;
  priority: number | null;
  leadTimeDays: number | null;
  enableDiscontinuedMaterials: boolean | null;
  enablePresalesMaterials: boolean | null;
  enableAllMaterials: boolean | null;
  multipleMinimumTransferLotSizeUomId: string | null;
  minimumTransferLotSize: number | null;
  multipleTransfer: number | null;
  active: boolean | null;
}

export interface CommunityTransportationLanePrimaryKey {
  supplyNetworkVersionId: string;
  originLocationId: string;
  destinationLocationId: string;
}

/** Editable base-lane draft. New rows receive the selected version ID but never a preloaded master-data catalog. */
export interface CommunityTransportationLaneDraft {
  primaryKey: CommunityTransportationLanePrimaryKey;
  priority: string;
  leadTimeDays: string;
  enableDiscontinuedMaterials: boolean | null;
  enablePresalesMaterials: boolean | null;
  enableAllMaterials: boolean | null;
  multipleMinimumTransferLotSizeUomId: string;
  minimumTransferLotSize: string;
  multipleTransfer: string;
  active: boolean | null;
}

export interface CommunityTransportationLaneSaveRequest {
  primaryKeyDto: CommunityTransportationLanePrimaryKey;
  priority?: number;
  leadTimeDays?: number;
  enableDiscontinuedMaterials?: boolean;
  enablePresalesMaterials?: boolean;
  enableAllMaterials?: boolean;
  multipleMinimumTransferLotSizeUomId?: string;
  minimumTransferLotSize?: number;
  multipleTransfer?: number;
  active?: boolean;
}

/** Material-specific override returned only for one selected version. */
export interface CommunityTransportationLaneMaterial {
  supplyNetworkVersionId: string | null;
  originLocationId: string | null;
  destinationLocationId: string | null;
  materialId: string | null;
  priority: number | null;
  leadTimeDays: number | null;
  multipleMinimumTransferLotSizeUomId: string | null;
  minimumTransferLotSize: number | null;
  multipleTransfer: number | null;
  active: boolean | null;
}

export interface CommunityTransportationLaneMaterialPrimaryKey extends CommunityTransportationLanePrimaryKey {
  materialId: string;
}

export interface CommunityTransportationLaneMaterialDraft {
  primaryKey: CommunityTransportationLaneMaterialPrimaryKey;
  priority: string;
  leadTimeDays: string;
  multipleMinimumTransferLotSizeUomId: string;
  minimumTransferLotSize: string;
  multipleTransfer: string;
  active: boolean | null;
}

export interface CommunityTransportationLaneMaterialSaveRequest {
  primaryKeyDto: CommunityTransportationLaneMaterialPrimaryKey;
  priority?: number;
  leadTimeDays?: number;
  multipleMinimumTransferLotSizeUomId?: string;
  minimumTransferLotSize?: number;
  multipleTransfer?: number;
  active?: boolean;
}

export const supplyNetworkVersionEndpoint = '/api/secured/supplynetwork/version';
export const transportationLaneUpdateEndpoint = '/api/secured/supplynetwork/transportationline/update';
export const transportationLaneDeleteEndpoint = '/api/secured/supplynetwork/transportationline/delete';
export const transportationLaneMaterialUpdateEndpoint = '/api/secured/supplynetwork/transportationlinematerial/update';
export const transportationLaneMaterialDeleteEndpoint = '/api/secured/supplynetwork/transportationlinematerial/delete';

export function buildTransportationLanesEndpoint(supplyNetworkVersionId: string): string {

  return `/api/secured/supplynetwork/transportationline/get/${encodeURIComponent(requireText(supplyNetworkVersionId, 'Supply Network Version ID'))}`;
}

export function buildTransportationLaneMaterialEndpoint(supplyNetworkVersionId: string): string {

  return `/api/secured/supplynetwork/transportationlinematerial/get/${encodeURIComponent(requireText(supplyNetworkVersionId, 'Supply Network Version ID'))}`;
}

export function buildSupplyNetworkVersionDraft(version: CommunitySupplyNetworkVersion): CommunitySupplyNetworkVersionDraft {

  return {
    isNew: false,
    id: version.id,
    description: version.description ?? '',
    defaultRawMaterialOriginLocationId: version.defaultRawMaterialOriginLocationId ?? '',
    defaultRawMaterialOriginLeadTimeDays: toOptionalNumberText(version.defaultRawMaterialOriginLeadTimeDays),
  };
}

export function buildSupplyNetworkVersionSaveRequest(draft: CommunitySupplyNetworkVersionDraft): CommunitySupplyNetworkVersion {

  const leadTimeDays = parseOptionalFiniteNumber(draft.defaultRawMaterialOriginLeadTimeDays, 'Default raw material origin lead time days');
  if (leadTimeDays !== undefined && leadTimeDays < 0) {
    throw new Error('Default raw material origin lead time days must be zero or positive.');
  }

  return {
    id: requireText(draft.id, 'Supply Network Version ID'),
    description: draft.description.trim() || null,
    defaultRawMaterialOriginLocationId: draft.defaultRawMaterialOriginLocationId.trim() || null,
    defaultRawMaterialOriginLeadTimeDays: leadTimeDays ?? null,
  };
}

export function buildTransportationLaneDraft(lane: CommunityTransportationLane): CommunityTransportationLaneDraft {

  return {
    primaryKey: {
      supplyNetworkVersionId: requireText(lane.supplyNetworkVersionId, 'Supply Network Version ID'),
      originLocationId: requireText(lane.originLocationId, 'Origin Location ID'),
      destinationLocationId: requireText(lane.destinationLocationId, 'Destination Location ID'),
    },
    priority: toOptionalNumberText(lane.priority),
    leadTimeDays: toOptionalNumberText(lane.leadTimeDays),
    enableDiscontinuedMaterials: lane.enableDiscontinuedMaterials,
    enablePresalesMaterials: lane.enablePresalesMaterials,
    enableAllMaterials: lane.enableAllMaterials,
    multipleMinimumTransferLotSizeUomId: lane.multipleMinimumTransferLotSizeUomId ?? '',
    minimumTransferLotSize: toOptionalNumberText(lane.minimumTransferLotSize),
    multipleTransfer: toOptionalNumberText(lane.multipleTransfer),
    active: lane.active,
  };
}

export function newTransportationLaneDraft(supplyNetworkVersionId: string): CommunityTransportationLaneDraft {

  return {
    primaryKey: { supplyNetworkVersionId: requireText(supplyNetworkVersionId, 'Supply Network Version ID'), originLocationId: '', destinationLocationId: '' },
    priority: '', leadTimeDays: '', enableDiscontinuedMaterials: null, enablePresalesMaterials: null, enableAllMaterials: null,
    multipleMinimumTransferLotSizeUomId: '', minimumTransferLotSize: '', multipleTransfer: '', active: true,
  };
}

export function buildTransportationLaneSaveRequest(draft: CommunityTransportationLaneDraft): CommunityTransportationLaneSaveRequest {

  return {
    primaryKeyDto: {
      supplyNetworkVersionId: requireText(draft.primaryKey.supplyNetworkVersionId, 'Supply Network Version ID'),
      originLocationId: requireText(draft.primaryKey.originLocationId, 'Origin Location ID'),
      destinationLocationId: requireText(draft.primaryKey.destinationLocationId, 'Destination Location ID'),
    },
    priority: parseOptionalFiniteNumber(draft.priority, 'Priority'),
    leadTimeDays: parseOptionalFiniteNumber(draft.leadTimeDays, 'Lead time days'),
    enableDiscontinuedMaterials: draft.enableDiscontinuedMaterials ?? undefined,
    enablePresalesMaterials: draft.enablePresalesMaterials ?? undefined,
    enableAllMaterials: draft.enableAllMaterials ?? undefined,
    multipleMinimumTransferLotSizeUomId: draft.multipleMinimumTransferLotSizeUomId.trim() || undefined,
    minimumTransferLotSize: parseOptionalFiniteNumber(draft.minimumTransferLotSize, 'Minimum transfer lot size'),
    multipleTransfer: parseOptionalFiniteNumber(draft.multipleTransfer, 'Transfer multiple'),
    active: draft.active ?? undefined,
  };
}

export function buildTransportationLaneMaterialDraft(lane: CommunityTransportationLaneMaterial): CommunityTransportationLaneMaterialDraft {

  return {
    primaryKey: {
      supplyNetworkVersionId: requireText(lane.supplyNetworkVersionId, 'Supply Network Version ID'),
      originLocationId: requireText(lane.originLocationId, 'Origin Location ID'),
      destinationLocationId: requireText(lane.destinationLocationId, 'Destination Location ID'),
      materialId: requireText(lane.materialId, 'Material ID'),
    },
    priority: toOptionalNumberText(lane.priority), leadTimeDays: toOptionalNumberText(lane.leadTimeDays),
    multipleMinimumTransferLotSizeUomId: lane.multipleMinimumTransferLotSizeUomId ?? '',
    minimumTransferLotSize: toOptionalNumberText(lane.minimumTransferLotSize),
    multipleTransfer: toOptionalNumberText(lane.multipleTransfer), active: lane.active,
  };
}

export function newTransportationLaneMaterialDraft(supplyNetworkVersionId: string): CommunityTransportationLaneMaterialDraft {

  return {
    primaryKey: { supplyNetworkVersionId: requireText(supplyNetworkVersionId, 'Supply Network Version ID'), originLocationId: '', destinationLocationId: '', materialId: '' },
    priority: '', leadTimeDays: '', multipleMinimumTransferLotSizeUomId: '', minimumTransferLotSize: '', multipleTransfer: '', active: true,
  };
}

export function buildTransportationLaneMaterialSaveRequest(draft: CommunityTransportationLaneMaterialDraft): CommunityTransportationLaneMaterialSaveRequest {

  return {
    primaryKeyDto: {
      supplyNetworkVersionId: requireText(draft.primaryKey.supplyNetworkVersionId, 'Supply Network Version ID'),
      originLocationId: requireText(draft.primaryKey.originLocationId, 'Origin Location ID'),
      destinationLocationId: requireText(draft.primaryKey.destinationLocationId, 'Destination Location ID'),
      materialId: requireText(draft.primaryKey.materialId, 'Material ID'),
    },
    priority: parseOptionalFiniteNumber(draft.priority, 'Priority'),
    leadTimeDays: parseOptionalFiniteNumber(draft.leadTimeDays, 'Lead time days'),
    multipleMinimumTransferLotSizeUomId: draft.multipleMinimumTransferLotSizeUomId.trim() || undefined,
    minimumTransferLotSize: parseOptionalFiniteNumber(draft.minimumTransferLotSize, 'Minimum transfer lot size'),
    multipleTransfer: parseOptionalFiniteNumber(draft.multipleTransfer, 'Transfer multiple'),
    active: draft.active ?? undefined,
  };
}

function requireText(value: string | null, label: string): string {

  const normalizedValue = value?.trim() ?? '';
  if (normalizedValue.length === 0) throw new Error(`${label} is required.`);
  return normalizedValue;
}

function toOptionalNumberText(value: number | null): string {

  return value === null ? '' : String(value);
}

function parseOptionalFiniteNumber(value: string, label: string): number | undefined {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return undefined;
  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) throw new Error(`${label} must be a finite number when informed.`);
  return parsedValue;
}
