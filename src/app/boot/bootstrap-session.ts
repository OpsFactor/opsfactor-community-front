import { useSessionStore } from '@/stores/app/session.store';
import { restoreCommunityBasicSessionFromPeer } from '@/services/community-authentication.service';

export async function bootstrapSession() {
  const sessionStore = useSessionStore();

  // A route opened in a new tab has an independent sessionStorage. Ask an
  // authenticated same-origin Community tab for its ephemeral Basic session
  // before the backend session bootstrap decides whether login is required.
  await restoreCommunityBasicSessionFromPeer();
  await sessionStore.bootstrap();
}
