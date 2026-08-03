/** Minimal workbook contract needed by the shared Production Planning grid. */
export interface ProductionPlanningBookGridWorkbook {
    dados: Array<Record<string, unknown>>;
    columnDefs: Array<{
        name: string;
        enableCellEdit?: boolean;
    }>;
}
/** Neutral row metadata derived solely for the Planning Book presentation. */
export type ProductionPlanningGridRow = Record<string, unknown> & {
    rowKey: string;
    treeDepth: number;
    ancestorKeys: string[];
    hasChildren: boolean;
    baseVisible: boolean;
    isEditable: boolean;
    line?: string;
};
type __VLS_Props = {
    workbook: ProductionPlanningBookGridWorkbook;
    height?: number | string;
    isSaving?: boolean;
    themeMode?: 'light' | 'dark';
};
declare var __VLS_1: {};
type __VLS_Slots = {} & {
    'header-actions'?: (props: typeof __VLS_1) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    edit: (payload: {
        row: ProductionPlanningGridRow;
        field: string;
        newValue: number;
        oldValue: number;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onEdit?: ((payload: {
        row: ProductionPlanningGridRow;
        field: string;
        newValue: number;
        oldValue: number;
    }) => any) | undefined;
}>, {
    themeMode: "light" | "dark";
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=ProductionPlanningBookGrid.vue.d.ts.map