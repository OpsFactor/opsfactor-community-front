import type { PlanningBookDto, PlanningBookRow, PlanningBookSelectedCellDto } from './planning-book.dto.js';
export declare function buildPlanningBookSelectedCellDto(planningBook: PlanningBookDto, row: PlanningBookRow, field: string, newValue: number, oldValue: number, selection: {
    planId: string | number;
    referencePlanId?: string | number | null;
    viewName: string;
    locationId?: string | null;
}): PlanningBookSelectedCellDto;
export declare function buildPlanningBookSelectedCellKey(cell: PlanningBookSelectedCellDto): string;
//# sourceMappingURL=planning-book.edits.d.ts.map