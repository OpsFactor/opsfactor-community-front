import type { NavigationGuard } from 'vue-router';
import type { OpsFactorEdition } from '../runtime/runtime-info.types.js';
declare module 'vue-router' {
    interface RouteMeta {
        requiredEdition?: OpsFactorEdition;
        requiresAuth?: boolean;
    }
}
export declare function createEditionGuard(getRuntimeEdition: () => OpsFactorEdition | null, isAuthenticated: () => boolean): NavigationGuard;
//# sourceMappingURL=edition.guard.d.ts.map