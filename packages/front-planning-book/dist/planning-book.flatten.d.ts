import type { FlattenedPlanningBookRow, PlanningBookDescriptorMap, PlanningBookGroup } from './planning-book.model.js';
/**
 * Traverses every recursive group and emits one row per key figure. Both
 * aggregate and leaf figures are retained: product modules decide which level
 * is applicable, while parent, path and merged descriptor maps stay available.
 */
export declare function flattenPlanningBookGroups<TLocationMap extends PlanningBookDescriptorMap, TMaterialMap extends PlanningBookDescriptorMap, TValue>(groups: readonly PlanningBookGroup<TLocationMap, TMaterialMap, TValue>[]): FlattenedPlanningBookRow<TLocationMap, TMaterialMap, TValue>[];
//# sourceMappingURL=planning-book.flatten.d.ts.map