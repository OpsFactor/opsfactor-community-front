/**
 * Community browser contract for one current Working Plan deployment route.
 *
 * The selector identity intentionally remains physical and scalar. It does
 * not expose plan alternatives, UOM selection, period changes or aggregation.
 */
export interface DeploymentOperationalSelection {
  supplyPlanId: number;
  originLocationId: string;
  destinationLocationId: string;
  materialId: string;
}

/** The complete read-only snapshot returned after both load and update. */
export interface DeploymentOperationalLine extends DeploymentOperationalSelection {
  materialDescription: string | null;
  currentPeriodEndDate: string;
  leadTimeDays: number;
  expectedReceiptDate: string;
  unitOfMeasureId: string;
  plannedInboundQuantity: number;
}

/** The only Community deployment command: replace inbound for one route. */
export interface DeploymentOperationalInboundUpdate extends DeploymentOperationalSelection {
  plannedInboundQuantity: number;
}

/** Existing generic Community catalogs used only to name the four selectors. */
export interface DeploymentSupplyPlanOption {
  supplyPlanId: number;
  description: string | null;
}

export interface DeploymentNamedOption {
  id: string;
  description: string | null;
  active: boolean | null;
}

export const DEPLOYMENT_OPERATIONAL_ENDPOINTS = {
  line: '/api/secured/planning/supply/deployment',
  update: '/api/secured/planning/supply/deployment/update',
} as const;

/** Builds the four and only four query parameters accepted by the read endpoint. */
export function buildDeploymentOperationalQuery(selection: DeploymentOperationalSelection): URLSearchParams {

  return new URLSearchParams({
    supplyPlanId: String(selection.supplyPlanId),
    originLocationId: selection.originLocationId,
    destinationLocationId: selection.destinationLocationId,
    materialId: selection.materialId,
  });

}

/** Materializes the five-field typed command instead of forwarding page state. */
export function buildDeploymentOperationalUpdate(
  selection: DeploymentOperationalSelection,
  plannedInboundQuantity: number,
): DeploymentOperationalInboundUpdate {

  return {
    supplyPlanId: selection.supplyPlanId,
    originLocationId: selection.originLocationId,
    destinationLocationId: selection.destinationLocationId,
    materialId: selection.materialId,
    plannedInboundQuantity,
  };

}
