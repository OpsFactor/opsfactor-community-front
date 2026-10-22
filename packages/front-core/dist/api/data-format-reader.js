import { isSafeNumber, parse } from 'lossless-json';
import { decodeParquetDocument } from './parquet-records.js';
export { decodeParquetDocument, decodeParquetRecords } from './parquet-records.js';
const metadataLimit = 1_048_576;
function numericValue(text) {
    if (/^-?\d+$/.test(text)) {
        const integer = BigInt(text);
        return integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(text) : integer;
    }
    // Preserve ordinary DTO doubles as numbers. Values whose significant digits would
    // be truncated/overflowed remain exact text rather than silently changing value.
    return isSafeNumber(text) ? Number(text) : text;
}
export function decodeJsonData(payload) {
    if (typeof payload !== 'string' && !(payload instanceof ArrayBuffer) && !(payload instanceof Uint8Array))
        return payload;
    try {
        const text = typeof payload === 'string' ? payload : new TextDecoder('utf-8', { fatal: true }).decode(payload);
        return parse(text.replace(/^\uFEFF/, ''), undefined, { parseNumber: numericValue });
    }
    catch (error) {
        const failure = new Error(`Unable to decode JSON data: ${error instanceof Error ? error.message : String(error)}`);
        Object.defineProperty(failure, 'cause', { value: error, configurable: true });
        throw failure;
    }
}
function metadataJson(value, label) {
    if (value === undefined)
        throw new Error(`Missing ${label} metadata`);
    if (value.length > metadataLimit)
        throw new Error(`${label} metadata exceeds the supported size`);
    return decodeJsonData(value);
}
/** Restores the same root shape written by the generic Spring codec. */
export function restoreDataDocument(document) {
    const { records, metadata } = document;
    const shape = metadata.get('opsfactor.shape.v1') ?? 'list';
    if (shape === 'list')
        return records;
    if (shape === 'single') {
        if (records.length !== 1)
            throw new Error('A single-object data response must contain exactly one record');
        return records[0];
    }
    if (shape === 'envelope') {
        const envelope = metadataJson(metadata.get('opsfactor.envelope.v1'), 'integration envelope');
        if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) || Object.prototype.hasOwnProperty.call(envelope, 'data'))
            throw new Error('Invalid integration envelope metadata');
        return { ...envelope, data: records };
    }
    if (shape === 'matrix') {
        const headers = metadataJson(metadata.get('opsfactor.headers.v1'), 'matrix columns');
        if (!Array.isArray(headers) || !headers.every(header => typeof header === 'string') || new Set(headers).size !== headers.length)
            throw new Error('Invalid matrix column metadata');
        const matrix = [headers];
        for (const row of records)
            matrix.push(headers.map(header => row[header] ?? null));
        return matrix;
    }
    throw new Error(`Unsupported data response shape: ${shape}`);
}
export async function decodeDataPayload(payload, format = 'json') {
    if (format === 'json')
        return decodeJsonData(payload);
    if (!(payload instanceof ArrayBuffer) && !(payload instanceof Uint8Array))
        throw new Error(`Expected binary ${format} data`);
    if (format === 'parquet')
        return restoreDataDocument(await decodeParquetDocument(payload));
    if (format === 'arrow') {
        const { decodeArrowDocument } = await import('./arrow-records.js');
        return restoreDataDocument(decodeArrowDocument(payload));
    }
    throw new Error(`Unsupported data response format: ${String(format)}`);
}
function responseFormat(contentType, fallback) {
    if (!contentType?.trim())
        return fallback;
    const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
    if (mediaType === 'application/json' || mediaType.endsWith('+json'))
        return 'json';
    if (mediaType === 'application/vnd.apache.arrow.stream' || mediaType === 'application/vnd.apache.arrow.file')
        return 'arrow';
    if (mediaType === 'application/vnd.apache.parquet' || mediaType === 'application/x-parquet')
        return 'parquet';
    if (mediaType === 'application/octet-stream' && fallback !== 'json')
        return fallback;
    throw new Error(`Unsupported data response Content-Type: ${mediaType}`);
}
/** One reusable HTTP boundary for reports, grids and other DTO consumers. */
export async function decodeDataResponse(response, options = {}) {
    if (!response.ok) {
        const text = await response.text();
        let message = text.trim();
        if (response.headers.get('content-type')?.toLowerCase().includes('json')) {
            try {
                const error = decodeJsonData(text);
                const detail = error?.message ?? error?.error ?? error?.detail;
                if (typeof detail === 'string')
                    message = detail;
            }
            catch { /* A malformed error body is still reported below. */ }
        }
        throw new Error(message || `Data request failed with HTTP ${response.status}`);
    }
    if (response.status === 204)
        return null;
    const fallback = typeof options === 'string' ? options : options.format ?? 'json';
    const format = responseFormat(response.headers.get('content-type'), fallback);
    if (typeof options !== 'string' && options.strictFormat && format !== fallback)
        throw new Error(`Expected ${fallback} data, but the server returned ${format}`);
    return format === 'json'
        ? decodeJsonData(await response.text())
        : decodeDataPayload(await response.arrayBuffer(), format);
}
//# sourceMappingURL=data-format-reader.js.map