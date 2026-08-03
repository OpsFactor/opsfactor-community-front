import type { AppModuleCardLink, AppModuleKey, AppModuleSummary } from '@/app/navigation.config';

export interface AppRouteMeta {
  title: string;
  description?: string;
  moduleKey?: AppModuleKey;
  moduleLabel?: string;
  subnav?: Array<{ label: string; to: string }>;
  requiresAuth?: boolean;
  keywords?: string[];
  legacyPath?: string;
  pageStatus?: 'overview' | 'live' | 'legacy-transplant';
  navigationModule?: AppModuleSummary;
  navigationPage?: AppModuleCardLink | null;
}
