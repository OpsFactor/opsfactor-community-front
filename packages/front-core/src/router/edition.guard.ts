import type { NavigationGuard } from 'vue-router';
import type { OpsFactorEdition } from '../runtime/runtime-info.types.js';

declare module 'vue-router' {
  interface RouteMeta {
    requiredEdition?: OpsFactorEdition;
    requiresAuth?: boolean;
  }
}

export function createEditionGuard(
  getRuntimeEdition: () => OpsFactorEdition | null,
  isAuthenticated: () => boolean,
): NavigationGuard {
  return (to) => {
    if (to.meta.requiresAuth && !isAuthenticated()) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    const requiredEdition = to.meta.requiredEdition;
    const runtimeEdition = getRuntimeEdition();
    if (requiredEdition !== undefined && runtimeEdition !== requiredEdition) {
      return { path: '/runtime-incompatible' };
    }

    return true;
  };
}
