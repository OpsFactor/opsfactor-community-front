import { bootstrapFrontendApplication, bootstrapRuntimeInfo, renderBootstrapFailure } from '@opsfactor/front-core';
import { init_client as initPerspectiveViewerClient } from '@perspective-dev/viewer';
import '@perspective-dev/viewer-datagrid';
import '@perspective-dev/viewer/dist/css/pro-dark.css';
import '@perspective-dev/viewer/dist/css/icons.css';
import '@perspective-dev/viewer-datagrid/dist/css/perspective-viewer-datagrid.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import perspectiveViewerWasmUrl from '@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url';
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

let perspectiveViewerReady = false;

/** Loads the optional WebAssembly viewer only after the edition runtime is validated. */
async function ensurePerspectiveViewerRuntime() {

  if (perspectiveViewerReady) return;
  await initPerspectiveViewerClient(fetch(perspectiveViewerWasmUrl));
  perspectiveViewerReady = true;

}

void bootstrapFrontendApplication({
  rootComponent: App,
  createPinia: createAppPinia,
  createRouter: createAppRouter,
  installPrimeVue,
  bootstrapTheme,
  bootstrapRuntimeInfo: () => bootstrapRuntimeInfo(APPLICATION_EDITION),
  ensurePerspectiveViewerRuntime,
  bootstrapSession,
  getSession: useSessionStore,
  loginRouteName: ROUTE_NAMES.login,
}).catch((error: unknown) => renderBootstrapFailure(error, APPLICATION_EDITION));
