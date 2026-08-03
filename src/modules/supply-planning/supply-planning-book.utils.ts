import type {
  SupplyPlanningBook,
  SupplyPlanningBookColumn,
  SupplyPlanningBookGroup,
  SupplyPlanningBookRow,
} from './supply-planning-book.types';

const DETAIL_KEY_FIGURE_PREFIXES = [
  'Indirect Demand-',
  'Planned Production-',
  'Planned Inbound-',
];

const EDITABLE_DETAIL_KEY_FIGURES = new Set([
  'Planned Production-Working Plan',
  'Planned Inbound-Working Plan',
]);

/** Maps a canonical backend period to the field used by the returned table. */
function periodField(planningBook: SupplyPlanningBook, period: string): string {

  const matchingColumn = planningBook.columnDefs.find((column) =>
    column.dataColumn && (column.field === period || column.name === period || column.field === period.slice(0, 10)),
  );

  return matchingColumn?.field ?? period.slice(0, 10);
}

/** Resolves a visual table field back to the exact period expected by the API. */
export function resolveSupplyPlanningBookPeriod(planningBook: SupplyPlanningBook, field: string): string {

  const matchingColumn = planningBook.columnDefs.find((column) =>
    column.dataColumn && (column.field === field || column.name === field),
  );
  const candidate = matchingColumn?.field ?? field;

  return planningBook.periodList.find((period) => period === candidate || period.slice(0, 10) === candidate) ?? candidate;
}

function appendLeafRows(
  planningBook: SupplyPlanningBook,
  group: SupplyPlanningBookGroup,
  inheritedLocation: Record<string, string>,
  inheritedMaterial: Record<string, string>,
  rows: SupplyPlanningBookRow[],
): void {

  const locationDescriptionCols = { ...inheritedLocation, ...(group.locationDescriptionCols ?? {}) };
  const materialDescriptionCols = { ...inheritedMaterial, ...(group.materialDescriptionCols ?? {}) };
  const isMaterialLocationLeaf = locationDescriptionCols.locationId !== undefined && materialDescriptionCols.materialId !== undefined;

  if (isMaterialLocationLeaf) {
    group.keyFigures.forEach((keyFigure) => {
      const rowKey = [locationDescriptionCols.locationId, materialDescriptionCols.materialId, keyFigure.keyFigure].join('::');
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
  }

  group.subGroups?.forEach((subGroup) => appendLeafRows(planningBook, subGroup, locationDescriptionCols, materialDescriptionCols, rows));
}

/** Flattens only material/location leaves; Community intentionally has no aggregate rows. */
export function flattenSupplyPlanningBook(planningBook: SupplyPlanningBook): SupplyPlanningBookRow[] {

  const rows: SupplyPlanningBookRow[] = [];
  planningBook.groups.forEach((group) => appendLeafRows(planningBook, group, {}, {}, rows));
  return rows;
}

export function getSupplyPlanningBookPeriodColumns(planningBook: SupplyPlanningBook): SupplyPlanningBookColumn[] {

  return planningBook.columnDefs.filter((column) => column.dataColumn);
}

export function isSupplyPlanningBookCellEditMode(editMode: string): boolean {

  return editMode === 'cellEdit' || editMode === 'detailOrCellEdit';
}

/**
 * Community exposes the detail drawer only for public key figures whose
 * backend detail contracts exist. Stock stays an immediate grid adjustment.
 */
export function supportsSupplyPlanningBookDetails(keyFigure: string): boolean {

  return DETAIL_KEY_FIGURE_PREFIXES.some((prefix) => keyFigure.startsWith(prefix));
}

/**
 * Detail mutation is narrower than detail reading: only Working Plan planned
 * production/inbound quantities may be sent back to Community. Synthetic
 * production versions cannot be safely reconstructed from a browser edit.
 */
export function isSupplyPlanningBookDetailQuantityEditable(
  keyFigure: string,
  detailLine: Record<string, unknown>,
): boolean {

  return EDITABLE_DETAIL_KEY_FIGURES.has(keyFigure)
    && detailLine['Production Version Id'] !== 'No Prod Version';
}
