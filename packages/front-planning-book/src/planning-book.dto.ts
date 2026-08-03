/**
 * Edition-neutral DTO contracts required by the legacy Planning Book renderer.
 * Endpoints and workflow policies stay in the consuming product modules.
 */
export type PlanningBookEditMode =
  | 'cellEdit'
  | 'detailEdit'
  | 'detailOrCellEdit'
  | 'detailDisaggregatedOnly'
  | 'detailAggregatedDisaggregated'
  | 'noEdit'
  | string;

export type PlanningBookAggregationModel =
  | 'PADRAO'
  | 'RELACAO_ENTRE_VALORES'
  | 'RAZAO_ENTRE_SOMAS'
  | string;

export type PlanningBookColumnDefDto = {
  field: string;
  name: string;
  dataColumn?: boolean;
  dimension?: string;
  cellClass?: string;
  cellTemplate?: string;
  width?: string;
  enableCellEdit?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableHiding?: boolean;
  enablePinning?: boolean;
  pinnedLeft?: boolean;
  cellFilter?: string;
};

export type PlanningBookKeyFigureDto = {
  keyFigure: string;
  values: Record<string, number | null | undefined>;
  aggregatedNumerator?: Record<string, number | null | undefined>;
  aggregatedDenominator?: Record<string, number | null | undefined>;
  unavailableReasons?: Record<string, string | undefined>;
  toolTips?: Record<string, string | undefined>;
  additionalClasses?: Record<string, string[] | undefined>;
  editMode?: PlanningBookEditMode;
};

export type PlanningBookGroupDto = {
  locationDescriptionCols?: Record<string, string>;
  materialDescriptionCols?: Record<string, string>;
  keyFigures: PlanningBookKeyFigureDto[];
  subGroups?: PlanningBookGroupDto[];
};

export type PlanningBookDto = {
  viewName: string;
  viewType: string;
  autoSubmitChanges?: boolean;
  keyFigures: string[];
  aggregationModelByKeyFigure?: Record<string, PlanningBookAggregationModel>;
  columnDefs: PlanningBookColumnDefDto[];
  groups: PlanningBookGroupDto[];
  additionalParameters?: Record<string, string>;
  periodList: string[];
  bucketSize: string;
  uom: string;
  errorMessage?: string[];
};

export type PlanningBookSelectionDto = {
  viewName: string | null;
  planId: string | number;
  referencePlanId?: string | number | null;
  locationId?: string | null;
};

export type PlanningBookSelectedCellDto = {
  planId: string | number;
  referencePlanId?: string | number | null;
  viewType?: string;
  viewName: string;
  locationId?: string | null;
  locationDescriptionCols: Record<string, string>;
  materialDescriptionCols: Record<string, string>;
  keyFigure: string;
  period: string;
  uom: string;
  oldValue: number;
  newValue: number;
};

export type PlanningBookCellDetailColumnDefDto = {
  headerName?: string;
  field?: string;
  width?: number | string;
  editable?: boolean;
};

export type PlanningBookCellDetailsDto = {
  planId: string | number;
  viewName: string;
  materialId?: string | null;
  locationId?: string | null;
  keyFigure: string;
  period: string;
  detailLines: Record<string, unknown>[];
  columnDefs: PlanningBookCellDetailColumnDefDto[];
};

export type PlanningBookRow = Record<string, unknown> & {
  rowKey: string;
  parentRowKey?: string;
  ancestorKeys: string[];
  level: number;
  treeDepth: number;
  rowOrder: number;
  hasChildren: boolean;
  keyFigure: string;
  groupLabel: string;
  isPrimaryKeyFigureRow: boolean;
  isDetailedRow: boolean;
  hierarchyVariant: 'group-total' | 'group-key-figure' | 'detail-total' | 'detail-key-figure';
  uom: string;
  editMode: PlanningBookEditMode;
  materialId?: string;
  locationId?: string;
  toolTips?: Record<string, string | undefined>;
  unavailableReasons?: Record<string, string | undefined>;
  additionalClasses?: Record<string, string[] | undefined>;
  updatedCells?: Record<string, string | undefined>;
  lockedCells?: Record<string, string | undefined>;
  aggregationNumerators?: Record<string, number | undefined>;
  aggregationDenominators?: Record<string, number | undefined>;
};

export type PlanningBookNormalized = {
  rows: PlanningBookRow[];
  periodFields: string[];
  periodLabels: Record<string, string>;
  descriptorFields: string[];
  materialFields: string[];
  locationFields: string[];
  maxLevel: number;
  firstKeyFigure: string | null;
};
