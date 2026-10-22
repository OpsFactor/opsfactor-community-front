import type { FileMetaData, SchemaElement, SchemaTree } from 'hyparquet'

export interface ParquetDataDocument<T extends Record<string, unknown> = Record<string, unknown>> {
  records: T[]
  metadata: ReadonlyMap<string, string>
}

function safeInteger(value: bigint): number | bigint {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value
}

function decimalScale(element: SchemaElement): number | undefined {
  if (element.logical_type?.type === 'DECIMAL') return element.logical_type.scale
  return element.converted_type === 'DECIMAL' ? element.scale ?? 0 : undefined
}

function signedInteger(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value)
  if (value instanceof Uint8Array) {
    if (!value.length) throw new Error('Empty Parquet decimal value')
    let integer = 0n
    for (const byte of value) integer = (integer << 8n) | BigInt(byte)
    return value[0] & 0x80 ? integer - (1n << BigInt(value.length * 8)) : integer
  }
  throw new Error('Parquet decimal did not retain its exact integer representation')
}

/** Decimal text is deliberate: JavaScript numbers cannot represent arbitrary DECIMAL(38, s). */
function decimalText(value: unknown, scale: number): string {
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 38) throw new Error('Unsupported Parquet decimal scale')
  const integer = signedInteger(value)
  const negative = integer < 0n
  let digits = (negative ? -integer : integer).toString()
  if (scale) {
    digits = digits.padStart(scale + 1, '0')
    digits = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
  }
  return negative ? `-${digits}` : digits
}

function isList(schema: SchemaTree): boolean {
  return schema.element.logical_type?.type === 'LIST' || schema.element.converted_type === 'LIST'
}

function isMap(schema: SchemaTree): boolean {
  return schema.element.logical_type?.type === 'MAP' || schema.element.converted_type === 'MAP'
}

function listElement(schema: SchemaTree): SchemaTree {
  const repeated = schema.children[0]
  if (!repeated) throw new Error('Parquet LIST has no element schema')
  // Canonical three-level LIST encoding, used by Apache Parquet Java.
  if (repeated.children.length === 1 && repeated.element.name !== 'array'
      && repeated.element.name !== `${schema.element.name}_tuple`) return repeated.children[0]
  return repeated
}

function ownSet(object: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(object, key, { value, configurable: true, enumerable: true, writable: true })
}

function normalize(value: unknown, schema: SchemaTree): unknown {
  if (value === undefined || value === null) return null
  const scale = decimalScale(schema.element)
  if (scale !== undefined) return decimalText(value, scale)
  if (isList(schema)) {
    if (!Array.isArray(value)) throw new Error(`Expected an array for Parquet LIST ${schema.element.name}`)
    const element = listElement(schema)
    for (let i = 0; i < value.length; i++) value[i] = normalize(value[i], element)
    return value
  }
  if (isMap(schema)) {
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid Parquet MAP ${schema.element.name}`)
    const entry = schema.children[0]
    const valueSchema = entry?.children.find(child => child.element.name === 'value')
    if (!valueSchema) throw new Error(`Parquet MAP has no value schema: ${schema.element.name}`)
    const object = value as Record<string, unknown>
    for (const key of Object.keys(object)) ownSet(object, key, normalize(object[key], valueSchema))
    return object
  }
  if (schema.children.length) {
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid Parquet struct ${schema.element.name}`)
    const object = value as Record<string, unknown>
    for (const child of schema.children) ownSet(object, child.element.name, normalize(object[child.element.name], child))
    return object
  }
  if (typeof value === 'bigint') return safeInteger(value)
  if (value instanceof Date) {
    if (Number.isNaN(value.valueOf())) throw new Error(`Invalid Parquet date ${schema.element.name}`)
    return value.toISOString()
  }
  return value
}

function epochText(value: bigint, unitsPerSecond: bigint): string {
  // Keep micro/nanosecond precision. Date itself only stores milliseconds.
  let seconds = value / unitsPerSecond
  let remainder = value % unitsPerSecond
  if (remainder < 0n) { seconds--; remainder += unitsPerSecond }
  const millis = seconds * 1000n
  if (millis < -8_640_000_000_000_000n || millis > 8_640_000_000_000_000n)
    throw new Error('Parquet timestamp exceeds the JavaScript date range')
  const iso = new Date(Number(millis)).toISOString()
  const width = unitsPerSecond.toString().length - 1
  return `${iso.slice(0, iso.lastIndexOf('.'))}.${remainder.toString().padStart(width, '0')}Z`
}

function withoutLossyDecimalConversion(metadata: FileMetaData): FileMetaData {
  return {
    ...metadata,
    schema: metadata.schema.map(element => {
      if (decimalScale(element) === undefined) return element
      const copy = { ...element }
      // hyparquet's default DECIMAL parser converts bigint/bytes to Number. Read the
      // physical values instead and apply our exact schema-aware decimal mapper.
      delete copy.converted_type
      delete copy.logical_type
      return copy
    }),
  }
}

function bytesBuffer(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) return bytes
  // A Buffer/subarray may include unrelated bytes before and after the file.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** Reads one already downloaded Parquet file. It never issues range/network requests. */
export async function decodeParquetDocument<T extends Record<string, unknown> = Record<string, unknown>>(
  bytes: ArrayBuffer | Uint8Array,
): Promise<ParquetDataDocument<T>> {
  const { parquetMetadata, parquetReadObjects, parquetSchema } = await import('hyparquet')
  const file = bytesBuffer(bytes)
  try {
    const metadata = parquetMetadata(file, { geoparquet: false })
    if (metadata.num_rows > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Parquet row count exceeds the JavaScript safe range')
    for (const field of metadata.schema) {
      if (field.name === '__proto__') throw new Error('Unsupported Parquet field name: __proto__')
    }
    const schema = parquetSchema(metadata)
    const rows = await parquetReadObjects({
      file,
      metadata: withoutLossyDecimalConversion(metadata),
      utf8: false,
      geoparquet: false,
      parsers: {
        dateFromDays: days => new Date(days * 86_400_000).toISOString().slice(0, 10),
        timestampFromMilliseconds: value => epochText(value, 1000n),
        timestampFromMicroseconds: value => epochText(value, 1_000_000n),
        timestampFromNanoseconds: value => epochText(value, 1_000_000_000n),
      },
    })
    for (const row of rows) {
      for (const child of schema.children) ownSet(row, child.element.name, normalize(row[child.element.name], child))
    }
    const values = new Map<string, string>()
    for (const entry of metadata.key_value_metadata ?? []) {
      if (entry.value !== undefined) values.set(entry.key, entry.value)
    }
    return { records: rows as T[], metadata: values }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const failure = new Error(`Unable to decode Parquet data: ${message}`)
    Object.defineProperty(failure, 'cause', { value: error, configurable: true })
    throw failure
  }
}

export async function decodeParquetRecords<T extends Record<string, unknown> = Record<string, unknown>>(
  bytes: ArrayBuffer | Uint8Array,
): Promise<T[]> {
  return (await decodeParquetDocument<T>(bytes)).records
}
