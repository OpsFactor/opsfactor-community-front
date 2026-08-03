/**
 * Community contract for the material/location Supply Planning Book.
 *
 * The module deliberately models only the Working Plan grid returned by the
 * Community API. It contains no reference version, aggregation selection,
 * detail contributors, line scheduling, or Enterprise key figures.
 */
export type SupplyPlanningBookEditMode = 'cellEdit' | 'detailEdit' | 'detailOrCellEdit' | string;

/** Canonical Community endpoints for on-demand cell detail read/write. */
export const SUPPLY_PLANNING_BOOK_DETAIL_ENDPOINTS = {
  read: '/api/secured/planning/supply/planningbook/detail',
  update: '/api/secured/planning/supply/planningbook/detail/update',
} as const;

export interface SupplyPlanningBookColumn {
  field: string;
  name: string;
  dataColumn?: boolean;
  dimension?: 'material' | 'location' | string;
  enableCellEdit?: boolean;
}

export interface SupplyPlanningBookKeyFigure {
  keyFigure: string;
  values: Record<string, number | null | undefined>;
  editMode?: SupplyPlanningBookEditMode;
  unavailableReasons?: Record<string, string | undefined>;
  additionalClasses?: Record<string, string[] | undefined>;
}

export interface SupplyPlanningBookGroup {
  locationDescriptionCols?: Record<string, string>;
  materialDescriptionCols?: Record<string, string>;
  keyFigures: SupplyPlanningBookKeyFigure[];
  subGroups?: SupplyPlanningBookGroup[];
}

export interface SupplyPlanningBook {
  viewName: string;
  viewType: string;
  autoSubmitChanges: boolean;
  keyFigures: string[];
  columnDefs: SupplyPlanningBookColumn[];
  groups: SupplyPlanningBookGroup[];
  periodList: string[];
  bucketSize: string;
  uom: string;
  errorMessage?: string[];
}

export interface SupplyPlanOption {
  supplyPlanId: number;
  description: string | null;
}

export interface SupplyPlanningBookView {
  viewName: string;
  viewType?: string;
}

export interface SupplyPlanningBookLocation {
  id: string;
  description: string | null;
}

export interface SupplyPlanningBookSelection {
  planId: string;
  viewName: string;
  locationId: string;
}

/**
 * The backend validates an update list as one homogeneous operation. The
 * Community page therefore sends exactly one element per user edit.
 */
export interface SupplyPlanningBookCellUpdate {
  planId: string;
  viewType: string;
  viewName: string;
  locationId: string;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  period: string;
  uom: string;
  oldValue: number;
  newValue: number;
}

/**
 * Minimal identity of a material/location cell used to request its server-side
 * detail lines. The Community endpoint deliberately does not receive a
 * reference plan, aggregate parent, batch selection, or mutable UOM.
 */
export interface SupplyPlanningBookDetailSelection {
  planId: string;
  viewName: string;
  locationId: string;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  period: string;
}

export interface SupplyPlanningBookDetailColumn {
  headerName: string;
  field: string;
  width?: number;
  editable?: boolean;
}

/**
 * Server snapshot edited by the detail endpoint. Detail lines remain opaque
 * records because their columns vary by the selected public key figure.
 */
export interface SupplyPlanningBookCellDetails {
  planId: string;
  viewName: string;
  materialId: string;
  locationId: string;
  keyFigure: string;
  tipoPlano?: string;
  period: string;
  detailLines: Array<Record<string, unknown>>;
  columnDefs: SupplyPlanningBookDetailColumn[];
}

export interface SupplyPlanningBookRow {
  rowKey: string;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  editMode: SupplyPlanningBookEditMode;
  values: Record<string, number | null | undefined>;
  unavailableReasons: Record<string, string | undefined>;
  additionalClasses: Record<string, string[] | undefined>;
}
