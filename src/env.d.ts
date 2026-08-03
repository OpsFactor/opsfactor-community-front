/// <reference types="vite/client" />

import 'vue-router';
import type { AppModuleKey } from '@/lib/constants/modules';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    moduleKey?: AppModuleKey;
    moduleLabel?: string;
    subnav?: Array<{ label: string; to: string }>;
    requiresAuth?: boolean;
  }
}
