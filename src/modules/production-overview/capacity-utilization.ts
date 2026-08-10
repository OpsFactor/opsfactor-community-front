export const CAPACITY_WARNING_THRESHOLD_PERCENT = 80;
export const CAPACITY_OVERLOAD_THRESHOLD_PERCENT = 99.9;

type CapacityUtilizationTone = 'warning' | 'overload';

/** Keeps the same capacity-alert thresholds and colors as the canonical Planning Front grid. */
function getCapacityUtilizationTone(percent: unknown): CapacityUtilizationTone | null {

  const numeric = typeof percent === 'number' ? percent : Number(percent ?? Number.NaN);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= CAPACITY_OVERLOAD_THRESHOLD_PERCENT) return 'overload';
  if (numeric > CAPACITY_WARNING_THRESHOLD_PERCENT) return 'warning';

  return null;

}

/** Highlights warning and overloaded resource-period cells without changing their physical values. */
export function getCapacityUtilizationCellStyle(percent: unknown): Record<string, string> | undefined {

  const tone = getCapacityUtilizationTone(percent);
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

  if (tone === 'overload') {
    return isLightTheme
      ? { backgroundColor: 'rgba(248, 113, 113, 0.28)', color: '#7f1d1d' }
      : { backgroundColor: 'rgba(233, 109, 109, 0.28)', color: '#fff5f5' };
  }

  if (tone === 'warning') {
    return isLightTheme
      ? { backgroundColor: 'rgba(245, 158, 11, 0.24)', color: '#7c2d12' }
      : { backgroundColor: 'rgba(240, 171, 54, 0.24)', color: '#fff7e8' };
  }

  return undefined;

}
