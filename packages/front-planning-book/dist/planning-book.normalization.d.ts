import type { PlanningBookDto, PlanningBookNormalized, PlanningBookRow } from './planning-book.dto.js';
/** Resolves the display field used by the legacy Planning Book for a period. */
export declare function summarizePlanningBookPeriod(period: string, bucketSize: string): string;
export declare function getPlanningBookPeriodField(dto: PlanningBookDto, period: string): string;
export declare function resolvePlanningBookPeriodFromField(dto: PlanningBookDto, field: string): string;
/** Converts the recursive server DTO into the visual hierarchy expected by AG Grid. */
export declare function normalizePlanningBook(dto: PlanningBookDto): PlanningBookNormalized;
/** Picks one contributor per visible hierarchy branch for a selected subtotal key figure. */
export declare function selectPlanningBookSubtotalContributors(allRows: PlanningBookRow[], displayedRows: PlanningBookRow[], selectedKeyFigure: string, includeCollapsedSiblings: boolean): PlanningBookRow[];
export type PlanningBookSubtotalCell = {
    value: number | null;
    unavailableReason?: string;
};
/** Aggregates a Planning Book subtotal with the model published by the backend. */
export declare function aggregatePlanningBookSubtotalField(planningBook: PlanningBookDto, selectedKeyFigure: string, contributingRows: PlanningBookRow[], field: string): PlanningBookSubtotalCell;
//# sourceMappingURL=planning-book.normalization.d.ts.map