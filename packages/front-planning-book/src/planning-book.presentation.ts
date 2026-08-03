/**
 * Formats a scalar Planning Book cell without importing any product DTO,
 * editing policy or API concern. The grid uses this fallback when a consuming
 * edition does not provide a dedicated cell slot.
 */
export function displayPlanningBookGridCellValue(value: unknown): string {

  return value === null || value === undefined || value === '' ? '—' : String(value);
}
