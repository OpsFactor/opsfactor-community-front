import type { PlanningBookVirtualGridColumn, PlanningBookVirtualGridRow } from '../planning-book.virtual-grid';
declare const _default: <TRow extends PlanningBookVirtualGridRow>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{} & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, never>, never> & {
        rows: readonly TRow[];
        columns: readonly PlanningBookVirtualGridColumn<TRow>[];
        emptyMessage?: string;
        busy?: boolean;
    } & Partial<{}>> & import("vue").PublicProps;
    expose(exposed: import("vue").ShallowUnwrapRef<{}>): void;
    attrs: any;
    slots: {
        cell?(properties: {
            row: TRow;
            column: PlanningBookVirtualGridColumn<TRow>;
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
//# sourceMappingURL=PlanningBookVirtualGrid.vue.d.ts.map