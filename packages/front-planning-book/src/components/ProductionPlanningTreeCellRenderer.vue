<script lang="ts">
import { defineComponent, h } from 'vue';

/**
 * Neutral AG Grid renderer for the expandable Production Planning hierarchy.
 * The host supplies the row model and callbacks; this component owns only the
 * shared legacy visual hierarchy, so either edition can consume it unchanged.
 */
export default defineComponent({
  name: 'ProductionPlanningTreeCellRenderer',
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
        hasChildren: boolean;
      } | undefined;
      const level = Math.min(row?.treeDepth ?? 0, 2);
      const hasChildren = Boolean(row?.hasChildren);
      const isExpanded = props.params.context?.isRowExpanded?.(row?.rowKey) ?? true;
      const toggleRow = props.params.context?.toggleRow as ((rowKey: string) => void) | undefined;

      return h(
        'div',
        {
          class: 'ofx-planning-book-tree-cell',
          style: { paddingLeft: `${level * 10}px` },
        },
        [
          h('span', {
            class: 'ofx-planning-book-tree-rail is-group',
          }),
          hasChildren
            ? h(
                'button',
                {
                  class: 'ofx-planning-book-tree-toggle is-group is-total',
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
                class: 'ofx-planning-book-tree-marker is-group is-key-figure',
              }),
        ],
      );
    };
  },
});
</script>
