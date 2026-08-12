/**
 * Defines a source series that can be aggregated by the reusable pivot before
 * it reaches Perspective. Source values are temporal vectors, one value for
 * every configured column bucket.
 */
export type PivotBaseSeriesDefinition = {
  id: string;
  label?: string;
  visible?: boolean;
  kind: 'base';
  sourceField: string;
};

/**
 * Defines a semantic series calculated from the other series already
 * aggregated for the same pivot group. The calculator receives the complete
 * temporal vector because some domain metrics depend on future buckets too.
 */
export type PivotCustomSeriesDefinition = {
  id: string;
  label?: string;
  visible?: boolean;
  kind: 'custom';
  dependsOn: string[];
  calculate: (context: PivotCustomSeriesContext) => readonly number[];
};

export type PivotSeriesDefinition = PivotBaseSeriesDefinition | PivotCustomSeriesDefinition;

export type PivotCustomSeriesContext = {
  group: Readonly<Record<string, unknown>>;
  columnValues: readonly unknown[];
  series: Readonly<Record<string, readonly number[]>>;
};

/**
 * Optional data preparation contract for OfxPivotTable. It is deliberately
 * independent from Perspective so custom calculations stay in the owning
 * domain module and Perspective only renders final values.
 */
export type PivotSeriesAggregation = {
  columnField: string;
  columnValues: readonly unknown[];
  seriesField?: string;
  valueField?: string;
  series: readonly PivotSeriesDefinition[];
};

type AggregatedPivotGroup = {
  dimensions: Record<string, unknown>;
  sourceRows: Record<string, unknown>[];
};

/**
 * Builds long-form pivot records from temporal source series. Base series are
 * summed first, then custom series can calculate from those consolidated
 * vectors. Each produced group/series/bucket value is unique, so Perspective
 * only performs identity sums while rendering the configured leaf grain.
 */
export function buildPivotSeriesRows(
  sourceRows: readonly Record<string, unknown>[],
  rowDimensions: readonly string[],
  aggregation: PivotSeriesAggregation,
): Record<string, unknown>[] {

  const seriesField = aggregation.seriesField ?? 'metric';
  const valueField = aggregation.valueField ?? 'value';
  const groupDimensions = rowDimensions.filter((field) => field !== seriesField);
  const groups = groupSourceRows(sourceRows, groupDimensions);
  validateSeriesDefinitions(aggregation.series);

  return groups.flatMap((group) => {
    const calculatedSeries: Record<string, readonly number[]> = {};

    aggregation.series.forEach((definition) => {
      if (definition.kind === 'base') {
        calculatedSeries[definition.id] = sumSourceSeries(
          group.sourceRows,
          definition.sourceField,
          aggregation.columnValues.length,
          definition.id,
        );
        return;
      }

      definition.dependsOn.forEach((dependency) => {
        if (!calculatedSeries[dependency]) {
          throw new Error(`Custom pivot series "${definition.id}" depends on unavailable series "${dependency}".`);
        }
      });

      const values = definition.calculate({
        group: group.dimensions,
        columnValues: aggregation.columnValues,
        series: calculatedSeries,
      });
      calculatedSeries[definition.id] = validateCalculatedSeries(
        values,
        aggregation.columnValues.length,
        definition.id,
      );
    });

    return aggregation.series.filter((definition) => definition.visible !== false).flatMap((definition) => (
      calculatedSeries[definition.id].map((value, columnIndex) => ({
        ...group.dimensions,
        [seriesField]: definition.label ?? definition.id,
        [aggregation.columnField]: aggregation.columnValues[columnIndex],
        [valueField]: value,
      }))
    ));
  });
}

/** Groups source records according to the row fields controlled by the host page. */
function groupSourceRows(sourceRows: readonly Record<string, unknown>[], rowDimensions: readonly string[]): AggregatedPivotGroup[] {

  const groupsByKey = new Map<string, AggregatedPivotGroup>();

  sourceRows.forEach((sourceRow) => {
    const dimensions = Object.fromEntries(rowDimensions.map((field) => [field, sourceRow[field] ?? '']));
    const groupKey = JSON.stringify(rowDimensions.map((field) => dimensions[field]));
    const existingGroup = groupsByKey.get(groupKey);

    if (existingGroup) {
      existingGroup.sourceRows.push(sourceRow);
      return;
    }

    groupsByKey.set(groupKey, { dimensions, sourceRows: [sourceRow] });
  });

  return Array.from(groupsByKey.values());
}

/** Sums one temporal source field across all records contributing to a group. */
function sumSourceSeries(
  sourceRows: readonly Record<string, unknown>[],
  sourceField: string,
  numberOfColumns: number,
  seriesId: string,
): number[] {

  const aggregate = new Array<number>(numberOfColumns).fill(0);

  sourceRows.forEach((sourceRow) => {
    const values = sourceRow[sourceField];
    if (!Array.isArray(values) || values.length !== numberOfColumns) {
      throw new Error(`Base pivot series "${seriesId}" requires "${sourceField}" to contain ${numberOfColumns} temporal values.`);
    }

    values.forEach((value, columnIndex) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new Error(`Base pivot series "${seriesId}" contains a non-numeric value at bucket ${columnIndex}.`);
      }
      aggregate[columnIndex] += numericValue;
    });
  });

  return aggregate;
}

/** Validates the complete vector returned by a domain-owned custom calculation. */
function validateCalculatedSeries(values: readonly number[], numberOfColumns: number, seriesId: string): number[] {

  if (values.length !== numberOfColumns) {
    throw new Error(`Custom pivot series "${seriesId}" returned ${values.length} values for ${numberOfColumns} temporal buckets.`);
  }

  return values.map((value, columnIndex) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw new Error(`Custom pivot series "${seriesId}" returned a non-numeric value at bucket ${columnIndex}.`);
    }
    return numericValue;
  });
}

/** Rejects duplicate identifiers before evaluating dependencies in declaration order. */
function validateSeriesDefinitions(series: readonly PivotSeriesDefinition[]) {

  const seriesIds = new Set<string>();
  series.forEach((definition) => {
    if (!definition.id.trim()) {
      throw new Error('Pivot series requires a non-empty identifier.');
    }
    if (seriesIds.has(definition.id)) {
      throw new Error(`Pivot series identifier "${definition.id}" is declared more than once.`);
    }
    seriesIds.add(definition.id);
  });
}
