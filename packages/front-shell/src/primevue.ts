import PrimeVue from 'primevue/config';
import type { App } from 'vue';

/**
 * Installs the neutral PrimeVue baseline used by both edition hosts.
 *
 * Component-level theme policy is still provided by each host; this only fixes
 * the shared unstyled/ripple configuration used by the legacy visual system.
 */
export function installOpsFactorPrimeVue(app: App) {

  app.use(PrimeVue, {
    unstyled: true,
    ripple: false,
  });
}
