import { createFrontendAuthGuard } from '@opsfactor/front-core';
import { useSessionStore } from '@/stores/app/session.store';
import { ROUTE_NAMES } from '@/router/route-names';

/** Injects Community session and route policy into the shared authentication guard. */
export const authGuard = createFrontendAuthGuard({
  getSession: useSessionStore,
  loginRouteName: ROUTE_NAMES.login,
});
