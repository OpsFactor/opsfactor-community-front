import { bootstrapFrontendApplication, bootstrapRuntimeInfo, renderBootstrapFailure } from '@opsfactor/front-core';
import '@opsfactor/front-shell/styles.css';
import '@perspective-dev/viewer/dist/css/pro-dark.css';
import '@perspective-dev/viewer/dist/css/icons.css';
import '@perspective-dev/viewer-datagrid/dist/css/perspective-viewer-datagrid.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import App from './App.vue';
import { createAppPinia } from './providers/pinia';
import { createAppRouter } from './providers/router';
import { installPrimeVue } from './providers/primevue';
import { bootstrapTheme } from './boot/bootstrap-theme';
import { bootstrapSession } from './boot/bootstrap-session';
import { useSessionStore } from '@/stores/app/session.store';
import { ROUTE_NAMES } from '@/router/route-names';
import { APPLICATION_EDITION } from '@/app/edition';
import '@/styles/tokens.css';
import '@/styles/theme-light.css';
import '@/styles/theme-dark.css';
import '@/styles/primevue-overrides.css';
import '@/styles/ag-grid-overrides.css';
import '@/styles/filepond-overrides.css';
import '@/styles/perspective-overrides.css';
import '@/styles/tailwind.css';

void bootstrapFrontendApplication({
  rootComponent: App,
  createPinia: createAppPinia,
  createRouter: createAppRouter,
  installPrimeVue,
  bootstrapTheme,
  bootstrapRuntimeInfo: () => bootstrapRuntimeInfo(APPLICATION_EDITION),
  // The analytical pivot is optional and must not make the sign-in page
  // depend on its WebAssembly runtime. Its component initializes it only
  // when a user opens a screen that contains a pivot.
  ensurePerspectiveViewerRuntime: async () => undefined,
  bootstrapSession,
  getSession: useSessionStore,
  loginRouteName: ROUTE_NAMES.login,
}).catch((error: unknown) => {
  // Preserve the complete browser stack for support diagnostics. The visible
  // boundary remains deliberately concise and safe for an end user.
  console.error('OpsFactor Community frontend startup failed.', error);
  renderBootstrapFailure(error, APPLICATION_EDITION);
});
