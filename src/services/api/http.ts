import { getCsrfConfig } from './csrf';
import { getCommunityAuthorizationHeader } from '@/services/community-authentication.service';
import { resolveCanonicalJsonDataIntegrationPath } from '@opsfactor/front-core';

export interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

export async function httpRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const csrf = getCsrfConfig();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const authorizationHeader = getCommunityAuthorizationHeader();
  if (authorizationHeader !== null && !headers.has('Authorization')) {
    headers.set('Authorization', authorizationHeader);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (csrf?.headerName && csrf.token) {
    headers.set(csrf.headerName, csrf.token);
  }

  return fetch(buildUrl(resolveCanonicalJsonDataIntegrationPath(path), options.query), {
    ...options,
    headers,
    credentials: 'include',
  });
}
