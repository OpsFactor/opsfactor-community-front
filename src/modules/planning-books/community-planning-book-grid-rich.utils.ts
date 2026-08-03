import type { CommunityPlanningBookRichRowBase } from './community-planning-book-grid-rich.types';

/**
 * Adds the local, two-level key-figure tree used by Community Planning Books.
 *
 * Community views are always material/location leaves. The first key figure of
 * each leaf is therefore the tree parent and the remaining key figures are its
 * children. This improves navigation without reintroducing persisted grouping,
 * characteristic filters or aggregate adjustment semantics.
 */
export function buildCommunityPlanningBookRichRows<TRow extends Omit<CommunityPlanningBookRichRowBase,
  'hierarchyDepth' | 'hierarchyExpandable' | 'hierarchyParentRowKey'>>(
  rows: readonly TRow[],
): Array<TRow & CommunityPlanningBookRichRowBase> {

  const primaryRowKeyByMaterialLocation = new Map<string, string>();

  return rows.map((row) => {
    const materialLocationKey = JSON.stringify([
      Object.entries(row.locationDescriptionCols).sort(([left], [right]) => left.localeCompare(right)),
      Object.entries(row.materialDescriptionCols).sort(([left], [right]) => left.localeCompare(right)),
    ]);
    const primaryRowKey = primaryRowKeyByMaterialLocation.get(materialLocationKey);

    if (primaryRowKey === undefined) {
      primaryRowKeyByMaterialLocation.set(materialLocationKey, row.rowKey);
      const hasSiblingKeyFigure = rows.some((candidate) => candidate.rowKey !== row.rowKey
        && JSON.stringify([
          Object.entries(candidate.locationDescriptionCols).sort(([left], [right]) => left.localeCompare(right)),
          Object.entries(candidate.materialDescriptionCols).sort(([left], [right]) => left.localeCompare(right)),
        ]) === materialLocationKey);

      return {
        ...row,
        hierarchyDepth: 0,
        hierarchyExpandable: hasSiblingKeyFigure,
      };
    }

    return {
      ...row,
      hierarchyParentRowKey: primaryRowKey,
      hierarchyDepth: 1,
      hierarchyExpandable: false,
    };
  });
}
