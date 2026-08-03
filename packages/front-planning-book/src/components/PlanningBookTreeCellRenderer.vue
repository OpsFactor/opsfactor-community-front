<script lang="ts">
import { defineComponent, h } from 'vue';

/**
 * Neutral AG Grid renderer for the expandable hierarchy shared by all
 * Planning Book editions. The host injects the data and expansion callbacks;
 * this component owns only the legacy visual treatment of the tree cell.
 */
export default defineComponent({
  name: 'PlanningBookTreeCellRenderer',
  props: {
    params: {
      type: Object,
      required: true,
    },
  },
  setup(props) {

    return () => {
      const row = props.params.data as {
        rowKey: string;
        treeDepth: number;
        level: number;
        hasChildren: boolean;
        isPrimaryKeyFigureRow: boolean;
        isDetailedRow: boolean;
        hierarchyVariant: 'group-total' | 'group-key-figure' | 'detail-total' | 'detail-key-figure';
      } | undefined;
      const level = Math.min(row?.treeDepth ?? row?.level ?? 0, 3);
      const isPinnedBottomRow = props.params.node?.rowPinned === 'bottom';
      const hasChildren = !isPinnedBottomRow && Boolean(row?.hasChildren && row?.isPrimaryKeyFigureRow);
      const isExpanded = props.params.context?.isRowExpanded?.(row?.rowKey) ?? true;
      const toggleRow = props.params.context?.toggleRow as ((rowKey: string) => void) | undefined;
      const toneClass = row?.isDetailedRow ? 'is-detail' : 'is-group';
      const variantClass = row?.isPrimaryKeyFigureRow ? 'is-total' : 'is-key-figure';

      return h(
        'div',
        {
          class: 'ofx-planning-book-tree-cell',
          style: { paddingLeft: `${level * 8}px` },
        },
        [
          h('span', {
            class: ['ofx-planning-book-tree-rail', toneClass].join(' '),
          }),
          hasChildren
            ? h(
                'button',
                {
                  class: ['ofx-planning-book-tree-toggle', toneClass, variantClass].join(' '),
                  type: 'button',
                  title: isExpanded ? 'Collapse level' : 'Expand level',
                  onClick: () => {
                    if (row?.rowKey && toggleRow) toggleRow(row.rowKey);
                  },
                },
                [
                  h(
                    'svg',
                    {
                      viewBox: '0 0 16 16',
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: '1.75',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      style: {
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 140ms ease',
                      },
                    },
                    [h('path', { d: 'M6 4l4 4-4 4' })],
                  ),
                ],
              )
            : h('span', {
                class: ['ofx-planning-book-tree-marker', toneClass, variantClass].join(' '),
                title: row?.hierarchyVariant ?? 'Hierarchy level',
              }),
        ],
      );
    };
  },
});
</script>
