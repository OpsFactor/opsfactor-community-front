import { createRouter } from '@/router';
import type { Router } from 'vue-router';

/*
 * The packaged distribution consumes the shared frontend foundation through a
 * linked package. Keep the Community router explicit at that boundary instead
 * of relying on composition injection from a possibly duplicated module
 * graph. The router is created exactly once during bootstrap.
 */
let applicationRouter: Router | null = null;

export function createAppRouter() {

  if (applicationRouter === null) {
    applicationRouter = createRouter();
  }

  return applicationRouter;

}

/** Returns the router created before the root component is mounted. */
export function getAppRouter(): Router {

  if (applicationRouter === null) {
    throw new Error('The Community application router has not been initialized.');
  }

  return applicationRouter;

}
