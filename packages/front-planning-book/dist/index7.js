import { defineComponent as G, ref as H, reactive as K, computed as r, watch as j, openBlock as I, createElementBlock as O, normalizeStyle as q, normalizeClass as d, createElementVNode as l, toDisplayString as U, renderSlot as J, createVNode as Q, unref as X, nextTick as Y } from "vue";
import { AgGridVue as Z } from "ag-grid-vue3";
import { ModuleRegistry as ee, AllCommunityModule as te } from "ag-grid-community";
import ne from "./index6.js";
const re = { class: "flex flex-wrap items-center justify-between gap-3" }, ie = { class: "flex flex-wrap items-center justify-end gap-2" }, le = { class: "ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1" }, ue = /* @__PURE__ */ G({
  __name: "ProductionPlanningBookGrid",
  props: {
    workbook: {},
    height: {},
    isSaving: { type: Boolean },
    themeMode: { default: "light" }
  },
  emits: ["edit"],
  setup(_, { emit: N }) {
    ee.registerModules([te]);
    const a = _, S = N, m = H(null), o = K({}), h = ["resource", "sku", "description", "line"], u = r(() => a.themeMode === "light"), R = r(() => [
      "flex min-h-0 flex-col overflow-hidden",
      u.value ? "bg-[color:var(--ofx-surface)]" : "bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"
    ]), D = r(() => [
      "shrink-0 px-3 py-2",
      u.value ? "border-b border-[color:var(--ofx-border)]" : "border-b border-white/6"
    ]), V = r(() => [
      "flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]",
      u.value ? "text-[color:var(--ofx-text-soft)]" : "text-white/42"
    ]), p = r(() => [
      "h-1 w-1 rounded-full",
      u.value ? "bg-[color:var(--ofx-border-strong)]" : "bg-white/18"
    ]), b = r(() => {
      const e = a.workbook.dados;
      return e.map((n, i) => {
        var k;
        const c = Number(n.$$treeLevel ?? 0), w = [];
        for (let f = i - 1; f >= 0; f -= 1) {
          const C = e[f], g = Number(C.$$treeLevel ?? 0);
          if (g < c && w.unshift(String(C.key ?? `${f}`)), g === 0 && g < c) break;
        }
        const A = Number(((k = e[i + 1]) == null ? void 0 : k.$$treeLevel) ?? -1);
        return {
          ...n,
          rowKey: String(n.key ?? `${i}`),
          treeDepth: c,
          ancestorKeys: w,
          hasChildren: A > c,
          baseVisible: n.showLine !== !1,
          isEditable: n.isEditable === !0,
          line: typeof n.line == "string" ? n.line : void 0
        };
      });
    });
    j(
      b,
      (e) => {
        Object.keys(o).forEach((t) => {
          delete o[t];
        }), e.forEach((t) => {
          t.hasChildren && (o[t.rowKey] = !0);
        });
      },
      { immediate: !0 }
    );
    const v = r(
      () => b.value.filter((e) => e.baseVisible && e.ancestorKeys.every((t) => o[t] !== !1))
    ), s = r(
      () => a.workbook.columnDefs.map((e) => e.name).filter((e) => !["level", ...h].includes(e))
    ), F = r(() => v.value.length), $ = r(() => a.height == null ? "100%" : typeof a.height == "number" ? `${a.height}px` : a.height);
    function E(e) {
      o[e] = !o[e];
    }
    function z(e, t) {
      const n = typeof e == "number" ? e : Number(e ?? Number.NaN);
      return Number.isFinite(n) ? (t == null ? void 0 : t.line) === "% capacity" ? `${(n * 100).toFixed(1)}%` : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "";
    }
    function x(e) {
      if (typeof e == "number") return e;
      const t = Number(String(e ?? "").replace(/,/g, ""));
      return Number.isFinite(t) ? t : Number.NaN;
    }
    function L() {
      if (m.value)
        try {
          m.value.autoSizeColumns(["__hierarchy__", ...h], !0);
        } catch {
        }
    }
    function y(e) {
      return s.value.includes(e) ? 124 : e === "description" ? 220 : e === "line" ? 168 : e === "resource" ? 128 : e === "sku" ? 124 : 120;
    }
    const P = r(() => [
      {
        colId: "__hierarchy__",
        field: "rowKey",
        headerName: "",
        width: 46,
        minWidth: 46,
        maxWidth: 46,
        pinned: "left",
        sortable: !1,
        filter: !1,
        resizable: !1,
        editable: !1,
        lockPinned: !0,
        cellRenderer: "productionPlanningTreeCellRenderer",
        headerClass: ["ofx-ag-grid-header-cell", "ofx-planning-book-hierarchy-header"],
        cellClass: ["ofx-ag-grid-body-cell", "is-center", "ofx-planning-book-hierarchy-column"]
      },
      ...a.workbook.columnDefs.filter((e) => e.name !== "level").map((e) => ({
        colId: e.name,
        field: e.name,
        headerName: s.value.includes(e.name) ? e.name.slice(0, 10) : e.name,
        width: y(e.name),
        minWidth: y(e.name),
        pinned: h.includes(e.name) ? "left" : void 0,
        sortable: !1,
        filter: !1,
        resizable: !0,
        editable: (t) => {
          var n;
          return !!((n = t.data) != null && n.isEditable) && s.value.includes(e.name) && e.enableCellEdit !== !1;
        },
        valueFormatter: s.value.includes(e.name) ? (t) => z(t.value, t.data) : void 0,
        headerClass: s.value.includes(e.name) ? ["ofx-ag-grid-header-cell", "is-right"] : ["ofx-ag-grid-header-cell"],
        cellClass: (t) => {
          var n;
          return [
            "ofx-ag-grid-body-cell",
            s.value.includes(e.name) ? "is-right" : "is-left",
            ((n = t.data) == null ? void 0 : n.line) === "% capacity" ? "ofx-planning-book-secondary-key-figure" : ""
          ];
        }
      }))
    ]), B = r(() => ({
      rowHeight: 30,
      headerHeight: 32,
      enableCellTextSelection: !0,
      suppressRowClickSelection: !0,
      suppressCellFocus: !1,
      animateRows: !1,
      stopEditingWhenCellsLoseFocus: !0,
      alwaysShowHorizontalScroll: !0,
      context: {
        toggleRow: E,
        isRowExpanded: (e) => e ? o[e] !== !1 : !0
      }
    }));
    function T(e) {
      m.value = e.api;
    }
    function M(e) {
      Y(() => {
        L();
      });
    }
    function W(e) {
      const t = String(e.colDef.field ?? ""), n = typeof e.oldValue == "number" ? e.oldValue : x(e.oldValue), i = x(e.newValue);
      t.length === 0 || Number.isNaN(i) || i === n || S("edit", { row: e.data, field: t, oldValue: n, newValue: i });
    }
    return (e, t) => (I(), O("div", {
      class: d(R.value),
      style: q({ height: $.value })
    }, [
      l("div", {
        class: d(D.value)
      }, [
        l("div", re, [
          l("div", {
            class: d(V.value)
          }, [
            t[0] || (t[0] = l("span", null, "Production Planning Book", -1)),
            l("span", {
              class: d(p.value)
            }, null, 2),
            l("span", null, U(F.value) + " rows in view", 1),
            l("span", {
              class: d(p.value)
            }, null, 2),
            t[1] || (t[1] = l("span", null, "Automatic save", -1))
          ], 2),
          l("div", ie, [
            J(e.$slots, "header-actions")
          ])
        ])
      ], 2),
      l("div", le, [
        Q(X(Z), {
          class: "h-full min-h-0 w-full",
          "row-data": v.value,
          "column-defs": P.value,
          components: { productionPlanningTreeCellRenderer: ne },
          "grid-options": B.value,
          "get-row-id": (n) => {
            var i;
            return String(((i = n.data) == null ? void 0 : i.rowKey) ?? "");
          },
          theme: "legacy",
          onGridReady: T,
          onFirstDataRendered: M,
          onCellValueChanged: W
        }, null, 8, ["row-data", "column-defs", "components", "grid-options", "get-row-id"])
      ])
    ], 6));
  }
});
export {
  ue as default
};
