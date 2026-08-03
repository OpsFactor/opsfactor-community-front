import type {
  PlanningBookDto,
  PlanningBookGroupDto,
  PlanningBookNormalized,
  PlanningBookRow,
} from './planning-book.dto.js';

/** Resolves the display field used by the legacy Planning Book for a period. */
export function summarizePlanningBookPeriod(period: string, bucketSize: string) {

  if (period === 'Average Historical Sales') return period;
  if (bucketSize === 'DIARIO' || bucketSize === 'SEMANAL' || bucketSize === 'MENSAL') return period.slice(0, 10);
  return period;
}

export function getPlanningBookPeriodField(dto: PlanningBookDto, period: string) {

  const summarizedPeriod = summarizePlanningBookPeriod(period, dto.bucketSize);
  const matchingColumn = dto.columnDefs.find((column) => Boolean(column.dataColumn)
    && (column.field === summarizedPeriod || column.field === period || column.name === summarizedPeriod));

  return matchingColumn?.field ?? summarizedPeriod;
}

export function resolvePlanningBookPeriodFromField(dto: PlanningBookDto, field: string) {

  const matchingColumn = dto.columnDefs.find((column) => Boolean(column.dataColumn)
    && (column.field === field || column.name === field));
  const candidateField = matchingColumn?.field ?? field;
  const matchingPeriod = dto.periodList.find((period) => period === candidateField
    || summarizePlanningBookPeriod(period, dto.bucketSize) === candidateField);

  return matchingPeriod ? getPlanningBookPeriodField(dto, matchingPeriod) : candidateField;
}

function appendHashSegment(hash: string, values: Record<string, string>) {

  if (values.locationId) return `${hash}${values.locationId}`;
  if (values.materialId) return `${hash}-${values.materialId}`;

  return Object.keys(values).sort().reduce((nextHash, key) => `${nextHash}-${key}-${values[key]}`, hash);
}

function normalizeDimensionValues(
  inheritedValues: Record<string, string> | undefined,
  groupValues: Record<string, string> | undefined,
) {

  return { ...(inheritedValues ?? {}), ...(groupValues ?? {}) };
}

function createPlanningBookRow(
  dto: PlanningBookDto,
  baseRow: Record<string, unknown>,
  keyFigure: PlanningBookGroupDto['keyFigures'][number],
  rowKey: string,
  ancestorKeys: string[],
  depth: number,
  isPrimaryKeyFigureRow: boolean,
  isDetailedRow: boolean,
): PlanningBookRow {

  const row: PlanningBookRow = {
    ...baseRow,
    rowKey,
    parentRowKey: ancestorKeys.length > 0 ? ancestorKeys[ancestorKeys.length - 1] : undefined,
    ancestorKeys,
    level: depth,
    treeDepth: depth,
    rowOrder: -1,
    hasChildren: false,
    keyFigure: keyFigure.keyFigure,
    groupLabel: '',
    isPrimaryKeyFigureRow,
    isDetailedRow,
    hierarchyVariant: isDetailedRow
      ? (isPrimaryKeyFigureRow ? 'detail-total' : 'detail-key-figure')
      : (isPrimaryKeyFigureRow ? 'group-total' : 'group-key-figure'),
    uom: dto.uom,
    editMode: keyFigure.editMode ?? 'noEdit',
    materialId: typeof baseRow.materialId === 'string' ? baseRow.materialId : undefined,
    locationId: typeof baseRow.locationId === 'string' ? baseRow.locationId : undefined,
    toolTips: undefined,
    unavailableReasons: undefined,
    additionalClasses: undefined,
    updatedCells: undefined,
    lockedCells: undefined,
    aggregationNumerators: undefined,
    aggregationDenominators: undefined,
  };

  dto.periodList.forEach((period) => {
    const field = getPlanningBookPeriodField(dto, period);
    const value = keyFigure.values?.[period];

    if (keyFigure.unavailableReasons?.[period] !== undefined) {
      row[field] = null;
      row.unavailableReasons ??= {};
      row.unavailableReasons[field] = keyFigure.unavailableReasons[period];
    } else {
      row[field] = value ?? 0;
    }

    const aggregatedNumerator = keyFigure.aggregatedNumerator?.[period];
    if (typeof aggregatedNumerator === 'number') {
      row.aggregationNumerators ??= {};
      row.aggregationNumerators[field] = aggregatedNumerator;
    }

    const aggregatedDenominator = keyFigure.aggregatedDenominator?.[period];
    if (typeof aggregatedDenominator === 'number') {
      row.aggregationDenominators ??= {};
      row.aggregationDenominators[field] = aggregatedDenominator;
    }

    if (keyFigure.toolTips?.[period] !== undefined) {
      row.toolTips ??= {};
      row.toolTips[field] = keyFigure.toolTips[period];
    }

    if (keyFigure.additionalClasses?.[period] !== undefined) {
      row.additionalClasses ??= {};
      row.additionalClasses[field] = keyFigure.additionalClasses[period];
    }
  });

  return row;
}

function flattenGroup(
  dto: PlanningBookDto,
  rows: PlanningBookRow[],
  group: PlanningBookGroupDto,
  inheritedLocationValues: Record<string, string>,
  inheritedMaterialValues: Record<string, string>,
  ancestorGroupKeys: string[],
  depth: number,
) {

  const locationValues = normalizeDimensionValues(inheritedLocationValues, group.locationDescriptionCols);
  const materialValues = normalizeDimensionValues(inheritedMaterialValues, group.materialDescriptionCols);
  const baseRow: Record<string, unknown> = { ...locationValues, ...materialValues };
  let hash = '';

  if (Object.keys(locationValues).length > 0) hash = appendHashSegment(hash, locationValues);
  if (Object.keys(materialValues).length > 0) hash = appendHashSegment(hash, materialValues);

  const isDetailedRow = Boolean(locationValues.locationId || materialValues.materialId);
  const primaryKeyFigure = group.keyFigures[0];
  const primaryRowKey = `${hash}-${primaryKeyFigure.keyFigure}`.replace(/^-/, '');
  const primaryRow = createPlanningBookRow(
    dto, baseRow, primaryKeyFigure, primaryRowKey, ancestorGroupKeys, depth, true, isDetailedRow,
  );
  rows.push(primaryRow);

  const nextAncestorGroupKeys = [...ancestorGroupKeys, primaryRowKey];
  group.keyFigures.slice(1).forEach((keyFigure) => {
    rows.push(createPlanningBookRow(
      dto, baseRow, keyFigure, `${hash}-${keyFigure.keyFigure}`.replace(/^-/, ''), nextAncestorGroupKeys, depth, false, isDetailedRow,
    ));
  });
  group.subGroups?.forEach((subGroup) => {
    flattenGroup(dto, rows, subGroup, locationValues, materialValues, nextAncestorGroupKeys, depth + 1);
  });
  primaryRow.hasChildren = Boolean(group.keyFigures.length > 1 || (group.subGroups?.length ?? 0) > 0);
}

/** Converts the recursive server DTO into the visual hierarchy expected by AG Grid. */
export function normalizePlanningBook(dto: PlanningBookDto): PlanningBookNormalized {

  const rows: PlanningBookRow[] = [];
  const descriptorFields = dto.columnDefs
    .filter((column) => !column.dataColumn && column.field !== 'keyFigure' && column.dimension)
    .map((column) => column.field);
  const materialFields = dto.columnDefs
    .filter((column) => !column.dataColumn && column.field !== 'keyFigure' && column.dimension === 'material')
    .map((column) => column.field);
  const locationFields = dto.columnDefs
    .filter((column) => !column.dataColumn && column.field !== 'keyFigure' && column.dimension === 'location')
    .map((column) => column.field);

  dto.groups.forEach((group) => {
    flattenGroup(dto, rows, group, {}, {}, [], 0);
  });
  rows.forEach((row, index) => {
    row.rowOrder = index;
  });

  return {
    rows,
    periodFields: dto.periodList.map((period) => getPlanningBookPeriodField(dto, period)),
    periodLabels: Object.fromEntries(dto.columnDefs.filter((column) => column.dataColumn).map((column) => [column.field, column.name])),
    descriptorFields,
    materialFields,
    locationFields,
    maxLevel: rows.reduce((maxLevel, row) => Math.max(maxLevel, row.level), 0),
    firstKeyFigure: dto.keyFigures[0] ?? null,
  };
}

/** Picks one contributor per visible hierarchy branch for a selected subtotal key figure. */
export function selectPlanningBookSubtotalContributors(
  allRows: PlanningBookRow[],
  displayedRows: PlanningBookRow[],
  selectedKeyFigure: string,
  includeCollapsedSiblings: boolean,
) {

  const selectedRowByGroupOwner = new Map<string, PlanningBookRow>();
  allRows.forEach((row) => {
    if (row.keyFigure === selectedKeyFigure) {
      selectedRowByGroupOwner.set(row.isPrimaryKeyFigureRow ? row.rowKey : (row.parentRowKey ?? row.rowKey), row);
    }
  });

  const candidatesByRowKey = new Map<string, PlanningBookRow>();
  displayedRows.forEach((row) => {
    if (row.keyFigure === selectedKeyFigure) candidatesByRowKey.set(row.rowKey, row);
    if (includeCollapsedSiblings && row.isPrimaryKeyFigureRow) {
      const selectedSibling = selectedRowByGroupOwner.get(row.rowKey);
      if (selectedSibling) candidatesByRowKey.set(selectedSibling.rowKey, selectedSibling);
    }
  });

  return [...candidatesByRowKey.values()]
    .filter((candidate, _index, candidates) => {
      const candidateGroupOwnerKey = candidate.isPrimaryKeyFigureRow ? candidate.rowKey : (candidate.parentRowKey ?? candidate.rowKey);
      return !candidates.some((otherCandidate) => otherCandidate.rowKey !== candidate.rowKey
        && otherCandidate.ancestorKeys.includes(candidateGroupOwnerKey));
    })
    .sort((left, right) => left.rowOrder - right.rowOrder);
}

export type PlanningBookSubtotalCell = { value: number | null; unavailableReason?: string };
const RATIO_DENOMINATOR_TOLERANCE = 0.000000001;

/** Aggregates a Planning Book subtotal with the model published by the backend. */
export function aggregatePlanningBookSubtotalField(
  planningBook: PlanningBookDto,
  selectedKeyFigure: string,
  contributingRows: PlanningBookRow[],
  field: string,
): PlanningBookSubtotalCell {

  const aggregationModel = planningBook.aggregationModelByKeyFigure?.[selectedKeyFigure] ?? 'PADRAO';
  if (aggregationModel === 'RAZAO_ENTRE_SOMAS') {
    let aggregatedNumerator = 0;
    let aggregatedDenominator = 0;

    for (const row of contributingRows) {
      const numerator = row.aggregationNumerators?.[field];
      const denominator = row.aggregationDenominators?.[field];
      if (typeof numerator !== 'number' || !Number.isFinite(numerator)
        || typeof denominator !== 'number' || !Number.isFinite(denominator)) {
        return { value: null, unavailableReason: 'Ratio unavailable because at least one contributing component is missing or invalid.' };
      }
      aggregatedNumerator += numerator;
      aggregatedDenominator += denominator;
    }

    if (Math.abs(aggregatedDenominator) <= RATIO_DENOMINATOR_TOLERANCE) {
      return { value: null, unavailableReason: 'Ratio unavailable because the denominator total is zero.' };
    }
    return { value: aggregatedNumerator / aggregatedDenominator };
  }

  let aggregatedValue = 0;
  for (const row of contributingRows) {
    const unavailableReason = row.unavailableReasons?.[field];
    if (unavailableReason) return { value: null, unavailableReason };

    const currentValue = typeof row[field] === 'number' ? row[field] as number : Number(row[field] ?? 0);
    if (!Number.isFinite(currentValue)) {
      return { value: null, unavailableReason: 'Subtotal unavailable because at least one contributing value is invalid.' };
    }
    aggregatedValue += currentValue;
  }

  return { value: aggregatedValue };
}
