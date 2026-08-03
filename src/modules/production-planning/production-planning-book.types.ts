/**
 * Read model returned by the Community Production Planning Book endpoint.
 *
 * The resource hierarchy deliberately exposes only aggregate capacity in
 * hours and Working Plan planned production. Scheduling-only concepts do not
 * belong to this browser contract.
 */
export interface ProductionPlanningBook {
  supplyPlanId: number;
  locationId: string;
  periodEndDates: string[];
  resources: ProductionPlanningResource[];
}

export interface ProductionPlanningResource {
  productionResourceId: string;
  description: string;
  capacityHoursByPeriod: Array<number | null>;
  materials: ProductionPlanningMaterial[];
}

export interface ProductionPlanningMaterial {
  materialId: string;
  description: string;
  unitOfMeasureId: string;
  plannedQuantityByPeriod: Array<number | null>;
}

export interface ProductionPlanningBookUpdate {
  supplyPlanId: number;
  locationId: string;
  materialId: string;
  productionResourceId: string;
  periodEndDate: string;
  plannedQuantity: number;
}

export interface ProductionPlanningSupplyPlanOption {
  supplyPlanId: number;
  description: string | null;
}

export interface ProductionPlanningLocationOption {
  id: string;
  description: string | null;
  showInProductionPlanningBook: boolean | null;
}

/**
 * Presentation row consumed by the shared Community virtualized grid.
 *
 * It is derived only from the already-open production-book snapshot. It does
 * not generalize the Production DTO into Demand/Supply key figures and does
 * not add a query, aggregate or writable capacity field.
 */
export interface ProductionPlanningBookRichRow {
  rowKey: string;
  rowType: 'resourceCapacity' | 'materialProduction';
  rowLabel: string;
  unitOfMeasure: string;
  resource: ProductionPlanningResource;
  material?: ProductionPlanningMaterial;
  keyFigure: string;
  values: Record<string, number | null | undefined>;
  unavailableReasons: Record<string, string | undefined>;
  additionalClasses: Record<string, string[] | undefined>;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  hierarchyParentRowKey?: string;
  hierarchyDepth: number;
  hierarchyExpandable: boolean;
}

/** Maps the canonical production DTO into its existing resource/material tree for display only. */
export function buildProductionPlanningBookRichRows(
  planningBook: ProductionPlanningBook,
): ProductionPlanningBookRichRow[] {

  return planningBook.resources.flatMap((resource) => {
    const resourceRowKey = `resource::${resource.productionResourceId}`;
    const resourceValues = Object.fromEntries(planningBook.periodEndDates.map((periodEndDate, periodIndex) => [
      periodEndDate,
      resource.capacityHoursByPeriod[periodIndex] ?? null,
    ]));
    const resourceRow: ProductionPlanningBookRichRow = {
      rowKey: resourceRowKey,
      rowType: 'resourceCapacity',
      rowLabel: resource.description?.trim()
        ? `${resource.productionResourceId} — ${resource.description}`
        : resource.productionResourceId,
      unitOfMeasure: 'Hours',
      resource,
      keyFigure: 'Capacity Hours',
      values: resourceValues,
      unavailableReasons: {},
      additionalClasses: {},
      locationDescriptionCols: { productionResourceId: resource.productionResourceId },
      materialDescriptionCols: {},
      hierarchyDepth: 0,
      hierarchyExpandable: resource.materials.length > 0,
    };

    const materialRows = resource.materials.map((material) => ({
      rowKey: `${resourceRowKey}::material::${material.materialId}`,
      rowType: 'materialProduction' as const,
      rowLabel: material.description?.trim() ? `${material.materialId} — ${material.description}` : material.materialId,
      unitOfMeasure: material.unitOfMeasureId,
      resource,
      material,
      keyFigure: 'Planned Production-Working Plan',
      values: Object.fromEntries(planningBook.periodEndDates.map((periodEndDate, periodIndex) => [
        periodEndDate,
        material.plannedQuantityByPeriod[periodIndex] ?? null,
      ])),
      unavailableReasons: {},
      additionalClasses: {},
      locationDescriptionCols: { productionResourceId: resource.productionResourceId },
      materialDescriptionCols: { materialId: material.materialId },
      hierarchyParentRowKey: resourceRowKey,
      hierarchyDepth: 1,
      hierarchyExpandable: false,
    }));

    return [resourceRow, ...materialRows];
  });
}

/** A browser-side validation only; it never coerces an invalid quantity. */
export function isValidPlannedQuantity(value: number): boolean {

  return Number.isFinite(value) && value >= 0;
}

/** Keeps the generic Location catalog from widening the production-book scope. */
export function filterProductionPlanningBookLocations(
  locations: ProductionPlanningLocationOption[],
): ProductionPlanningLocationOption[] {

  return locations.filter((location) => location.showInProductionPlanningBook === true);
}
