import { defineComponent as M, computed as a, ref as B, watch as L, openBlock as r, createBlock as u, unref as s, withCtx as n, createElementBlock as p, normalizeClass as g, createElementVNode as h, createVNode as b, createTextVNode as v, toDisplayString as z, createCommentVNode as O } from "vue";
import { AgGridVue as A } from "ag-grid-vue3";
import { ModuleRegistry as E, AllCommunityModule as F } from "ag-grid-community";
import { OfxModalDialog as G, OfxLoadingState as H, OfxButton as x } from "@opsfactor/front-shell";
const I = {
  class: "ofx-ag-grid ag-theme-quartz",
  style: { "--ofx-ag-grid-min-height": "420px" }
}, R = { class: "flex flex-wrap justify-end gap-3" }, $ = /* @__PURE__ */ M({
  __name: "PlanningBookDetailsDialog",
  props: {
    open: { type: Boolean },
    details: {},
    title: {},
    description: { default: "" },
    themeMode: { default: "light" },
    isLoading: { type: Boolean, default: !1 },
    isSubmitting: { type: Boolean, default: !1 }
  },
  emits: ["close", "submit"],
  setup(y, { emit: w }) {
    E.registerModules([F]);
    const l = y, d = w, f = a(() => l.themeMode === "light"), i = B(null);
    L(
      () => l.details,
      (t) => {
        i.value = t ? JSON.parse(JSON.stringify(t)) : null;
      },
      { immediate: !0, deep: !0 }
    );
    function c(t) {
      if (typeof t.width == "number") return t.width;
      if (typeof t.width == "string") {
        const e = Number.parseInt(t.width, 10);
        if (Number.isFinite(e)) return e;
      }
      return 160;
    }
    function C(t) {
      const e = t.oldValue;
      if (typeof e == "number") {
        const o = Number(String(t.newValue).replace(/,/g, ""));
        return Number.isFinite(o) ? o : e;
      }
      return t.newValue;
    }
    const m = a(
      () => {
        var t;
        return (((t = i.value) == null ? void 0 : t.columnDefs) ?? []).map((e) => ({
          field: e.field,
          headerName: e.headerName ?? e.field ?? "",
          width: c(e),
          minWidth: Math.max(120, Math.min(c(e), 240)),
          editable: e.editable === !0,
          resizable: !0,
          sortable: !1,
          filter: !1,
          valueParser: C,
          headerClass: ["ofx-ag-grid-header-cell"],
          cellClass: ["ofx-ag-grid-body-cell"]
        }));
      }
    ), S = a(() => m.value.length > 0), _ = a(
      () => {
        var t;
        return (((t = i.value) == null ? void 0 : t.columnDefs) ?? []).some((e) => e.editable === !0);
      }
    ), N = a(() => f.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]" : "border-white/10 bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"), D = a(() => f.value ? "border-[color:var(--ofx-border)] text-[color:var(--ofx-text-muted)]" : "border-white/10 text-white/56");
    function k(t) {
      const e = t.api.getAllDisplayedColumns().map((o) => o.getColId());
      if (e.length)
        try {
          t.api.autoSizeColumns(e, !1);
        } catch {
        }
    }
    function V() {
      i.value && d("submit", i.value);
    }
    return (t, e) => (r(), u(s(G), {
      open: l.open,
      title: l.title,
      description: l.description,
      size: "xl",
      onClose: e[1] || (e[1] = (o) => d("close"))
    }, {
      footer: n(() => [
        h("div", R, [
          b(s(x), {
            variant: "secondary",
            icon: "close",
            onClick: e[0] || (e[0] = (o) => d("close"))
          }, {
            default: n(() => [...e[2] || (e[2] = [
              v(" Close ", -1)
            ])]),
            _: 1
          }),
          _.value ? (r(), u(s(x), {
            key: 0,
            variant: "primary",
            icon: "save",
            disabled: l.isLoading || l.isSubmitting || !i.value,
            onClick: V
          }, {
            default: n(() => [
              v(z(l.isSubmitting ? "Submitting..." : "Submit changes"), 1)
            ]),
            _: 1
          }, 8, ["disabled"])) : O("", !0)
        ])
      ]),
      default: n(() => [
        l.isLoading ? (r(), u(s(H), {
          key: 0,
          label: "Loading detail lines"
        })) : i.value && S.value ? (r(), p("div", {
          key: 1,
          class: g(["overflow-hidden rounded-[14px] border", N.value])
        }, [
          h("div", I, [
            b(s(A), {
              class: "h-full min-h-0 w-full",
              "row-data": i.value.detailLines,
              "column-defs": m.value,
              "default-col-def": { suppressMovable: !0 },
              "grid-options": { rowHeight: 34, headerHeight: 34, enableCellTextSelection: !0, alwaysShowHorizontalScroll: !0, suppressCellFocus: !1 },
              theme: "legacy",
              onGridReady: k
            }, null, 8, ["row-data", "column-defs"])
          ])
        ], 2)) : (r(), p("div", {
          key: 2,
          class: g(["rounded-[14px] border border-dashed px-4 py-8 text-center text-sm", D.value])
        }, " No detail lines were returned for this cell. ", 2))
      ]),
      _: 1
    }, 8, ["open", "title", "description"]));
  }
});
export {
  $ as default
};
