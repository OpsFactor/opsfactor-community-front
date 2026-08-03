import type { PlanningBookGridColumn, PlanningBookGridProps } from '../planning-book.model.js';
declare const _default: <TRow = unknown>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{} & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, never>, never> & PlanningBookGridProps<TRow> & Partial<{}>> & import("vue").PublicProps;
    expose(exposed: import("vue").ShallowUnwrapRef<{}>): void;
    attrs: any;
    slots: {
        header?(properties: {
            column: PlanningBookGridColumn<TRow>;
            columnIndex: number;
        }): unknown;
        cell?(properties: {
            row: TRow;
            rowIndex: number;
            column: PlanningBookGridColumn<TRow>;
            columnIndex: number;
            value: unknown;
        }): unknown;
        empty?(): unknown;
    };
    emit: {};
}>) => import("vue").VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_PrettifyLocal<T> = {
    [K in keyof T]: T[K];
} & {};
//# sourceMappingURL=PlanningBookGrid.vue.d.ts.map