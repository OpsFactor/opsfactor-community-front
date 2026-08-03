/** Neutral column metadata supplied by either edition's Planning Book DTO. */
type PlanningBookCellDetailColumnDef = {
    headerName?: string;
    field?: string;
    width?: number | string;
    editable?: boolean;
};
/**
 * The dialog owns only editable grid presentation. Plan identity and update
 * transport remain owned by the calling edition.
 */
type PlanningBookCellDetails = {
    planId: string | number;
    viewName: string;
    materialId?: string | null;
    locationId?: string | null;
    keyFigure: string;
    period: string;
    detailLines: Record<string, unknown>[];
    columnDefs: PlanningBookCellDetailColumnDef[];
};
type __VLS_Props = {
    open: boolean;
    details: PlanningBookCellDetails | null;
    title: string;
    description?: string;
    themeMode?: 'light' | 'dark';
    isLoading?: boolean;
    isSubmitting?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
    submit: (details: PlanningBookCellDetails) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClose?: (() => any) | undefined;
    onSubmit?: ((details: PlanningBookCellDetails) => any) | undefined;
}>, {
    description: string;
    themeMode: "light" | "dark";
    isLoading: boolean;
    isSubmitting: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
//# sourceMappingURL=PlanningBookDetailsDialog.vue.d.ts.map