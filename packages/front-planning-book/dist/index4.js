import { defineComponent as g, h as t } from "vue";
const y = g({
  name: "PlanningBookTreeCellRenderer",
  props: {
    params: {
      type: Object,
      required: !0
    }
  },
  setup(n) {
    return () => {
      var r, o, d, c;
      const e = n.params.data, p = Math.min((e == null ? void 0 : e.treeDepth) ?? (e == null ? void 0 : e.level) ?? 0, 3), m = !(((r = n.params.node) == null ? void 0 : r.rowPinned) === "bottom") && !!(e != null && e.hasChildren && (e != null && e.isPrimaryKeyFigureRow)), i = ((d = (o = n.params.context) == null ? void 0 : o.isRowExpanded) == null ? void 0 : d.call(o, e == null ? void 0 : e.rowKey)) ?? !0, s = (c = n.params.context) == null ? void 0 : c.toggleRow, a = e != null && e.isDetailedRow ? "is-detail" : "is-group", l = e != null && e.isPrimaryKeyFigureRow ? "is-total" : "is-key-figure";
      return t(
        "div",
        {
          class: "ofx-planning-book-tree-cell",
          style: { paddingLeft: `${p * 8}px` }
        },
        [
          t("span", {
            class: ["ofx-planning-book-tree-rail", a].join(" ")
          }),
          m ? t(
            "button",
            {
              class: ["ofx-planning-book-tree-toggle", a, l].join(" "),
              type: "button",
              title: i ? "Collapse level" : "Expand level",
              onClick: () => {
                e != null && e.rowKey && s && s(e.rowKey);
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
                    transform: i ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 140ms ease"
                  }
                },
                [t("path", { d: "M6 4l4 4-4 4" })]
              )
            ]
          ) : t("span", {
            class: ["ofx-planning-book-tree-marker", a, l].join(" "),
            title: (e == null ? void 0 : e.hierarchyVariant) ?? "Hierarchy level"
          })
        ]
      );
    };
  }
});
export {
  y as default
};
