/**
 * Structural, edition-neutral representation of the recursive Planning Book
 * response. Product modules retain ownership of endpoint DTOs and may map
 * them to these contracts without placing their API concerns in this package.
 */
export type PlanningBookDescriptorMap = Record<string, unknown>;

/** A key figure exposes values but intentionally does not define edit policy. */
export interface PlanningBookKeyFigure<TValue = unknown> {
  keyFigure: string;
  values: Readonly<Record<string, TValue>>;
}

/**
 * Recursive group returned by a Planning Book. Descriptor maps can be split
 * between ancestor and child groups; flattening materializes their inheritance.
 */
export interface PlanningBookGroup<
  TLocationMap extends PlanningBookDescriptorMap = PlanningBookDescriptorMap,
  TMaterialMap extends PlanningBookDescriptorMap = PlanningBookDescriptorMap,
  TValue = unknown,
> {
  locationDescriptionCols?: Readonly<TLocationMap>;
  materialDescriptionCols?: Readonly<TMaterialMap>;
  keyFigures?: readonly PlanningBookKeyFigure<TValue>[];
  subGroups?: readonly PlanningBookGroup<TLocationMap, TMaterialMap, TValue>[];
}

/**
 * A flattened key-figure row preserves the raw group topology as well as the
 * fully inherited descriptor maps. Consumers can therefore render aggregates,
 * leaf rows or breadcrumbs without reconstructing recursion themselves.
 */
export interface FlattenedPlanningBookRow<
  TLocationMap extends PlanningBookDescriptorMap = PlanningBookDescriptorMap,
  TMaterialMap extends PlanningBookDescriptorMap = PlanningBookDescriptorMap,
  TValue = unknown,
> {
  keyFigure: PlanningBookKeyFigure<TValue>;
  group: PlanningBookGroup<TLocationMap, TMaterialMap, TValue>;
  parentGroup: PlanningBookGroup<TLocationMap, TMaterialMap, TValue> | undefined;
  groupPath: readonly PlanningBookGroup<TLocationMap, TMaterialMap, TValue>[];
  locationDescriptionCols: Readonly<TLocationMap>;
  materialDescriptionCols: Readonly<TMaterialMap>;
}

/** A presentation-only column. Product pages own formatting and editability. */
export interface PlanningBookGridColumn<TRow = unknown> {
  id: string;
  label: string;
  getValue?: (row: TRow) => unknown;
  headerClass?: string;
  cellClass?: string;
}

/** Input contract of the presentational grid. It contains no update callback. */
export interface PlanningBookGridProps<TRow = unknown> {
  rows: readonly TRow[];
  columns: readonly PlanningBookGridColumn<TRow>[];
  rowKey?: (row: TRow, rowIndex: number) => string | number;
  emptyMessage?: string;
}
