export function createEditionGuard(getRuntimeEdition, isAuthenticated) {
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
//# sourceMappingURL=edition.guard.js.map