import { defineComponent as k, computed as l, ref as M, watch as V, openBlock as a, createBlock as b, unref as d, withCtx as g, createElementBlock as u, normalizeClass as f, createElementVNode as c, createVNode as B, toDisplayString as L, createCommentVNode as z } from "vue";
import { AgGridVue as O } from "ag-grid-vue3";
import { ModuleRegistry as A, AllCommunityModule as E } from "ag-grid-community";
import { OfxModalDialog as F, OfxLoadingState as G } from "@opsfactor/front-shell";
const H = {
  class: "ofx-ag-grid ag-theme-quartz",
  style: { "--ofx-ag-grid-min-height": "420px" }
}, I = { class: "flex justify-end gap-3" }, R = ["disabled"], $ = /* @__PURE__ */ k({
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
  setup(h, { emit: x }) {
    A.registerModules([E]);
    const o = h, s = x, n = l(() => o.themeMode === "light"), r = M(null);
    V(
      () => o.details,
      (t) => {
        r.value = t ? JSON.parse(JSON.stringify(t)) : null;
      },
      { immediate: !0, deep: !0 }
    );
    function m(t) {
      if (typeof t.width == "number") return t.width;
      if (typeof t.width == "string") {
        const e = Number.parseInt(t.width, 10);
        if (Number.isFinite(e)) return e;
      }
      return 160;
    }
    function v(t) {
      const e = t.oldValue;
      if (typeof e == "number") {
        const i = Number(String(t.newValue).replace(/,/g, ""));
        return Number.isFinite(i) ? i : e;
      }
      return t.newValue;
    }
    const p = l(
      () => {
        var t;
        return (((t = r.value) == null ? void 0 : t.columnDefs) ?? []).map((e) => ({
          field: e.field,
          headerName: e.headerName ?? e.field ?? "",
          width: m(e),
          minWidth: Math.max(120, Math.min(m(e), 240)),
          editable: e.editable === !0,
          resizable: !0,
          sortable: !1,
          filter: !1,
          valueParser: v,
          headerClass: ["ofx-ag-grid-header-cell"],
          cellClass: ["ofx-ag-grid-body-cell"]
        }));
      }
    ), y = l(() => p.value.length > 0), w = l(
      () => {
        var t;
        return (((t = r.value) == null ? void 0 : t.columnDefs) ?? []).some((e) => e.editable === !0);
      }
    ), C = l(() => n.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]" : "border-white/10 bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"), _ = l(() => n.value ? "border-[color:var(--ofx-border)] text-[color:var(--ofx-text-muted)]" : "border-white/10 text-white/56"), S = l(() => n.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]" : "border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]");
    function D(t) {
      const e = t.api.getAllDisplayedColumns().map((i) => i.getColId());
      if (e.length)
        try {
          t.api.autoSizeColumns(e, !1);
        } catch {
        }
    }
    function N() {
      r.value && s("submit", r.value);
    }
    return (t, e) => (a(), b(d(F), {
      open: o.open,
      title: o.title,
      description: o.description,
      size: "xl",
      onClose: e[1] || (e[1] = (i) => s("close"))
    }, {
      footer: g(() => [
        c("div", I, [
          c("button", {
            type: "button",
            class: f(["inline-flex h-11 items-center rounded-[10px] border px-4 text-sm font-medium transition", S.value]),
            onClick: e[0] || (e[0] = (i) => s("close"))
          }, " Close ", 2),
          w.value ? (a(), u("button", {
            key: 0,
            type: "button",
            class: "inline-flex h-11 items-center rounded-[10px] bg-[color:var(--ofx-primary)] px-4 text-sm font-semibold text-[color:var(--ofx-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50",
            disabled: o.isLoading || o.isSubmitting || !r.value,
            onClick: N
          }, L(o.isSubmitting ? "Submitting..." : "Submit changes"), 9, R)) : z("", !0)
        ])
      ]),
      default: g(() => [
        o.isLoading ? (a(), b(d(G), {
          key: 0,
          label: "Loading detail lines"
        })) : r.value && y.value ? (a(), u("div", {
          key: 1,
          class: f(["overflow-hidden rounded-[14px] border", C.value])
        }, [
          c("div", H, [
            B(d(O), {
              class: "h-full min-h-0 w-full",
              "row-data": r.value.detailLines,
              "column-defs": p.value,
              "default-col-def": { suppressMovable: !0 },
              "grid-options": { rowHeight: 34, headerHeight: 34, enableCellTextSelection: !0, alwaysShowHorizontalScroll: !0, suppressCellFocus: !1 },
              theme: "legacy",
              onGridReady: D
            }, null, 8, ["row-data", "column-defs"])
          ])
        ], 2)) : (a(), u("div", {
          key: 2,
          class: f(["rounded-[14px] border border-dashed px-4 py-8 text-center text-sm", _.value])
        }, " No detail lines were returned for this cell. ", 2))
      ]),
      _: 1
    }, 8, ["open", "title", "description"]));
  }
});
export {
  $ as default
};
