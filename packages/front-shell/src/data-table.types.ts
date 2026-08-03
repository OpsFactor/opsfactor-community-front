/**
 * Edition-neutral description of a displayed table column.
 *
 * Feature pages may add their own business-specific fields to row objects, but
 * the rendering, filtering and export layer only needs this compact contract.
 */
export type OfxTableDataType =
  | 'text'
  | 'currency-2'
  | 'currency-0'
  | 'number-2'
  | 'number-1'
  | 'number-0'
  | 'percent-2'
  | 'percent-1'
  | 'percent-0'
  | 'fraction-percent-2'
  | 'fraction-percent-1'
  | 'fraction-percent-0'
  | 'date'
  | 'datetime'
  | 'boolean-nullable';

export interface OfxTableColumn {
  field: string;
  header: string;
  width?: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  dataType?: OfxTableDataType;
  emptyValueLabel?: string;
  sortable?: boolean;
  filterable?: boolean;
  exportHeader?: string;
  cellStyle?:
    | Record<string, string>
    | ((params: { value: unknown; data: Record<string, unknown> | null }) => Record<string, string> | null | undefined);
  cellClassRules?: Record<string, (params: { value: unknown; data: Record<string, unknown> | null }) => boolean>;
  headerCheckboxToggle?: boolean;
  agGridColDef?: Record<string, unknown>;
}
