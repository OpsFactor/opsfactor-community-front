/** Raw node returned by the Community Low Level Code material diagnostic. */
export interface CommunityLowLevelCodeNode {
  tipo: string | null;
  id: string | null;
  label: string | null;
  level: number | null;
}

/** Raw directed edge returned by the Community Low Level Code material diagnostic. */
export interface CommunityLowLevelCodeEdge {
  from: string | null;
  to: string | null;
  label: string | null;
}

/** The technical material-specific Low Level Code graph; the browser does not lay it out or enrich it. */
export interface CommunityLowLevelCodeSnapshot {
  nodeDTOSet: CommunityLowLevelCodeNode[];
  edgeDTOSet: CommunityLowLevelCodeEdge[];
}

export const lowLevelCodeMaterialEndpoint = '/api/secured/planning/supply/lowlevelcode/material';

/** Builds the canonical explicit material diagnostic URL without inferring version or material identity. */
export function buildLowLevelCodeMaterialEndpoint(
  supplyNetworkVersionId: string,
  materialId: string,
): string {

  const query = new URLSearchParams({
    supplyNetworkVersionId: requireText(supplyNetworkVersionId, 'Supply Network Version ID'),
    materialId: requireText(materialId, 'Material ID'),
  });
  return `${lowLevelCodeMaterialEndpoint}?${query.toString()}`;
}

function requireText(value: string, label: string): string {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) throw new Error(`${label} is required.`);
  return normalizedValue;
}
