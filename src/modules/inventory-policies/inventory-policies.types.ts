/** Exact Community response for one operational inventory policy. */
export interface CommunityInventoryPolicy {
  id: string;
  prioridade: number | null;
  dataHorarioInicio: string | null;
  dataHorarioFim: string | null;
  materialLocationList: CommunityInventoryPolicyMaterialLocationRule[];
}

/** Raw material/location rule published by the Community operational policy endpoint. */
export interface CommunityInventoryPolicyMaterialLocationRule {
  materialId: string | null;
  locationId: string | null;
  modeloReabastecimento: string | null;
  modeloOperacional: string | null;
  calculoSafetyStock: string | null;
  estoqueSegurancaDrpOuTargetKanban: number | null;
  estoqueMaximoDrp: number | null;
}

/** Mutable browser draft created only from one policy detail snapshot. */
export interface CommunityInventoryPolicyDraft {
  id: string;
  prioridade: string;
  dataHorarioInicio: string;
  dataHorarioFim: string;
  materialLocationList: CommunityInventoryPolicyMaterialLocationRuleDraft[];
}

/**
 * Raw Community rule fields kept editable without material or Location
 * lookups. Replenishment-frequency is intentionally absent because it belongs
 * to the Enterprise inventory-policy optimizer.
 */
export interface CommunityInventoryPolicyMaterialLocationRuleDraft {
  materialId: string;
  locationId: string;
  modeloReabastecimento: string;
  modeloOperacional: string;
  calculoSafetyStock: string;
  estoqueSegurancaDrpOuTargetKanban: string;
  estoqueMaximoDrp: string;
}

/** Exact POST snapshot accepted by the Community operational policy API. */
export interface CommunityInventoryPolicySaveRequest {
  id: string;
  prioridade: number | null;
  dataHorarioInicio: string | null;
  dataHorarioFim: string | null;
  materialLocationList: CommunityInventoryPolicyMaterialLocationRuleSaveRequest[];
}

/** One policy rule in the complete Community save snapshot. */
export interface CommunityInventoryPolicyMaterialLocationRuleSaveRequest {
  materialId: string;
  locationId: string;
  modeloReabastecimento: string | null;
  modeloOperacional: string | null;
  calculoSafetyStock: string | null;
  estoqueSegurancaDrpOuTargetKanban: number | null;
  estoqueMaximoDrp: number | null;
}

/** Builds the only detail endpoint exposed by this inspector. */
export function buildInventoryPolicyDetailEndpoint(inventoryPolicyId: string): string {

  const policyId = inventoryPolicyId.trim();
  if (policyId.length === 0) {
    throw new Error('An inventory policy ID is required.');
  }

  return `/api/secured/configs/inventorypolicy/${encodeURIComponent(policyId)}`;
}

/** Creates an independent, editable draft without mutating the GET snapshot. */
export function buildCommunityInventoryPolicyDraft(
  inventoryPolicy: CommunityInventoryPolicy,
): CommunityInventoryPolicyDraft {

  return {
    id: inventoryPolicy.id,
    prioridade: formatDraftValue(inventoryPolicy.prioridade),
    dataHorarioInicio: formatDraftValue(inventoryPolicy.dataHorarioInicio),
    dataHorarioFim: formatDraftValue(inventoryPolicy.dataHorarioFim),
    materialLocationList: inventoryPolicy.materialLocationList.map((rule) => ({
      materialId: formatDraftValue(rule.materialId),
      locationId: formatDraftValue(rule.locationId),
      modeloReabastecimento: formatDraftValue(rule.modeloReabastecimento),
      modeloOperacional: formatDraftValue(rule.modeloOperacional),
      calculoSafetyStock: formatDraftValue(rule.calculoSafetyStock),
      estoqueSegurancaDrpOuTargetKanban: formatDraftValue(rule.estoqueSegurancaDrpOuTargetKanban),
      estoqueMaximoDrp: formatDraftValue(rule.estoqueMaximoDrp),
    })),
  };

}

/** Creates one blank rule without inventing material, Location or enum values. */
export function createCommunityInventoryPolicyRuleDraft(): CommunityInventoryPolicyMaterialLocationRuleDraft {

  return {
    materialId: '',
    locationId: '',
    modeloReabastecimento: '',
    modeloOperacional: '',
    calculoSafetyStock: '',
    estoqueSegurancaDrpOuTargetKanban: '',
    estoqueMaximoDrp: '',
  };

}

/**
 * Builds the full replacement snapshot. The policy identity remains the GET
 * snapshot identity; the function deliberately has no Enterprise frequency
 * field and does not resolve referenced master data in the browser.
 */
export function buildCommunityInventoryPolicySaveRequest(
  draft: CommunityInventoryPolicyDraft,
): CommunityInventoryPolicySaveRequest {

  const policyId = draft.id.trim();
  if (policyId.length === 0) {
    throw new Error('An inventory policy ID is required.');
  }

  return {
    id: policyId,
    prioridade: parseOptionalNumber(draft.prioridade, 'Registered priority'),
    dataHorarioInicio: toOptionalText(draft.dataHorarioInicio),
    dataHorarioFim: toOptionalText(draft.dataHorarioFim),
    materialLocationList: draft.materialLocationList.map((rule, index) => ({
      materialId: requireText(rule.materialId, `Rule ${index + 1} material ID`),
      locationId: requireText(rule.locationId, `Rule ${index + 1} Location ID`),
      modeloReabastecimento: toOptionalText(rule.modeloReabastecimento),
      modeloOperacional: toOptionalText(rule.modeloOperacional),
      calculoSafetyStock: toOptionalText(rule.calculoSafetyStock),
      estoqueSegurancaDrpOuTargetKanban: parseOptionalNumber(
        rule.estoqueSegurancaDrpOuTargetKanban,
        `Rule ${index + 1} safety stock / Kanban target`,
      ),
      estoqueMaximoDrp: parseOptionalNumber(rule.estoqueMaximoDrp, `Rule ${index + 1} DRP maximum stock`),
    })),
  };

}

/** Preserves raw server values in a form-friendly string field. */
function formatDraftValue(value: string | number | null): string {

  return value === null ? '' : String(value);

}

/** Converts an optional raw text input into the JSON null expected by the DTO. */
function toOptionalText(value: string): string | null {

  return value.trim() || null;

}

/** Refuses an empty identifier before the full snapshot reaches the backend. */
function requireText(value: string, label: string): string {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;

}

/** Converts optional numeric fields without silently masking malformed values. */
function parseOptionalNumber(value: string, label: string): number | null {

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return null;
  }

  const numberValue = Number(normalizedValue);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return numberValue;

}
