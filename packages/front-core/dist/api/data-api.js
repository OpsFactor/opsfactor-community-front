import { decodeDataResponse, decodeJsonData } from './data-format-reader.js';
import { assertDataExportContentType, dataImportContentType, dataExportDescriptor, dataExportQuery } from './data-export-format.js';
/** Bind once per host to its existing authenticated client, never directly to global fetch. */
export function createDataApi(request) {
    /** Serialize only the small inbound JSON payload; successful binary responses never use JSON. */
    function prepare(options, format, csvOptions, locale) {
        const { body, ...requestOptions } = options;
        const headers = new Headers(options.headers);
        let encodedBody;
        if (body == null || typeof body === 'string' || body instanceof FormData) {
            encodedBody = body;
        }
        else if (body instanceof Blob) {
            encodedBody = body;
            if (!headers.has('Content-Type'))
                headers.set('Content-Type', body.type || 'application/octet-stream');
        }
        else if (body instanceof URLSearchParams) {
            encodedBody = body;
            if (!headers.has('Content-Type'))
                headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
        else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body) || body instanceof ReadableStream) {
            encodedBody = body;
            if (!headers.has('Content-Type'))
                headers.set('Content-Type', 'application/octet-stream');
        }
        else {
            encodedBody = JSON.stringify(body);
            if (!headers.has('Content-Type'))
                headers.set('Content-Type', 'application/json');
        }
        // Do not send format=json merely because JSON is the default decoder.
        // The host URL builder merges explicit query values without dropping existing filters.
        const query = format === undefined ? options.query : { ...options.query, ...dataExportQuery(format, csvOptions, locale) };
        if (format !== undefined)
            headers.set('Accept', dataExportDescriptor(format).mimeType);
        return { ...requestOptions, body: encodedBody, headers, query };
    }
    /** Fetch and decode a complete JSON/Arrow/Parquet document into its original DTO shape. */
    async function apiData(path, options = {}) {
        const { format, ...requestOptions } = options;
        requestOptions.signal?.throwIfAborted();
        const response = await request(path, prepare(requestOptions, format));
        requestOptions.signal?.throwIfAborted();
        const result = await decodeDataResponse(response, { format, strictFormat: format !== undefined });
        requestOptions.signal?.throwIfAborted();
        return result;
    }
    async function apiFile(path, options) {
        options.signal?.throwIfAborted();
        if (options.mode === 'upload') {
            const { mode, file, fileName, uploadMode, fileFormat, fieldName, fields, ...requestOptions } = options;
            const name = fileName ?? ('name' in file && typeof file.name === 'string' ? file.name : 'upload');
            const structuredType = fileFormat ? dataImportContentType(`file.${fileFormat}`) : dataImportContentType(name);
            const raw = uploadMode === 'raw' || (uploadMode !== 'multipart' && structuredType !== null);
            const headers = new Headers(requestOptions.headers);
            let body;
            if (raw) {
                if (fields && Object.keys(fields).length)
                    throw new Error('Raw file uploads cannot include multipart fields; use query parameters or multipart mode.');
                body = file;
                if (!headers.has('Content-Type'))
                    headers.set('Content-Type', structuredType ?? (file.type || 'application/octet-stream'));
            }
            else {
                body = new FormData();
                body.set(fieldName ?? 'file', file, name);
                for (const [key, value] of Object.entries(fields ?? {}))
                    body.set(key, String(value));
            }
            // Output format is not inferred from the uploaded file. Confirmations keep their native JSON/text contract.
            const response = await request(path, prepare({ ...requestOptions, method: requestOptions.method ?? 'POST', headers, body }));
            options.signal?.throwIfAborted();
            if (!response.ok)
                await decodeDataResponse(response);
            const text = response.status === 204 ? '' : await response.text();
            options.signal?.throwIfAborted();
            if (!text.trim())
                return null;
            if (response.headers.get('Content-Type')?.toLowerCase().includes('json')) {
                try {
                    return decodeJsonData(text);
                }
                catch (error) {
                    // Legacy ResponseEntity<String> may be labeled JSON but contain an unquoted confirmation.
                    // Malformed structured payloads remain explicit errors instead of being silently accepted.
                    if (/^\s*[\[{"]/.test(text))
                        throw error;
                }
            }
            return text;
        }
        if (options.mode !== 'download')
            throw new Error('apiFile requires mode=download or mode=upload.');
        const { mode, format, csvOptions, locale, ...requestOptions } = options;
        const response = await request(path, prepare(requestOptions, format, csvOptions, locale));
        options.signal?.throwIfAborted();
        if (!response.ok)
            await decodeDataResponse(response);
        if (format !== undefined)
            assertDataExportContentType(response.headers.get('Content-Type') ?? '', format);
        const blob = await response.blob();
        options.signal?.throwIfAborted();
        return { blob, contentType: response.headers.get('Content-Type'), contentDisposition: response.headers.get('Content-Disposition') };
    }
    return { apiData, apiFile };
}
//# sourceMappingURL=data-api.js.map