import { defineComponent as d, h as t } from "vue";
const g = d({
  name: "ProductionPlanningTreeCellRenderer",
  props: {
    params: {
      type: Object,
      required: !0
    }
  },
  setup(o) {
    return () => {
      var n, s, l;
      const e = o.params.data, i = Math.min((e == null ? void 0 : e.treeDepth) ?? 0, 2), p = !!(e != null && e.hasChildren), a = ((s = (n = o.params.context) == null ? void 0 : n.isRowExpanded) == null ? void 0 : s.call(n, e == null ? void 0 : e.rowKey)) ?? !0, r = (l = o.params.context) == null ? void 0 : l.toggleRow;
      return t(
        "div",
        {
          class: "ofx-planning-book-tree-cell",
          style: { paddingLeft: `${i * 10}px` }
        },
        [
          t("span", {
            class: "ofx-planning-book-tree-rail is-group"
          }),
          p ? t(
            "button",
            {
              class: "ofx-planning-book-tree-toggle is-group is-total",
              type: "button",
              title: a ? "Collapse level" : "Expand level",
              onClick: () => {
                e != null && e.rowKey && r && r(e.rowKey);
              }
            },
            [
              t(
                "svg",
                {
                  viewBox: "0 0 16 16",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "1.75",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  style: {
                    transform: a ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 140ms ease"
                  }
                },
                [t("path", { d: "M6 4l4 4-4 4" })]
              )
            ]
          ) : t("span", {
            class: "ofx-planning-book-tree-marker is-group is-key-figure"
          })
        ]
      );
    };
  }
});
export {
  g as default
};
