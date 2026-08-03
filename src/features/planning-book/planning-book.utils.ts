/**
 * Compatibility adapter for the Community-owned Planning Book normalization.
 * No host-specific transport or workflow rule belongs in this module.
 */
export {
  aggregatePlanningBookSubtotalField,
  getPlanningBookPeriodField,
  normalizePlanningBook,
  resolvePlanningBookPeriodFromField,
  selectPlanningBookSubtotalContributors,
  summarizePlanningBookPeriod,
} from '@opsfactor/front-planning-book';
export type { PlanningBookSubtotalCell } from '@opsfactor/front-planning-book';
