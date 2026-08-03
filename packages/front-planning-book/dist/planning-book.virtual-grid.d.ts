/** Presentation-only row capabilities used by the virtual Planning Book grid. */
export interface PlanningBookVirtualGridRow {
    rowKey: string;
    additionalClasses: Record<string, string[] | undefined>;
    hierarchyParentRowKey?: string;
    hierarchyDepth: number;
    hierarchyExpandable: boolean;
}
/** A virtualized display column; it deliberately has no persistence semantics. */
export interface PlanningBookVirtualGridColumn<TRow extends PlanningBookVirtualGridRow> {
    id: string;
    label: string;
    getValue?: (row: TRow) => unknown;
    headerClass?: string;
    cellClass?: string;
    width?: string;
    hierarchy?: boolean;
}
//# sourceMappingURL=planning-book.virtual-grid.d.ts.map