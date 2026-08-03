import { createApp } from 'vue';
/**
 * Performs the invariant SPA startup sequence shared by both product editions.
 *
 * The host supplies edition policy at the narrow seams above; this function
 * deliberately owns only Vue composition, runtime ordering and login-route
 * redirection so Enterprise extends Community instead of copying its launcher.
 */
export async function bootstrapFrontendApplication(dependencies) {
    const application = createApp(dependencies.rootComponent);
    const pinia = dependencies.createPinia();
    const router = dependencies.createRouter();
    application.use(pinia);
    dependencies.installPrimeVue(application);
    application.use(router);
    // Apply host appearance before the first application frame.
    dependencies.bootstrapTheme();
    await dependencies.bootstrapRuntimeInfo();
    await dependencies.ensurePerspectiveViewerRuntime();
    await router.isReady();
    await dependencies.bootstrapSession();
    const session = dependencies.getSession();
    const currentRoute = router.currentRoute.value;
    if (!session.isAuthenticated && currentRoute.meta.requiresAuth !== false) {
        await router.replace({
            name: dependencies.loginRouteName,
            query: {
                redirect: currentRoute.fullPath,
            },
        });
    }
    else if (session.isAuthenticated && currentRoute.name === dependencies.loginRouteName) {
        const redirectPath = typeof currentRoute.query.redirect === 'string' ? currentRoute.query.redirect : '/';
        await router.replace(redirectPath);
    }
    application.mount(dependencies.mountSelector ?? '#app');
}
//# sourceMappingURL=frontend-bootstrap.js.map