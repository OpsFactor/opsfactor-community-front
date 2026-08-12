import {
  HttpClient,
  InMemoryBasicAuthenticationStrategy,
  type BasicCredentials,
} from '@opsfactor/front-core';

const COMMUNITY_BASIC_SESSION_STORAGE_KEY = 'opsfactor.community.basic-session';
const COMMUNITY_BASIC_SESSION_CHANNEL = 'opsfactor.community.basic-session-channel';

interface StoredCommunityBasicSession {
  username: string;
  password: string;
}

/** Keeps the active in-memory credential through a Vite hot-module replacement. */
interface CommunityAuthenticationHotData {
  activeCredentials?: BasicCredentials | null;
}

const basicAuthenticationStrategy = new InMemoryBasicAuthenticationStrategy();
let activeCredentials: BasicCredentials | null = null;
const sessionChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(COMMUNITY_BASIC_SESSION_CHANNEL);
export const httpClient = new HttpClient(basicAuthenticationStrategy.getAuthorizationHeader);

type CommunitySessionMessage =
  | { type: 'request-session'; requestId: string }
  | { type: 'provide-session'; requestId: string; credentials: StoredCommunityBasicSession }
  | { type: 'clear-session' };

function applyBasicSession(credentials: BasicCredentials): void {

  activeCredentials = { ...credentials };
  basicAuthenticationStrategy.setCredentials(activeCredentials);
  persistBasicSession(activeCredentials);

}

/** Restores the credential while the current browser tab session remains open. */
function restoreBasicSession(): void {

  const serializedSession = window.sessionStorage.getItem(COMMUNITY_BASIC_SESSION_STORAGE_KEY);
  if (serializedSession === null) {
    return;
  }

  try {
    const storedSession = JSON.parse(serializedSession) as Partial<StoredCommunityBasicSession>;
    if (typeof storedSession.username !== 'string'
      || typeof storedSession.password !== 'string') {
      window.sessionStorage.removeItem(COMMUNITY_BASIC_SESSION_STORAGE_KEY);
      return;
    }

    applyBasicSession({
      username: storedSession.username,
      password: storedSession.password,
    });
  } catch {
    window.sessionStorage.removeItem(COMMUNITY_BASIC_SESSION_STORAGE_KEY);
  }

}

/** Persists the authenticated Basic credential for the browser-managed tab lifetime. */
function persistBasicSession(credentials: BasicCredentials): void {

  const storedSession: StoredCommunityBasicSession = { ...credentials };
  window.sessionStorage.setItem(COMMUNITY_BASIC_SESSION_STORAGE_KEY, JSON.stringify(storedSession));

}

/** Removes the tab-scoped credential whenever authentication is no longer valid. */
function clearBasicSession(): void {

  activeCredentials = null;
  basicAuthenticationStrategy.clear();
  window.sessionStorage.removeItem(COMMUNITY_BASIC_SESSION_STORAGE_KEY);

}

const hotData = import.meta.hot?.data as CommunityAuthenticationHotData | undefined;
if (hotData?.activeCredentials !== null && hotData?.activeCredentials !== undefined) {
  // HMR preserves the rendered shell. Reuse its credential before a mounted
  // secured page can issue a request with a freshly reset strategy.
  applyBasicSession(hotData.activeCredentials);
} else {
  restoreBasicSession();
}

import.meta.hot?.dispose((nextHotData: CommunityAuthenticationHotData) => {
  nextHotData.activeCredentials = activeCredentials === null ? null : { ...activeCredentials };
});

sessionChannel?.addEventListener('message', (event: MessageEvent<CommunitySessionMessage>) => {
  const message = event.data;
  if (message.type === 'request-session' && activeCredentials !== null) {
    sessionChannel.postMessage({
      type: 'provide-session',
      requestId: message.requestId,
      credentials: { ...activeCredentials },
    } satisfies CommunitySessionMessage);
    return;
  }
  if (message.type === 'clear-session') {
    clearBasicSession();
  }
});

/**
 * Restores a same-origin tab session before route bootstrap.
 *
 * sessionStorage intentionally remains tab-scoped. A freshly opened tab asks an
 * already authenticated Community tab for the in-memory Basic credential and
 * stores it only in its own sessionStorage, preserving logout and browser-close
 * semantics without introducing persistent credentials.
 */
export async function restoreCommunityBasicSessionFromPeer(): Promise<void> {

  if (activeCredentials !== null || sessionChannel === null) {
    return;
  }

  const requestId = crypto.randomUUID();
  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      sessionChannel.removeEventListener('message', handleSessionMessage);
      resolve();
    }, 350);
    const handleSessionMessage = (event: MessageEvent<CommunitySessionMessage>) => {
      const message = event.data;
      if (message.type !== 'provide-session' || message.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeoutId);
      sessionChannel.removeEventListener('message', handleSessionMessage);
      applyBasicSession(message.credentials);
      resolve();
    };
    sessionChannel.addEventListener('message', handleSessionMessage);
    sessionChannel.postMessage({ type: 'request-session', requestId } satisfies CommunitySessionMessage);
  });

}

/** Provides the active in-memory credential to Community's fetch-based API facade. */
export function getCommunityAuthorizationHeader(): string | null {

  return basicAuthenticationStrategy.getAuthorizationHeader();

}

/**
 * Community's real authentication flow.
 *
 * Local credentials use stateless HTTP Basic. A successful credential remains
 * available only while this browser tab session exists, including full SPA reloads.
 * An OpsFactor OIDC session is restored by the separate session bootstrap contract.
 */
export const authenticationService = {
  async authenticate(credentials: BasicCredentials): Promise<void> {
    activeCredentials = { ...credentials };
    basicAuthenticationStrategy.setCredentials(activeCredentials);

    try {
      await httpClient.request('/api/secured/user/rolelist');
      persistBasicSession(credentials);
    } catch (error) {
      clearBasicSession();
      throw error;
    }
  },
  logout(): void {
    clearBasicSession();
    sessionChannel?.postMessage({ type: 'clear-session' } satisfies CommunitySessionMessage);
  },
  isAuthenticated(): boolean {
    return basicAuthenticationStrategy.isAuthenticated();
  },
  getUsername(): string | null {
    return basicAuthenticationStrategy.getUsername();
  },
};
