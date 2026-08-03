import type {
  FlattenedPlanningBookRow,
  PlanningBookDescriptorMap,
  PlanningBookGroup,
} from './planning-book.model.js';

/**
 * Traverses every recursive group and emits one row per key figure. Both
 * aggregate and leaf figures are retained: product modules decide which level
 * is applicable, while parent, path and merged descriptor maps stay available.
 */
export function flattenPlanningBookGroups<
  TLocationMap extends PlanningBookDescriptorMap,
  TMaterialMap extends PlanningBookDescriptorMap,
  TValue,
>(groups: readonly PlanningBookGroup<TLocationMap, TMaterialMap, TValue>[]): FlattenedPlanningBookRow<TLocationMap, TMaterialMap, TValue>[] {

  const rows: FlattenedPlanningBookRow<TLocationMap, TMaterialMap, TValue>[] = [];

  function visit(
    group: PlanningBookGroup<TLocationMap, TMaterialMap, TValue>,
    parentGroup: PlanningBookGroup<TLocationMap, TMaterialMap, TValue> | undefined,
    groupPath: readonly PlanningBookGroup<TLocationMap, TMaterialMap, TValue>[],
    inheritedLocationDescriptionCols: TLocationMap,
    inheritedMaterialDescriptionCols: TMaterialMap,
  ): void {

    const locationDescriptionCols = {
      ...inheritedLocationDescriptionCols,
      ...group.locationDescriptionCols,
    } as TLocationMap;
    const materialDescriptionCols = {
      ...inheritedMaterialDescriptionCols,
      ...group.materialDescriptionCols,
    } as TMaterialMap;
    const currentPath = [...groupPath, group] as const;

    for (const keyFigure of group.keyFigures ?? []) {
      rows.push({
        keyFigure,
        group,
        parentGroup,
        groupPath: currentPath,
        locationDescriptionCols,
        materialDescriptionCols,
      });
    }

    for (const subGroup of group.subGroups ?? []) {
      visit(subGroup, group, currentPath, locationDescriptionCols, materialDescriptionCols);
    }
  }

  for (const group of groups) {
    visit(group, undefined, [], {} as TLocationMap, {} as TMaterialMap);
  }

  return rows;
}
