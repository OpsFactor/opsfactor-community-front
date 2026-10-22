import { defineComponent as p, openBlock as t, createElementBlock as l, createElementVNode as d, Fragment as u, renderList as g, normalizeClass as c, renderSlot as y, createTextVNode as f, toDisplayString as k, unref as b } from "vue";
import { displayPlanningBookGridCellValue as m } from "./index11.js";
const B = {
  class: "planning-book-grid",
  role: "region",
  "aria-label": "Planning Book grid"
}, C = { key: 0 }, v = { class: "planning-book-grid__empty" }, w = /* @__PURE__ */ p({
  __name: "PlanningBookGrid",
  props: {
    rows: {},
    columns: {},
    rowKey: { type: Function, default: (r, s) => s },
    emptyMessage: { default: "No Planning Book rows are available." }
  },
  setup(r) {
    function s(a, o) {
      var e;
      return (e = o.getValue) == null ? void 0 : e.call(o, a);
    }
    return (a, o) => (t(), l("div", B, [
      r.rows.length > 0 ? (t(), l("table", C, [
        d("thead", null, [
          d("tr", null, [
            (t(!0), l(u, null, g(r.columns, (e, i) => (t(), l("th", {
              key: e.id,
              scope: "col",
              class: c(e.headerClass)
            }, [
              y(a.$slots, "header", {
                column: e,
                columnIndex: i
              }, () => [
                f(k(e.label), 1)
              ], !0)
            ], 2))), 128))
          ])
        ]),
        d("tbody", null, [
          (t(!0), l(u, null, g(r.rows, (e, i) => (t(), l("tr", {
            key: r.rowKey(e, i)
          }, [
            (t(!0), l(u, null, g(r.columns, (n, h) => (t(), l("td", {
              key: n.id,
              class: c(n.cellClass)
            }, [
              y(a.$slots, "cell", {
                row: e,
                rowIndex: i,
                column: n,
                columnIndex: h,
                value: s(e, n)
              }, () => [
                f(k(b(m)(s(e, n))), 1)
              ], !0)
            ], 2))), 128))
          ]))), 128))
        ])
      ])) : y(a.$slots, "empty", { key: 1 }, () => [
        d("p", v, k(r.emptyMessage), 1)
      ], !0)
    ]));
  }
});
export {
  w as default
};
