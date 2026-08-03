export type PlanningBookEditMode = 'cellEdit' | 'detailEdit' | 'detailOrCellEdit' | string;

export interface PlanningBookColumn {
  field: string;
  name: string;
  dataColumn?: boolean;
  dimension?: 'material' | 'location' | string;
  enableCellEdit?: boolean;
}

export interface PlanningBookKeyFigure {
  keyFigure: string;
  values: Record<string, number | null | undefined>;
  editMode?: PlanningBookEditMode;
  unavailableReasons?: Record<string, string | undefined>;
  additionalClasses?: Record<string, string[] | undefined>;
}

export interface PlanningBookGroup {
  locationDescriptionCols?: Record<string, string>;
  materialDescriptionCols?: Record<string, string>;
  keyFigures: PlanningBookKeyFigure[];
  subGroups?: PlanningBookGroup[];
}

export interface PlanningBook {
  viewName: string;
  viewType: string;
  autoSubmitChanges: boolean;
  keyFigures: string[];
  columnDefs: PlanningBookColumn[];
  groups: PlanningBookGroup[];
  periodList: string[];
  bucketSize: string;
  uom: string;
  errorMessage?: string[];
}

export interface PlanningBookView {
  viewName: string;
  viewType?: string;
}

export interface PlanningBookSelection {
  planId: string;
  viewName: string;
}

export interface PlanningBookCellUpdate {
  planId: string;
  viewType: string;
  viewName: string;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  period: string;
  uom: string;
  oldValue: number;
  newValue: number;
}

export interface PlanningBookRow {
  rowKey: string;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  editMode: PlanningBookEditMode;
  values: Record<string, number | null | undefined>;
  unavailableReasons: Record<string, string | undefined>;
  additionalClasses: Record<string, string[] | undefined>;
}
