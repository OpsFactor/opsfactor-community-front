import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRequestError, HttpClient } from '../src/api/http.ts';
import { createJsonRequestService } from '../src/api/json-request.service.ts';
import { InMemoryBasicAuthenticationStrategy } from '../src/auth/authentication.ts';

function usingResponse(response: Response, assertion: (httpClient: HttpClient) => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response;

  return assertion(new HttpClient(() => null)).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test('HttpClient preserves a text/plain success response', async () => {
  await usingResponse(
    new Response('View saved.', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    async (httpClient) => assert.equal(await httpClient.request<string>('/configured-view'), 'View saved.'),
  );
});

test('HttpClient preserves unquoted Spring text announced as application/json', async () => {
  await usingResponse(
    new Response('View saved.', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    async (httpClient) => assert.equal(await httpClient.request<string>('/configured-view'), 'View saved.'),
  );
});

test('HttpClient parses a valid JSON response', async () => {
  await usingResponse(
    new Response(JSON.stringify({ id: 7, name: 'Current view' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    async (httpClient) => assert.deepEqual(await httpClient.request('/configured-view'), { id: 7, name: 'Current view' }),
  );
});

test('HttpClient maps 204 success to undefined', async () => {
  await usingResponse(
    new Response(null, { status: 204 }),
    async (httpClient) => assert.equal(await httpClient.request<void>('/configured-view'), undefined),
  );
});

test('HttpClient omits Authorization before an authentication strategy has credentials', async () => {
  const originalFetch = globalThis.fetch;
  let requestedHeaders: Headers | undefined;

  globalThis.fetch = async (_path, options) => {
    requestedHeaders = new Headers(options?.headers);
    return new Response(JSON.stringify({ edition: 'community' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await new HttpClient(() => null).request('/api/open/runtime-info');
    assert.equal(requestedHeaders?.has('Authorization'), false);
    assert.equal(requestedHeaders?.get('Accept'), 'application/json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient forwards a caller abort signal to a pending fetch', async () => {
  const originalFetch = globalThis.fetch;
  const abortController = new AbortController();
  let didObserveAbort = false;

  globalThis.fetch = async (_path, options) => await new Promise<Response>((_resolve, reject) => {
    const signal = options?.signal;

    if (signal === null || signal === undefined) {
      reject(new Error('The abort signal was not forwarded.'));
      return;
    }

    signal.addEventListener(
      'abort',
      () => {
        didObserveAbort = true;
        reject(new Error('The request was aborted.'));
      },
      { once: true },
    );
  });

  try {
    const pendingRequest = new HttpClient(() => null).request('/api/open/runtime-info', {
      signal: abortController.signal,
    });
    abortController.abort();

    await assert.rejects(pendingRequest, /The request was aborted/);
    assert.equal(didObserveAbort, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('InMemoryBasicAuthenticationStrategy creates Authorization only after credentials are supplied', () => {
  const authenticationStrategy = new InMemoryBasicAuthenticationStrategy();

  assert.equal(authenticationStrategy.getAuthorizationHeader(), null);
  assert.equal(authenticationStrategy.isAuthenticated(), false);

  authenticationStrategy.setCredentials({ username: 'public-smoke-user', password: 'public-smoke-password' });

  assert.equal(authenticationStrategy.getAuthorizationHeader(), 'Basic cHVibGljLXNtb2tlLXVzZXI6cHVibGljLXNtb2tlLXBhc3N3b3Jk');
  assert.equal(authenticationStrategy.isAuthenticated(), true);
});

test('HttpClient requestBlob preserves injected authorization, POST options and Content-Disposition', async () => {
  const originalFetch = globalThis.fetch;
  const requestBody = JSON.stringify({ planId: 17 });
  let requestedPath: string | URL | Request | undefined;
  let requestedOptions: RequestInit | undefined;

  globalThis.fetch = async (path, options) => {
    requestedPath = path;
    requestedOptions = options;
    return new Response(new Blob(['period,value\n2026-07-01,42\n'], { type: 'text/csv' }), {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="planning-book.csv"',
        'Content-Type': 'text/csv',
      },
    });
  };

  try {
    const httpClient = new HttpClient(() => 'Basic authenticated-session');
    const result = await httpClient.requestBlob('/planning-book/export', {
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        'X-Export-Format': 'csv',
      },
    });

    assert.equal(requestedPath, '/planning-book/export');
    assert.equal(requestedOptions?.method, 'POST');
    assert.equal(requestedOptions?.body, requestBody);
    assert.equal(new Headers(requestedOptions?.headers).get('Authorization'), 'Basic authenticated-session');
    assert.equal(new Headers(requestedOptions?.headers).get('Content-Type'), 'application/json');
    assert.equal(new Headers(requestedOptions?.headers).get('X-Export-Format'), 'csv');
    assert.equal(new Headers(requestedOptions?.headers).get('Accept'), 'application/octet-stream, */*;q=0.8');
    assert.equal(result.contentDisposition, 'attachment; filename="planning-book.csv"');
    assert.equal(await result.blob.text(), 'period,value\n2026-07-01,42\n');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient requestBlob reads the successful response only as a Blob', async () => {
  const originalFetch = globalThis.fetch;
  const binaryResponse = {
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Disposition': 'attachment; filename="report.xlsx"' }),
    blob: async () => new Blob(['binary-content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    text: async () => {
      throw new Error('A successful binary response must not be read as text.');
    },
  } as unknown as Response;

  globalThis.fetch = async () => binaryResponse;

  try {
    const result = await new HttpClient(() => null).requestBlob('/report');
    assert.equal(result.contentDisposition, 'attachment; filename="report.xlsx"');
    assert.equal(await result.blob.text(), 'binary-content');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient requestBlob maps a failed binary request to ApiRequestError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Export is not available.', { status: 403 });

  try {
    await assert.rejects(
      () => new HttpClient(() => 'Basic authenticated-session').requestBlob('/report', { method: 'POST' }),
      (error: unknown) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.status, 403);
        assert.equal(error.responseText, 'Export is not available.');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('JSON request service preserves the host request options and parses successful JSON', async () => {
  let requestedPath = '';
  let requestedOptions: { method?: string } | undefined;
  const requestService = createJsonRequestService<{ method?: string }>({
    httpRequest: async (path, options) => {
      requestedPath = path;
      requestedOptions = options;
      return new Response(JSON.stringify({ id: 17 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
    createError: (details) => new Error(details.message),
  });

  assert.deepEqual(await requestService.requestJson('/plans', { method: 'POST' }), { id: 17 });
  assert.equal(requestedPath, '/plans');
  assert.equal(requestedOptions?.method, 'POST');
});

test('JSON request service preserves 204 and text success semantics', async () => {
  const requestService = createJsonRequestService<Record<string, never>>({
    httpRequest: async (path) => path === '/empty'
      ? new Response(null, { status: 204 })
      : new Response('Saved.', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    createError: (details) => new Error(details.message),
  });

  assert.equal(await requestService.requestJson<void>('/empty', {}), undefined);
  assert.equal(await requestService.requestText('/confirmation', {}), 'Saved.');
});

test('JSON request service retains the fallback when a server returns an HTML failure page', async () => {
  let capturedMessage = '';
  const requestService = createJsonRequestService<Record<string, never>>({
    httpRequest: async () => new Response('<!doctype html><html><body>Sign in</body></html>', { status: 401, headers: { 'Content-Type': 'text/html' } }),
    createError: (details) => {
      capturedMessage = details.message;
      return new Error(details.message);
    },
  });

  await assert.rejects(() => requestService.requestJson('/secured-plans', {}), /Request failed for \/secured-plans \(401\)/);
  assert.equal(capturedMessage, 'Request failed for /secured-plans (401)');
});
