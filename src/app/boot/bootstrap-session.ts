import { useSessionStore } from '@/stores/app/session.store';

export async function bootstrapSession() {
  const sessionStore = useSessionStore();

  // Cookie-backed auth is owned by the Spring backend.
  // This placeholder bootstrap keeps the SPA ready for a future
  // session introspection endpoint without leaking auth assumptions into pages.
  await sessionStore.bootstrap();
}
