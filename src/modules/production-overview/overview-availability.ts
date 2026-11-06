/** A total is available only if all contributing values are present and finite. */
export function hasCompleteValues<T extends object>(rows: readonly T[], field: keyof T): boolean {
  return rows.length > 0 && rows.every((row) => {
    const value = row[field];
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  });
}

/** Include a gap only when both complete series can be compared. */
export function availableValues<T extends object>(row: T, name: string, constrainedField: keyof T, unconstrainedField: keyof T, constrainedAvailable: boolean, unconstrainedAvailable: boolean): Array<[string, string, number]> {
  const constrained = constrainedAvailable ? Number(row[constrainedField]) : undefined;
  const unconstrained = unconstrainedAvailable ? Number(row[unconstrainedField]) : undefined;
  const values: Array<[string, string, number]> = [];
  if (constrained !== undefined) values.push(['Constrained', name, constrained]);
  if (unconstrained !== undefined) values.push(['Unconstrained', name, unconstrained]);
  if (constrained !== undefined && unconstrained !== undefined) values.push(['Gap vs Unconstrained', name, unconstrained - constrained]);
  return values;
}
