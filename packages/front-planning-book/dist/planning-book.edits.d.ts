import type { PlanningBookColumnDefDto, PlanningBookDto, PlanningBookRow, PlanningBookSelectedCellDto } from './planning-book.dto.js';
/** Historical values belong to the source history, never to forecast collaboration. */
export declare function isPlanningBookReadOnlyColumn(column: PlanningBookColumnDefDto): boolean;
/** Guards payload construction as well as editor entry, including synthetic columns. */
export declare function resolvePlanningBookEditablePeriod(planningBook: PlanningBookDto, field: string): string;
export declare function buildPlanningBookSelectedCellDto(planningBook: PlanningBookDto, row: PlanningBookRow, field: string, newValue: number, oldValue: number, selection: {
    planId: string | number;
    referencePlanId?: string | number | null;
    viewName: string;
    locationId?: string | null;
}): PlanningBookSelectedCellDto;
/** Indexes a row scope without manufacturing an editable cell or a fictitious date. */
export declare function buildPlanningBookRowScopeKey(planningBook: PlanningBookDto, row: PlanningBookRow): string;
export declare function buildPlanningBookSelectedCellKey(cell: Pick<PlanningBookSelectedCellDto, 'viewName' | 'locationId' | 'keyFigure' | 'period' | 'locationDescriptionCols' | 'materialDescriptionCols'>): string;
//# sourceMappingURL=planning-book.edits.d.ts.map