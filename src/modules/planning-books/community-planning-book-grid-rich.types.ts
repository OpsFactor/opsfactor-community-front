/**
 * Minimum row shape shared by the three Community Planning Book screens.
 *
 * The contract deliberately contains presentation data only. Product modules
 * retain their own DTOs, mutation handlers and endpoint selections; this grid
 * must never infer a reference plan, an aggregate selection or a backend API.
 */
export interface CommunityPlanningBookRichRowBase {
  rowKey: string;
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

/** A local display column. It has no transport or persistence meaning. */
export interface CommunityPlanningBookRichColumn<TRow extends CommunityPlanningBookRichRowBase> {
  id: string;
  label: string;
  getValue?: (row: TRow) => unknown;
  headerClass?: string;
  cellClass?: string;
  width?: string;
  hierarchy?: boolean;
}
