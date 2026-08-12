import type { PlanningBookColumnDefDto, PlanningBookDto, PlanningBookRow, PlanningBookSelectedCellDto } from '../planning-book.dto.js';
type __VLS_Props = {
    planningBook: PlanningBookDto;
    height?: number | string;
    mode?: 'generic' | 'demand' | 'supply' | 'production';
    pendingEditCount?: number;
    isSaving?: boolean;
    orderedFields?: string[];
    pinnedFields?: string[];
    pendingEdits?: PlanningBookSelectedCellDto[];
    detailsEnabled?: boolean;
    themeMode?: 'light' | 'dark';
    /**
     * Lets an edition narrow the backend edit mode without forking the grid.
     * The canonical structural guards are always evaluated first.
     */
    isCellEditable?: (row: PlanningBookRow, field: string, column: PlanningBookColumnDefDto) => boolean;
};
declare var __VLS_1: {}, __VLS_3: {};
type __VLS_Slots = {} & {
    'header-leading'?: (props: typeof __VLS_1) => any;
} & {
    'header-actions'?: (props: typeof __VLS_3) => any;
};
declare const __VLS_component: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    edit: (payload: {
        row: PlanningBookRow;
        field: string;
        newValue: number;
        oldValue: number;
    }) => any;
    "unavailable-edit": (payload: {
        reason: string;
    }) => any;
    "request-details": (payload: {
        row: PlanningBookRow;
        field: string;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onEdit?: ((payload: {
        row: PlanningBookRow;
        field: string;
        newValue: number;
        oldValue: number;
    }) => any) | undefined;
    "onUnavailable-edit"?: ((payload: {
        reason: string;
    }) => any) | undefined;
    "onRequest-details"?: ((payload: {
        row: PlanningBookRow;
        field: string;
    }) => any) | undefined;
}>, {
    themeMode: "light" | "dark";
    mode: "generic" | "demand" | "supply" | "production";
    isSaving: boolean;
    pendingEditCount: number;
    orderedFields: string[];
    pinnedFields: string[];
    pendingEdits: PlanningBookSelectedCellDto[];
    detailsEnabled: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=LegacyPlanningBookGrid.vue.d.ts.map