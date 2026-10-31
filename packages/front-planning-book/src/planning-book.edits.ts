import type {
  PlanningBookColumnDefDto,
  PlanningBookDto,
  PlanningBookRow,
  PlanningBookSelectedCellDto,
} from './planning-book.dto.js';
import { resolvePlanningBookPeriodFromField } from './planning-book.normalization.js';

/** Historical values belong to the source history, never to forecast collaboration. */
export function isPlanningBookReadOnlyColumn(column: PlanningBookColumnDefDto) {

  return !column.dataColumn || column.enableCellEdit === false
    || column.cellClass?.split(/\s+/).includes('pastPeriods') === true
    || column.field === 'Average Historical Sales';

}

/** Guards payload construction as well as editor entry, including synthetic columns. */
export function resolvePlanningBookEditablePeriod(planningBook: PlanningBookDto, field: string) {

  const column = planningBook.columnDefs.find((candidate) => candidate.field === field || candidate.name === field);
  if (!column || isPlanningBookReadOnlyColumn(column)) {
    throw new Error('This Planning Book column is read-only.');
  }

  const period = resolvePlanningBookPeriodFromField(planningBook, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    throw new Error('A Planning Book update requires a calendar date.');
  }
  return period;

}

function normalizeDescriptorValue(value: unknown) {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function collectDescriptorValues(row: PlanningBookRow, columns: PlanningBookColumnDefDto[], dimension: 'material' | 'location') {
  return columns.reduce<Record<string, string>>((accumulator, column) => {
    if (column.dimension !== dimension) return accumulator;

    const value = normalizeDescriptorValue(row[column.field]);
    if (value) accumulator[column.field] = value;

    return accumulator;
  }, {});
}

function stableRecordKey(record: Record<string, string>) {
  return Object.keys(record)
    .sort()
    .map((key) => `${key}:${record[key]}`)
    .join('|');
}

export function buildPlanningBookSelectedCellDto(
  planningBook: PlanningBookDto,
  row: PlanningBookRow,
  field: string,
  newValue: number,
  oldValue: number,
  selection: {
    planId: string | number;
    referencePlanId?: string | number | null;
    viewName: string;
    locationId?: string | null;
  },
): PlanningBookSelectedCellDto {
  const period = resolvePlanningBookEditablePeriod(planningBook, field);
  const descriptorColumns = planningBook.columnDefs.filter((column) => !column.dataColumn && column.field !== 'keyFigure');
  const locationDescriptionCols = collectDescriptorValues(row, descriptorColumns, 'location');
  const materialDescriptionCols = collectDescriptorValues(row, descriptorColumns, 'material');

  return {
    planId: selection.planId,
    referencePlanId: selection.referencePlanId ?? undefined,
    viewType: planningBook.viewType,
    viewName: selection.viewName,
    locationId: selection.locationId ?? locationDescriptionCols.locationId ?? row.locationId ?? undefined,
    locationDescriptionCols,
    materialDescriptionCols,
    keyFigure: row.keyFigure,
    period,
    uom: planningBook.uom,
    oldValue,
    newValue,
  };
}

/** Indexes a row scope without manufacturing an editable cell or a fictitious date. */
export function buildPlanningBookRowScopeKey(planningBook: PlanningBookDto, row: PlanningBookRow) {

  const locationDescriptionCols = collectDescriptorValues(row, planningBook.columnDefs, 'location');
  return buildPlanningBookSelectedCellKey({
    viewName: planningBook.viewName,
    locationId: locationDescriptionCols.locationId ?? row.locationId,
    locationDescriptionCols,
    materialDescriptionCols: collectDescriptorValues(row, planningBook.columnDefs, 'material'),
    keyFigure: row.keyFigure,
    period: '',
  });

}

export function buildPlanningBookSelectedCellKey(cell: Pick<PlanningBookSelectedCellDto,
  'viewName' | 'locationId' | 'keyFigure' | 'period' | 'locationDescriptionCols' | 'materialDescriptionCols'>) {
  return [
    cell.viewName,
    cell.locationId ?? '',
    cell.keyFigure,
    cell.period,
    stableRecordKey(cell.locationDescriptionCols),
    stableRecordKey(cell.materialDescriptionCols),
  ].join('::');
}
