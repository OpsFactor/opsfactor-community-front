import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDataApi } from '../dist/api/data-api.js';

const fixture = (name: string) => readFile(new URL(`./fixtures/data-formats/${name}`, import.meta.url));
const mime = { json: 'application/json', arrow: 'application/vnd.apache.arrow.stream', parquet: 'application/vnd.apache.parquet' };
const jsonResponse = () => new Response('[{"id":"00123","value":3.912}]', { headers: { 'Content-Type': mime.json } });

test('omitted format does not add format or rewrite the endpoint, filters or request headers', async () => {
  const path = '/api/secured/data/material?location=A&active=true';
  const query = { limit: 0, enabled: false };
  const api = createDataApi(async (actualPath, options) => {
    assert.equal(actualPath, path);
    assert.equal(options.query, query);
    assert.equal(Object.hasOwn(options.query, 'format'), false);
    assert.equal(options.headers.get('Accept'), null);
    assert.equal(options.headers.get('X-Report'), 'kept');
    assert.equal(options.method, undefined);
    assert.equal(options.body, undefined);
    return jsonResponse();
  });
  assert.deepEqual(await api.apiData(path, { query, headers: { 'X-Report': 'kept' } }), [{ id: '00123', value: 3.912 }]);
});

test('explicit JSON/Arrow/Parquet negotiates and decodes actual Java output with one body read', async () => {
  for (const format of ['json', 'arrow', 'parquet'] as const) {
    const bytes = await fixture(`flat.${format}`);
    let reads = 0;
    const query = { location: 'A', enabled: false };
    const api = createDataApi(async (_path, options) => {
      assert.deepEqual(options.query, { ...query, format });
      assert.equal(options.headers.get('Accept'), mime[format]);
      assert.equal('format' in options, false);
      const response = new Response(bytes, { headers: { 'Content-Type': mime[format] } });
      const read = (format === 'json' ? response.text : response.arrayBuffer).bind(response);
      response[format === 'json' ? 'text' : 'arrayBuffer'] = async () => { reads++; return read(); };
      return response;
    });
    const rows = await api.apiData('/api/secured/data/material', { format, query });
    assert.equal(rows[0].id, '00123');
    assert.equal(rows[0].unsafeLong, 9223372036854775807n);
    assert.equal(reads, 1);
    assert.deepEqual(query, { location: 'A', enabled: false });
  }
});

test('POST filters remain JSON independently of the output format and preserve signal', async () => {
  const body = { supplyPlanId: 17, filter: { materialIds: ['00123'], locationIds: [] } };
  const controller = new AbortController();
  const api = createDataApi(async (_path, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(options.body), body);
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    return new Response(await fixture('flat.arrow'), { headers: { 'Content-Type': mime.arrow } });
  });
  await api.apiData('/api/secured/data/profitlossbydfu', { method: 'POST', body, format: 'arrow', signal: controller.signal });
});

test('raw and multipart input bodies retain their bytes and native content type', async () => {
  const multipart = new FormData(); multipart.set('file', new Blob(['data']), 'data.xlsx');
  const bodies = [multipart, new URLSearchParams({ key: 'value' }), new Uint8Array([1, 2]), new Blob(['abc'], { type: 'application/vnd.apache.parquet' }), '{"x":1}'];
  for (const body of bodies) {
    const api = createDataApi(async (_path, options) => {
      assert.equal(options.body, body);
      if (body === multipart) assert.equal(options.headers.has('Content-Type'), false);
      if (body instanceof Blob) assert.equal(options.headers.get('Content-Type'), body.type);
      if (body instanceof URLSearchParams) assert.match(options.headers.get('Content-Type'), /application\/x-www-form-urlencoded/);
      if (body instanceof Uint8Array) assert.equal(options.headers.get('Content-Type'), 'application/octet-stream');
      return jsonResponse();
    });
    await api.apiData('/api/secured/data/material', { method: 'POST', body });
  }
});

test('explicit columnar format refuses a JSON success before reading its potentially huge body', async () => {
  const api = createDataApi(async () => {
    const response = jsonResponse();
    response.text = async () => { throw new Error('Must not read fallback body'); };
    return response;
  });
  await assert.rejects(api.apiData('/report', { format: 'arrow' }), /Expected arrow data, but the server returned json/);
});

test('HTTP error messages and network errors propagate without being decoded as files', async () => {
  const api = createDataApi(async () => new Response('{"message":"A unidade deve ser informada."}', { status: 406, headers: { 'Content-Type': mime.json } }));
  await assert.rejects(api.apiData('/report', { format: 'arrow' }), { message: 'A unidade deve ser informada.' });
  await assert.rejects(api.apiFile('/report', { mode: 'download', format: 'xlsx' }), { message: 'A unidade deve ser informada.' });
  const failure = new TypeError('Network failed');
  const broken = createDataApi(async () => { throw failure; });
  await assert.rejects(broken.apiData('/report'), (error) => error === failure);
});

test('canceling before transport or during response delivery does not decode stale results', async () => {
  let requests = 0;
  const controller = new AbortController(); controller.abort();
  const api = createDataApi(async () => { requests++; return jsonResponse(); });
  await assert.rejects(api.apiData('/report', { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(api.apiFile('/report', { mode: 'download', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(requests, 0);
  const during = new AbortController();
  const inFlight = createDataApi(async () => {
    during.abort();
    const response = jsonResponse();
    response.text = async () => { throw new Error('Must not decode obsolete result'); };
    return response;
  });
  await assert.rejects(inFlight.apiData('/report', { signal: during.signal }), { name: 'AbortError' });
});

test('canceling while reading data or download discards the completed stale body', async () => {
  for (const download of [false, true]) {
    const controller = new AbortController();
    const api = createDataApi(async () => {
      const response = jsonResponse();
      response.text = async () => { controller.abort(); return '[]'; };
      response.blob = async () => { controller.abort(); return new Blob(['data']); };
      return response;
    });
    await assert.rejects(download ? api.apiFile('/report', { mode: 'download', signal: controller.signal }) : api.apiData('/report', { signal: controller.signal }), { name: 'AbortError' });
  }
});

test('downloads preserve exact server bytes, disposition and default URL without serializing', async () => {
  const bytes = new Uint8Array([80, 75, 3, 4, 9]);
  const api = createDataApi(async (path, options) => {
    assert.equal(path, '/native-planning-book');
    assert.equal(options.query, undefined);
    const response = new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="plan.xlsx"' } });
    response.text = async () => { throw new Error('Must not parse download'); };
    return response;
  });
  const result = await api.apiFile('/native-planning-book', { mode: 'download' });
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), bytes);
  assert.equal(result.contentDisposition, 'attachment; filename="plan.xlsx"');
});

test('CSV profiles send separators only and XLSX rejects an incompatible successful JSON body', async () => {
  for (const [format, csvOptions, expected] of [
    ['csv', undefined, { format: 'csv' }],
    ['csvSystemLocale', undefined, { format: 'csv', fieldSeparator: ';', decimalSeparator: 'comma' }],
    ['csv', { fieldSeparator: '|', decimalSeparator: 'dot' }, { format: 'csv', fieldSeparator: '|', decimalSeparator: 'dot' }],
  ]) {
    const api = createDataApi(async (_path, options) => {
      assert.deepEqual(options.query, expected);
      assert.equal(options.headers.get('Accept'), 'text/csv');
      assert.equal('csvOptions' in options, false);
      assert.equal('locale' in options, false);
      return new Response('id;value\n00123;3,912', { headers: { 'Content-Type': 'text/csv' } });
    });
    await api.apiFile('/report', { mode: 'download', format, csvOptions, locale: 'pt-BR' });
  }
  const broken = createDataApi(async () => jsonResponse());
  await assert.rejects(broken.apiFile('/report', { mode: 'download', format: 'xlsx' }), /requested XLSX format/);
});


test('apiFile uploads Arrow/Parquet/JSON as raw bytes without adding an output format', async () => {
  for (const format of ['arrow', 'parquet', 'json'] as const) {
    const file = new File([await fixture(`flat.${format}`)], `records.${format}`);
    const api = createDataApi(async (_path, options) => {
      assert.equal(options.method, 'POST');
      assert.equal(options.body, file);
      assert.equal(options.query, undefined);
      assert.equal(options.headers.get('Content-Type'), mime[format]);
      assert.equal(options.headers.has('Accept'), false);
      for (const custom of ['file', 'fileName', 'mode', 'uploadMode', 'fileFormat', 'fields', 'fieldName']) assert.equal(custom in options, false);
      return new Response('{"saved":true,"count":9223372036854775807}', { headers: { 'Content-Type': 'application/json' } });
    });
    assert.deepEqual(await api.apiFile('/upload', { mode: 'upload', file }), { saved: true, count: 9223372036854775807n });
  }
});

test('apiFile spreadsheet upload uses multipart with file name, field and extra parameters preserved', async () => {
  const file = new File(['spreadsheet'], 'materials.xlsx');
  const signal = new AbortController().signal;
  const api = createDataApi(async (path, options) => {
    assert.equal(path, '/upload?existing=kept');
    assert.equal(options.method, 'PUT');
    assert.equal(options.signal, signal);
    assert.deepEqual(options.query, { sync: true });
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get('sheet').name, 'materials.xlsx');
    assert.equal(options.body.get('replace'), 'true');
    assert.equal(options.body.get('batch'), '0');
    assert.equal(options.headers.has('Content-Type'), false);
    return new Response('Saved', { headers: { 'Content-Type': 'text/plain' } });
  });
  assert.equal(await api.apiFile('/upload?existing=kept', { mode: 'upload', file, method: 'PUT', fieldName: 'sheet', fields: { replace: true, batch: 0 }, query: { sync: true }, signal }), 'Saved');
});

test('upload supports explicit raw/multipart overrides and never silently drops extra fields', async () => {
  const api = createDataApi(async (_path, options) => {
    assert.ok(options.body instanceof FormData);
    return new Response(null, { status: 204 });
  });
  assert.equal(await api.apiFile('/upload', { mode: 'upload', file: new File(['data'], 'data.arrow'), uploadMode: 'multipart' }), null);
  const raw = createDataApi(async (_path, options) => {
    assert.equal(options.headers.get('Content-Type'), mime.parquet);
    return new Response('ok');
  });
  assert.equal(await raw.apiFile('/upload', { mode: 'upload', file: new Blob(['data']), fileFormat: 'parquet' }), 'ok');
  await assert.rejects(raw.apiFile('/upload', { mode: 'upload', file: new File(['data'], 'data.parquet'), fields: { replace: true } }), /cannot include multipart fields/);
});

test('upload preserves legacy JSON-labeled text confirmations and rejects malformed structured JSON', async () => {
  for (const [body, expected] of [['Saved successfully', 'Saved successfully'], ['{"success":false}', { success: false }], ['', null]]) {
    const api = createDataApi(async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    assert.deepEqual(await api.apiFile('/upload', { mode: 'upload', file: new File(['x'], 'x.csv') }), expected);
  }
  const broken = createDataApi(async () => new Response('{bad json}', { headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(broken.apiFile('/upload', { mode: 'upload', file: new File(['x'], 'x.csv') }), /Unable to decode JSON/);
});

test('upload propagates HTTP errors and cancellation before and after confirmation read', async () => {
  const file = new File(['data'], 'data.csv');
  const failed = createDataApi(async () => new Response('{"message":"Invalid component"}', { status: 400, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(failed.apiFile('/upload', { mode: 'upload', file }), { message: 'Invalid component' });
  for (const phase of ['before', 'transport', 'confirmation']) {
    const controller = new AbortController(); let calls = 0;
    if (phase === 'before') controller.abort();
    const api = createDataApi(async () => {
      calls++;
      if (phase === 'transport') controller.abort();
      const response = new Response('saved');
      response.text = async () => { controller.abort(); return 'saved'; };
      return response;
    });
    await assert.rejects(api.apiFile('/upload', { mode: 'upload', file, signal: controller.signal }), { name: 'AbortError' });
    assert.equal(calls, phase === 'before' ? 0 : 1);
  }
});
