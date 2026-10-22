import { buildPlanningBookSelectedCellDto, buildPlanningBookSelectedCellKey } from './planning-book.edits.js';
import { getPlanningBookPeriodField, normalizePlanningBook } from './planning-book.normalization.js';
import type { PlanningBookDto, PlanningBookRow, PlanningBookSelectedCellDto } from './planning-book.dto.js';

/** The server owns the family, including custom workflow components and quantity/financial aliases. */
function directDemandFamily(book: PlanningBookDto) {
  return new Set((book.additionalParameters?.directDemandAdjustmentKeyFigures ?? '')
    .split(/[|,]/).map((id) => id.trim()).filter(Boolean));
}

/** Identifies a row independently of its period and edited value. */
function editRowKey(edit: PlanningBookSelectedCellDto) {
  return buildPlanningBookSelectedCellKey({ ...edit, period: '' });
}

function indexEditRows(book: PlanningBookDto, rows: PlanningBookRow[]) {
  return new Map(rows.map((row) => {
    const edit = buildPlanningBookSelectedCellDto(book, row, '', 0, 0, { planId: '', viewName: book.viewName });
    return [editRowKey(edit), row];
  }));
}

/** Secondary key figures belong to their primary row's scope, not to a child material/location. */
function scopeOwner(row: PlanningBookRow) {
  return row.isPrimaryKeyFigureRow ? row.rowKey : row.parentRowKey ?? row.rowKey;
}

function scopesOverlap(left: PlanningBookRow, right: PlanningBookRow) {
  const leftOwner = scopeOwner(left);
  const rightOwner = scopeOwner(right);
  return leftOwner === rightOwner
    || left.ancestorKeys.includes(rightOwner)
    || right.ancestorKeys.includes(leftOwner);
}

/** Detects a conflict before a new value exists, so editing can require confirmation first. */
export function createDemandPlanningBookConflictFinder(
  book: PlanningBookDto,
  pendingEdits: PlanningBookSelectedCellDto[],
  bookRows: PlanningBookRow[] = normalizePlanningBook(book).rows,
) {
  const family = directDemandFamily(book);
  const rows = indexEditRows(book, bookRows);
  // AG Grid asks editability repeatedly. Index once per accepted batch, not once per cell.
  return (edit: PlanningBookSelectedCellDto) => {
    if (!family.has(edit.keyFigure) || !pendingEdits.length) return [];
    const key = buildPlanningBookSelectedCellKey(edit);
    const editedRow = rows.get(editRowKey(edit));
    if (!editedRow) return [];
    return pendingEdits.filter((pending) => {
      if (buildPlanningBookSelectedCellKey(pending) === key || !family.has(pending.keyFigure)
        || getPlanningBookPeriodField(book, pending.period) !== getPlanningBookPeriodField(book, edit.period)) return false;
      const pendingRow = rows.get(editRowKey(pending));
      return Boolean(pendingRow && scopesOverlap(editedRow, pendingRow));
    });
  };
}

/**
 * Stages a replacement without mutating the accepted batch. The caller must ask
 * before adopting pendingEdits when conflicts exist; cancellation keeps the old batch.
 * Only the same period and intersecting tree scopes compete. The backend remains
 * responsible for authoritative DFU membership/active-state validation before writing.
 */
export function proposeDemandPlanningBookEdit(
  book: PlanningBookDto,
  pendingEdits: PlanningBookSelectedCellDto[],
  edit: PlanningBookSelectedCellDto,
) {
  const key = buildPlanningBookSelectedCellKey(edit);
  const existing = pendingEdits.find((pending) => buildPlanningBookSelectedCellKey(pending) === key);
  const merged = { ...edit, oldValue: existing?.oldValue ?? edit.oldValue };
  const otherEdits = pendingEdits.filter((pending) => buildPlanningBookSelectedCellKey(pending) !== key);

  // Returning to the persisted value removes this edit; it creates no new conflict.
  if (merged.newValue === merged.oldValue) {
    return { conflicts: [] as PlanningBookSelectedCellDto[], pendingEdits: otherEdits };
  }

  const conflicts = createDemandPlanningBookConflictFinder(book, otherEdits)(edit);
  const conflictKeys = new Set(conflicts.map(buildPlanningBookSelectedCellKey));

  return {
    conflicts,
    pendingEdits: [...otherEdits.filter((pending) => !conflictKeys.has(buildPlanningBookSelectedCellKey(pending))), merged],
  };
}

/** Rebuilds the visible local values from the accepted batch, so cancel/removal restores the baseline. */
export function applyPendingPlanningBookEdits(
  book: PlanningBookDto,
  rows: PlanningBookRow[],
  pendingEdits: PlanningBookSelectedCellDto[],
) {
  const indexedRows = indexEditRows(book, rows);
  for (const edit of pendingEdits) {
    const row = indexedRows.get(editRowKey(edit));
    if (!row) continue;
    const field = getPlanningBookPeriodField(book, edit.period);
    row[field] = edit.newValue;
    row.updatedCells ??= {};
    row.updatedCells[field] = `Modified cell: from ${edit.oldValue} to ${edit.newValue}`;
  }
}
