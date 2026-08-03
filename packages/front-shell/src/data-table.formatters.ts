import type { OfxTableColumn, OfxTableDataType } from './data-table.types.js';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const DEFAULT_EMPTY_VALUE_LABEL = '—';

function getNumberFormatter(minimumFractionDigits: number, maximumFractionDigits: number) {
  const key = `${minimumFractionDigits}-${maximumFractionDigits}`;
  if (!numberFormatters.has(key)) {
    numberFormatters.set(key, new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits }));
  }

  return numberFormatters.get(key)!;
}

export function normalizeNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatNumeric(value: unknown, digits: number, emptyValueLabel = DEFAULT_EMPTY_VALUE_LABEL) {
  const normalized = normalizeNumber(value);
  if (normalized == null) return emptyValueLabel;
  const whole = Number.isInteger(normalized);
  return getNumberFormatter(whole ? 0 : digits, whole ? 0 : digits).format(normalized);
}

function formatPercent(value: unknown, digits: number, emptyValueLabel = DEFAULT_EMPTY_VALUE_LABEL) {
  const normalized = normalizeNumber(value);
  if (normalized == null) return emptyValueLabel;
  const whole = Number.isInteger(normalized);
  return `${getNumberFormatter(whole ? 0 : digits, whole ? 0 : digits).format(normalized)}%`;
}

function formatFractionPercent(value: unknown, digits: number, emptyValueLabel = DEFAULT_EMPTY_VALUE_LABEL) {
  const normalized = normalizeNumber(value);
  if (normalized == null) return emptyValueLabel;
  const percentValue = normalized * 100;
  const whole = Number.isInteger(percentValue);
  return `${getNumberFormatter(whole ? 0 : digits, whole ? 0 : digits).format(percentValue)}%`;
}

function formatDate(value: unknown, includeTime: boolean, emptyValueLabel = DEFAULT_EMPTY_VALUE_LABEL) {
  const date = normalizeDate(value);
  if (!date) return emptyValueLabel;
  const options: Intl.DateTimeFormatOptions = includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
}

export function formatBooleanNullable(value: unknown) {
  if (value === true) return 'Checked';
  if (value === false) return 'Unchecked';
  return 'Empty';
}

export function formatDisplayValue(dataType: OfxTableDataType | undefined, value: unknown, emptyValueLabel = DEFAULT_EMPTY_VALUE_LABEL) {
  switch (dataType) {
    case 'currency-2': return formatNumeric(value, 2, emptyValueLabel);
    case 'currency-0': return formatNumeric(value, 0, emptyValueLabel);
    case 'number-2': return formatNumeric(value, 2, emptyValueLabel);
    case 'number-1': return formatNumeric(value, 1, emptyValueLabel);
    case 'number-0': return formatNumeric(value, 0, emptyValueLabel);
    case 'percent-2': return formatPercent(value, 2, emptyValueLabel);
    case 'percent-1': return formatPercent(value, 1, emptyValueLabel);
    case 'percent-0': return formatPercent(value, 0, emptyValueLabel);
    case 'fraction-percent-2': return formatFractionPercent(value, 2, emptyValueLabel);
    case 'fraction-percent-1': return formatFractionPercent(value, 1, emptyValueLabel);
    case 'fraction-percent-0': return formatFractionPercent(value, 0, emptyValueLabel);
    case 'date': return formatDate(value, false, emptyValueLabel);
    case 'datetime': return formatDate(value, true, emptyValueLabel);
    case 'boolean-nullable': return value === true ? '☑' : value === false ? '☐' : emptyValueLabel;
    case 'text':
    default: return value == null || value === '' ? emptyValueLabel : String(value);
  }
}

export function getColumnAlignment(column: OfxTableColumn) {
  if (column.dataType === 'boolean-nullable') return 'center';
  return column.align ?? 'left';
}

export function compareTypedValues(dataType: OfxTableDataType | undefined, left: unknown, right: unknown) {
  switch (dataType) {
    case 'currency-2': case 'currency-0': case 'number-2': case 'number-1': case 'number-0':
    case 'percent-2': case 'percent-1': case 'percent-0':
    case 'fraction-percent-2': case 'fraction-percent-1': case 'fraction-percent-0': {
      const first = normalizeNumber(left);
      const second = normalizeNumber(right);
      if (first == null && second == null) return 0;
      if (first == null) return -1;
      if (second == null) return 1;
      return first - second;
    }
    case 'date': case 'datetime':
      return (normalizeDate(left)?.getTime() ?? Number.NEGATIVE_INFINITY) - (normalizeDate(right)?.getTime() ?? Number.NEGATIVE_INFINITY);
    case 'boolean-nullable': {
      const rank = (value: unknown) => (value === true ? 2 : value === false ? 1 : 0);
      return rank(left) - rank(right);
    }
    case 'text':
    default: return String(left ?? '').localeCompare(String(right ?? ''), 'en-US', { sensitivity: 'base' });
  }
}

export function getBooleanFilterValues() { return ['Checked', 'Unchecked', 'Empty']; }
export function mapBooleanFilterValue(value: unknown) { return formatBooleanNullable(value); }
