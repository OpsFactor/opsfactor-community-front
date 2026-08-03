/**
 * Raw Community matrix returned by the persisted Distribution Plan snapshot.
 *
 * Position is the contract: an item in `locationAndColorList` identifies both
 * the corresponding origin row and destination column in `flowData`.
 */
export interface MaterialFlows {
  locationAndColorList: MaterialFlowsLocation[];
  flowData: Array<Array<number | null>>;
}

/** A matrix node and the presentation color already chosen by the backend. */
export interface MaterialFlowsLocation {
  location: string;
  color: string;
}

/** Keeps the read endpoint explicit and prevents an accidental selector/body. */
export function buildMaterialFlowsEndpoint(supplyPlanId: number): string {

  if (!Number.isSafeInteger(supplyPlanId) || supplyPlanId <= 0) {
    throw new Error('A positive Supply Plan ID is required to load Material Flows.');
  }

  return `/api/secured/bi/planning/supply/materialflows/${supplyPlanId}`;

}
