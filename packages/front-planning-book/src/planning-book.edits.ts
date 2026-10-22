import type {
  PlanningBookColumnDefDto,
  PlanningBookDto,
  PlanningBookRow,
  PlanningBookSelectedCellDto,
} from './planning-book.dto.js';
import { resolvePlanningBookPeriodFromField } from './planning-book.normalization.js';

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
    period: resolvePlanningBookPeriodFromField(planningBook, field),
    uom: planningBook.uom,
    oldValue,
    newValue,
  };
}

export function buildPlanningBookSelectedCellKey(cell: PlanningBookSelectedCellDto) {
  return [
    cell.viewName,
    cell.locationId ?? '',
    cell.keyFigure,
    cell.period,
    stableRecordKey(cell.locationDescriptionCols),
    stableRecordKey(cell.materialDescriptionCols),
  ].join('::');
}
