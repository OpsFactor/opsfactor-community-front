<script lang="ts">
import { defineComponent, h } from 'vue';

/**
 * Generic bridge between AgGrid's renderer contract and the edition page slots.
 * It has no domain, route, API or edition policy of its own.
 */
export default defineComponent({
  name: 'OfxAgGridCellRenderer',
  props: {
    params: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const field = String(props.params.colDef?.field ?? '');
      const slotName = `cell-${field}`;
      const slotFn = props.params.context?.ofxSlots?.[slotName];

      if (slotFn) {
        return h(
          'div',
          { class: 'ofx-ag-grid-cell-slot' },
          slotFn({
            row: props.params.data,
            value: props.params.value,
            column: props.params.colDef,
          }),
        );
      }

      return h('span', { class: 'ofx-ag-grid-cell-text' }, props.params.value == null ? '' : String(props.params.value));
    };
  },
});
</script>
