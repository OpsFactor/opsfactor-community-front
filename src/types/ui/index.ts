export interface OfxFilterChip {
  key: string;
  label: string;
}

export interface OfxContextMetric {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export type { OfxSelectOption } from '@opsfactor/front-shell';

/** Table rendering contracts are shared by both editions through Community. */
export type { OfxTableColumn, OfxTableDataType } from '@opsfactor/front-shell';
