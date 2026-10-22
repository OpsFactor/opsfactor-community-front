import { isSafeNumber, parse } from 'lossless-json'
import { decodeParquetDocument } from './parquet-records.js'

export { decodeParquetDocument, decodeParquetRecords } from './parquet-records.js'
export type { ParquetDataDocument } from './parquet-records.js'

export type DataResponseFormat = 'json' | 'arrow' | 'parquet'

export interface DataDocument<T extends Record<string, unknown> = Record<string, unknown>> {
  records: T[]
  metadata: ReadonlyMap<string, string>
}

export interface DataResponseOptions {
  /** Fallback only when Content-Type is absent; the actual HTTP representation wins. */
  format?: DataResponseFormat
  /** Fail before reading a successful body if the server did not honor this format. */
  strictFormat?: boolean
}

const metadataLimit = 1_048_576

function numericValue(text: string): number | bigint | string {
  if (/^-?\d+$/.test(text)) {
    const integer = BigInt(text)
    return integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(text) : integer
  }
  // Preserve ordinary DTO doubles as numbers. Values whose significant digits would
  // be truncated/overflowed remain exact text rather than silently changing value.
  return isSafeNumber(text) ? Number(text) : text
}

export function decodeJsonData<T = unknown>(payload: string | ArrayBuffer | Uint8Array | unknown): T {
  if (typeof payload !== 'string' && !(payload instanceof ArrayBuffer) && !(payload instanceof Uint8Array)) return payload as T
  try {
    const text = typeof payload === 'string' ? payload : new TextDecoder('utf-8', { fatal: true }).decode(payload)
    return parse(text.replace(/^\uFEFF/, ''), undefined, { parseNumber: numericValue }) as T
  } catch (error) {
    const failure = new Error(`Unable to decode JSON data: ${error instanceof Error ? error.message : String(error)}`)
    Object.defineProperty(failure, 'cause', { value: error, configurable: true })
    throw failure
  }
}

function metadataJson(value: string | undefined, label: string): unknown {
  if (value === undefined) throw new Error(`Missing ${label} metadata`)
  if (value.length > metadataLimit) throw new Error(`${label} metadata exceeds the supported size`)
  return decodeJsonData(value)
}

/** Restores the same root shape written by the generic Spring codec. */
export function restoreDataDocument<T>(document: DataDocument): T {
  const { records, metadata } = document
  const shape = metadata.get('opsfactor.shape.v1') ?? 'list'
  if (shape === 'list') return records as T
  if (shape === 'single') {
    if (records.length !== 1) throw new Error('A single-object data response must contain exactly one record')
    return records[0] as T
  }
  if (shape === 'envelope') {
    const envelope = metadataJson(metadata.get('opsfactor.envelope.v1'), 'integration envelope')
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) || Object.prototype.hasOwnProperty.call(envelope, 'data'))
      throw new Error('Invalid integration envelope metadata')
    return { ...envelope, data: records } as T
  }
  if (shape === 'matrix') {
    const headers = metadataJson(metadata.get('opsfactor.headers.v1'), 'matrix columns')
    if (!Array.isArray(headers) || !headers.every(header => typeof header === 'string') || new Set(headers).size !== headers.length)
      throw new Error('Invalid matrix column metadata')
    const matrix: unknown[][] = [headers]
    for (const row of records) matrix.push(headers.map(header => row[header] ?? null))
    return matrix as T
  }
  throw new Error(`Unsupported data response shape: ${shape}`)
}

export async function decodeDataPayload<T = unknown>(
  payload: string | ArrayBuffer | Uint8Array | unknown,
  format: DataResponseFormat = 'json',
): Promise<T> {
  if (format === 'json') return decodeJsonData<T>(payload)
  if (!(payload instanceof ArrayBuffer) && !(payload instanceof Uint8Array))
    throw new Error(`Expected binary ${format} data`)
  if (format === 'parquet') return restoreDataDocument<T>(await decodeParquetDocument(payload))
  if (format === 'arrow') {
    const { decodeArrowDocument } = await import('./arrow-records.js')
    return restoreDataDocument<T>(decodeArrowDocument(payload))
  }
  throw new Error(`Unsupported data response format: ${String(format)}`)
}

function responseFormat(contentType: string | null, fallback: DataResponseFormat): DataResponseFormat {
  if (!contentType?.trim()) return fallback
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase()
  if (mediaType === 'application/json' || mediaType.endsWith('+json')) return 'json'
  if (mediaType === 'application/vnd.apache.arrow.stream' || mediaType === 'application/vnd.apache.arrow.file') return 'arrow'
  if (mediaType === 'application/vnd.apache.parquet' || mediaType === 'application/x-parquet') return 'parquet'
  if (mediaType === 'application/octet-stream' && fallback !== 'json') return fallback
  throw new Error(`Unsupported data response Content-Type: ${mediaType}`)
}

/** One reusable HTTP boundary for reports, grids and other DTO consumers. */
export async function decodeDataResponse<T = unknown>(
  response: Response,
  options: DataResponseOptions | DataResponseFormat = {},
): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    let message = text.trim()
    if (response.headers.get('content-type')?.toLowerCase().includes('json')) {
      try {
        const error = decodeJsonData<Record<string, unknown>>(text)
        const detail = error?.message ?? error?.error ?? error?.detail
        if (typeof detail === 'string') message = detail
      } catch { /* A malformed error body is still reported below. */ }
    }
    throw new Error(message || `Data request failed with HTTP ${response.status}`)
  }
  if (response.status === 204) return null as T
  const fallback = typeof options === 'string' ? options : options.format ?? 'json'
  const format = responseFormat(response.headers.get('content-type'), fallback)
  if (typeof options !== 'string' && options.strictFormat && format !== fallback)
    throw new Error(`Expected ${fallback} data, but the server returned ${format}`)
  return format === 'json'
    ? decodeJsonData<T>(await response.text())
    : decodeDataPayload<T>(await response.arrayBuffer(), format)
}
