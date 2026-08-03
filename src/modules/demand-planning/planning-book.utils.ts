import type { PlanningBook, PlanningBookGroup, PlanningBookRow } from './planning-book.types';

function summarizePlanningBookPeriod(period: string, bucketSize: string): string {
  if (period === 'Average Historical Sales') return period;

  if (bucketSize === 'DIARIO' || bucketSize === 'SEMANAL' || bucketSize === 'MENSAL') {
    return period.slice(0, 10);
  }

  return period;
}

function periodField(planningBook: PlanningBook, period: string): string {
  const summarizedPeriod = summarizePlanningBookPeriod(period, planningBook.bucketSize);
  const matchingColumn = planningBook.columnDefs.find((column) =>
    column.dataColumn
    && (column.field === summarizedPeriod || column.field === period || column.name === summarizedPeriod),
  );

  return matchingColumn?.field ?? summarizedPeriod;
}

export function resolvePlanningBookPeriod(planningBook: PlanningBook, field: string): string {
  const matchingColumn = planningBook.columnDefs.find((column) =>
    column.dataColumn && (column.field === field || column.name === field),
  );
  const candidateField = matchingColumn?.field ?? field;
  const matchingPeriod = planningBook.periodList.find((period) =>
    period === candidateField || summarizePlanningBookPeriod(period, planningBook.bucketSize) === candidateField,
  );

  return matchingPeriod ?? candidateField;
}

function appendGroupRows(
  planningBook: PlanningBook,
  group: PlanningBookGroup,
  inheritedLocation: Record<string, string>,
  inheritedMaterial: Record<string, string>,
  rows: PlanningBookRow[],
): void {
  const locationDescriptionCols = { ...inheritedLocation, ...(group.locationDescriptionCols ?? {}) };
  const materialDescriptionCols = { ...inheritedMaterial, ...(group.materialDescriptionCols ?? {}) };

  const isDetailedRow = locationDescriptionCols.locationId !== undefined || materialDescriptionCols.materialId !== undefined;
  if (isDetailedRow) group.keyFigures.forEach((keyFigure) => {
    const rowKey = [locationDescriptionCols.locationId ?? '', materialDescriptionCols.materialId ?? '', keyFigure.keyFigure].join('::');
    rows.push({
      rowKey,
      locationDescriptionCols,
      materialDescriptionCols,
      keyFigure: keyFigure.keyFigure,
      editMode: keyFigure.editMode ?? 'noEdit',
      values: Object.fromEntries(planningBook.periodList.map((period) => [periodField(planningBook, period), keyFigure.values[period] ?? null])),
      unavailableReasons: Object.fromEntries(planningBook.periodList.map((period) => [periodField(planningBook, period), keyFigure.unavailableReasons?.[period]])),
      additionalClasses: Object.fromEntries(planningBook.periodList.map((period) => [periodField(planningBook, period), keyFigure.additionalClasses?.[period]])),
    });
  });

  group.subGroups?.forEach((subGroup) => appendGroupRows(planningBook, subGroup, locationDescriptionCols, materialDescriptionCols, rows));
}

export function flattenPlanningBook(planningBook: PlanningBook): PlanningBookRow[] {
  const rows: PlanningBookRow[] = [];
  planningBook.groups.forEach((group) => appendGroupRows(planningBook, group, {}, {}, rows));
  return rows;
}

export function getPlanningBookPeriodColumns(planningBook: PlanningBook) {
  return planningBook.columnDefs.filter((column) => column.dataColumn);
}

export function isCellEditMode(editMode: string): boolean {
  return editMode === 'cellEdit' || editMode === 'detailOrCellEdit';
}
