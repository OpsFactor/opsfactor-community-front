import type { PlanningBookDto, PlanningBookRow, PlanningBookSelectedCellDto } from './planning-book.dto.js';
/** Detects a conflict before a new value exists, so editing can require confirmation first. */
export declare function createDemandPlanningBookConflictFinder(book: PlanningBookDto, pendingEdits: PlanningBookSelectedCellDto[], bookRows?: PlanningBookRow[]): (edit: PlanningBookSelectedCellDto) => PlanningBookSelectedCellDto[];
/**
 * Stages a replacement without mutating the accepted batch. The caller must ask
 * before adopting pendingEdits when conflicts exist; cancellation keeps the old batch.
 * Only the same period and intersecting tree scopes compete. The backend remains
 * responsible for authoritative DFU membership/active-state validation before writing.
 */
export declare function proposeDemandPlanningBookEdit(book: PlanningBookDto, pendingEdits: PlanningBookSelectedCellDto[], edit: PlanningBookSelectedCellDto): {
    conflicts: PlanningBookSelectedCellDto[];
    pendingEdits: PlanningBookSelectedCellDto[];
};
/** Rebuilds the visible local values from the accepted batch, so cancel/removal restores the baseline. */
export declare function applyPendingPlanningBookEdits(book: PlanningBookDto, rows: PlanningBookRow[], pendingEdits: PlanningBookSelectedCellDto[]): void;
//# sourceMappingURL=planning-book.conflicts.d.ts.map