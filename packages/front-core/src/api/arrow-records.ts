import { DataType, DateDay, Float64, Table, Utf8, tableFromIPC, tableToIPC, vectorFromArray, type Vector } from 'apache-arrow';

/** Arrow document data plus the small schema metadata used by the HTTP envelope. */
export interface ArrowRecordDocument<T extends Record<string, unknown>> {
  records: T[];
  metadata: ReadonlyMap<string, string>;
}

/** The normalized scalar schema already used by the Perspective adapter. */
export type ArrowPivotColumnType = 'string' | 'float' | 'date';

/** Reads the exact two's-complement decimal integer without losing its low bits. */
function decimalInteger(value: unknown): bigint {

  if (typeof value === 'bigint') return value;
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    let integer = 0n;
    for (let index = bytes.length - 1; index >= 0; index--) integer = (integer << 8n) | BigInt(bytes[index]);
    if (bytes.length && (bytes[bytes.length - 1] & 0x80)) integer -= 1n << BigInt(bytes.length * 8);
    return integer;
  }
  return BigInt(String(value));

}

/** Decimal strings retain scale and precision beyond JavaScript's 53-bit mantissa. */
function decimalText(value: unknown, scale: number): string {

  const integer = decimalInteger(value);
  const negative = integer < 0n;
  const digits = (negative ? -integer : integer).toString();
  const sign = negative ? '-' : '';
  if (scale <= 0) return sign + digits + '0'.repeat(-scale);
  const padded = digits.padStart(scale + 1, '0');
  return `${sign}${padded.slice(0, -scale)}.${padded.slice(-scale)}`;

}

/** Decodes values directly from vectors; never creates an intermediate JSON string. */
function arrowValue(value: unknown, type: DataType): unknown {

  if (value === null || value === undefined) return null;
  if (DataType.isDictionary(type)) return arrowValue(value, type.dictionary);
  if (DataType.isDecimal(type)) return decimalText(value, type.scale);
  if (DataType.isDate(type) || DataType.isTimestamp(type)) {
    const date = value instanceof Date ? value : new Date(Number(value));
    if (!Number.isFinite(date.getTime())) throw new Error('The Arrow response contains an invalid date.');
    return DataType.isDate(type) ? date.toISOString().slice(0, 10) : date.toISOString();
  }
  if (DataType.isStruct(type)) {
    // StructRow property access can shadow fields named "constructor" or "__proto__".
    // Its iterator reads the actual child vectors in schema order instead.
    return Object.fromEntries(Array.from(value as Iterable<[string, unknown]>, ([name, item], index) => [
      name, arrowValue(item, type.children[index].type),
    ]));
  }
  if (DataType.isList(type) || DataType.isLargeList(type) || DataType.isFixedSizeList(type)) {
    return Array.from(value as Iterable<unknown>, (item) => arrowValue(item, type.children[0].type));
  }
  if (DataType.isMap(type)) {
    const object: Record<string, unknown> = {};
    const valueType = type.children[0].type.children[1].type;
    for (const [key, item] of value as Iterable<[unknown, unknown]>) Object.defineProperty(object, String(key), {
      value: arrowValue(item, valueType), enumerable: true, writable: true, configurable: true,
    });
    return object;
  }
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value;
  }
  return value;

}

/**
 * Decodes one complete IPC response, including all of its internal record batches.
 * Nullable values and leading-zero identifiers retain their original meaning.
 */
export function decodeArrowDocument<T extends Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): ArrowRecordDocument<T> {

  const table = tableFromIPC(bytes);
  const records = new Array<T>(table.numRows);
  const fields = table.schema.fields.map((field) => ({
    field,
    scalar: DataType.isUtf8(field.type) || DataType.isLargeUtf8(field.type) || DataType.isBool(field.type) || DataType.isFloat(field.type) || DataType.isNull(field.type),
  }));
  let outputIndex = 0;
  // Visiting each IPC batch directly avoids a chunk lookup for every cell in large extracts.
  for (const batch of table.batches) {
    const columns = fields.map((column, index) => ({ ...column, vector: batch.getChildAt(index) }));
    // Reuse entry pairs; fromEntries creates compact ordinary objects even for wide DTOs.
    const entries: [string, unknown][] = columns.map(({ field }) => [field.name, null]);
    for (let rowIndex = 0; rowIndex < batch.numRows; rowIndex++) {
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const { field, scalar, vector } = columns[columnIndex];
        const original = vector?.get(rowIndex) ?? null;
        entries[columnIndex][1] = scalar ? original : arrowValue(original, field.type);
      }
      records[outputIndex++] = Object.fromEntries(entries) as T;
    }
  }
  return { records, metadata: table.schema.metadata };

}

/** Convenience entry point for callers whose payload is explicitly a record list. */
export function decodeArrowRecords<T extends Record<string, unknown>>(bytes: ArrayBuffer | Uint8Array): T[] {

  return decodeArrowDocument<T>(bytes).records;

}

/**
 * Writes normalized pivot rows as IPC before crossing Perspective's WASM boundary.
 * Explicit column types also preserve schemas when the dataset contains no rows.
 */
export function encodeArrowRows(rows: Record<string, unknown>[], schema: Record<string, ArrowPivotColumnType>): ArrayBuffer {

  const columns: Record<string, Vector> = {};
  for (const [name, type] of Object.entries(schema)) {
    const values = rows.map((row) => row[name] ?? null);
    columns[name] = vectorFromArray(values, type === 'float' ? new Float64() : type === 'date' ? new DateDay() : new Utf8());
  }
  const bytes = tableToIPC(new Table(columns), 'stream');
  if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

}
