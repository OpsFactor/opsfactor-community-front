import { defineComponent as Ie, computed as i, ref as x, reactive as We, watch as K, nextTick as V, onMounted as He, onBeforeUnmount as $e, openBlock as k, createElementBlock as E, withModifiers as Ge, normalizeStyle as Q, normalizeClass as c, createElementVNode as d, renderSlot as Z, toDisplayString as S, createCommentVNode as A, withDirectives as qe, Fragment as je, renderList as Ue, vModelSelect as Xe, createVNode as Ye, unref as Je } from "vue";
import { AgGridVue as Qe } from "ag-grid-vue3";
import { ModuleRegistry as Ze, AllCommunityModule as en } from "ag-grid-community";
import nn from "./index4.js";
import { applyPendingPlanningBookEdits as tn, createDemandPlanningBookConflictFinder as an } from "./index14.js";
import { buildPlanningBookSelectedCellDto as ln, isPlanningBookReadOnlyColumn as ee } from "./index13.js";
import { normalizePlanningBook as on, selectPlanningBookSubtotalContributors as rn, aggregatePlanningBookSubtotalField as sn } from "./index9.js";
const dn = { class: "flex flex-wrap items-center justify-between gap-3" }, un = { key: 1 }, fn = { class: "flex flex-wrap items-center justify-end gap-2" }, cn = ["value"], gn = { class: "ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1" }, pn = 30, hn = 32, kn = /* @__PURE__ */ Ie({
  __name: "LegacyPlanningBookGrid",
  props: {
    planningBook: {},
    height: {},
    mode: { default: "generic" },
    pendingEditCount: { default: 0 },
    isSaving: { type: Boolean, default: !1 },
    orderedFields: { default: () => [] },
    pinnedFields: { default: () => [] },
    pendingEdits: { default: () => [] },
    detailsEnabled: { type: Boolean, default: !1 },
    themeMode: { default: "light" },
    isCellEditable: {}
  },
  emits: ["edit", "unavailable-edit", "request-details", "request-edit"],
  setup(ne, { emit: te }) {
    Ze.registerModules([en]);
    const l = ne, _ = te, r = i(() => l.themeMode === "light"), f = x(null), D = x(null), L = x(null), h = We({}), b = x(""), F = x([]), m = x(null), O = x(!1), B = x(!1), ae = ["Constrained Plan", "Unconstrained Plan", "Working Plan"], le = /* @__PURE__ */ new Set([
      "Planned Inbound",
      "Inbound Orders",
      "Planned Production",
      "Production Orders"
    ]), oe = /* @__PURE__ */ new Set([
      "Indirect Demand"
    ]), v = i(() => {
      const e = on(l.planningBook);
      return l.mode === "demand" && tn(l.planningBook, e.rows, l.pendingEdits), e;
    }), ie = i(() => an(
      l.planningBook,
      l.pendingEdits,
      v.value.rows
    )), T = i(() => {
      const e = new Map(l.planningBook.columnDefs.map((a) => [a.field, a])), n = l.orderedFields.map((a) => e.get(a)).filter((a) => !!a), t = new Set(n.map((a) => a.field));
      return [
        ...n,
        ...l.planningBook.columnDefs.filter((a) => !t.has(a.field))
      ];
    }), z = i(() => /* @__PURE__ */ new Set([
      ...l.planningBook.columnDefs.filter((e) => e.pinnedLeft).map((e) => e.field),
      ...l.pinnedFields
    ]));
    K(
      v,
      (e) => {
        const n = new Set(e.rows.map((t) => t.rowKey));
        if (Object.keys(h).forEach((t) => {
          n.has(t) || delete h[t];
        }), !O.value) {
          e.rows.forEach((t) => {
            t.hasChildren && t.isPrimaryKeyFigureRow && (h[t.rowKey] = !1);
          }), O.value = !0;
          return;
        }
        e.rows.forEach((t) => {
          t.hasChildren && t.isPrimaryKeyFigureRow && h[t.rowKey] == null && (h[t.rowKey] = !1);
        });
      },
      { immediate: !0 }
    ), K(
      () => l.planningBook.keyFigures,
      (e) => {
        if (!e.length) {
          b.value = "";
          return;
        }
        e.includes(b.value) || (b.value = e[0]);
      },
      { immediate: !0, deep: !0 }
    );
    const re = i(
      () => v.value.rows.filter((e) => e.ancestorKeys.every((n) => h[n] !== !1))
    ), P = i(() => B.value ? v.value.rows : re.value);
    K(
      P,
      async (e) => {
        if (!f.value) {
          F.value = e;
          return;
        }
        await V(), w();
      },
      { immediate: !0 }
    );
    function I(e) {
      var n;
      return !!(e.dataColumn || (n = e.cellFilter) != null && n.includes("customFormatNumber"));
    }
    function W(e) {
      return e.cellClass === "pastPeriods" || e.field === "Average Historical Sales";
    }
    function R(e) {
      const n = typeof e == "number" ? e : Number(e ?? Number.NaN);
      return Number.isFinite(n) ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "";
    }
    function se(e, n, t) {
      var a;
      return (a = e == null ? void 0 : e.unavailableReasons) != null && a[n] ? "N/A" : R(t);
    }
    function H(e) {
      if (typeof e == "number") return e;
      if (typeof e != "string") return Number(e ?? Number.NaN);
      const n = e.trim().replace(/,/g, "");
      return n.length === 0 ? 0 : Number(n);
    }
    function M(e, n, t) {
      var g, p, y, J;
      if ((g = e.unavailableReasons) != null && g[n]) return !1;
      const a = (p = e.lockedCells) == null ? void 0 : p[n], s = (((y = e.additionalClasses) == null ? void 0 : y[n]) ?? []).includes("crosshatch"), u = String(e.editMode ?? "noEdit");
      return l.isSaving || a || s || ee(t) || u !== "cellEdit" && u !== "detailOrCellEdit" ? !1 : ((J = l.isCellEditable) == null ? void 0 : J.call(l, e, n, t)) ?? !0;
    }
    function de(e, n, t) {
      var s, u, g, p;
      const a = {}, o = ((s = e.additionalClasses) == null ? void 0 : s[n]) ?? [];
      return t.dataColumn && (a.justifyContent = "flex-end", a.textAlign = "right", a.fontVariantNumeric = "tabular-nums"), (u = e.unavailableReasons) != null && u[n] && (a.background = r.value ? "linear-gradient(180deg, rgba(227, 102, 102, 0.16), rgba(255, 239, 239, 0.9))" : "linear-gradient(180deg, rgba(227, 102, 102, 0.18), rgba(102, 35, 45, 0.2))", a.color = r.value ? "rgba(132, 38, 50, 0.96)" : "rgba(255, 213, 219, 0.94)", a.fontWeight = "600"), o.includes("crosshatch") && (a.background = r.value ? "repeating-linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.18) 7px, rgba(226,232,240,0.55) 7px, rgba(226,232,240,0.55) 14px)" : "repeating-linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 7px, rgba(255,255,255,0.02) 7px, rgba(255,255,255,0.02) 14px)", a.color = r.value ? "rgba(82,97,121,0.92)" : "rgba(206,216,238,0.72)"), (g = e.updatedCells) != null && g[n] && (a.background = r.value ? "linear-gradient(180deg, rgba(31, 135, 93, 0.14), rgba(226, 247, 239, 0.82))" : "linear-gradient(180deg, rgba(68, 204, 153, 0.18), rgba(27, 76, 61, 0.18))", a.boxShadow = r.value ? "inset 0 0 0 1px rgba(31, 135, 93, 0.22)" : "inset 0 0 0 1px rgba(68, 204, 153, 0.28)"), (p = e.lockedCells) != null && p[n] && (a.background = r.value ? "linear-gradient(180deg, rgba(211, 155, 42, 0.15), rgba(255, 248, 230, 0.9))" : "linear-gradient(180deg, rgba(238, 173, 68, 0.15), rgba(122, 82, 23, 0.16))", a.color = r.value ? "rgba(95, 67, 18, 0.96)" : "rgba(255, 235, 204, 0.9)"), Object.keys(a).length > 0 ? a : void 0;
    }
    function ue(e, n) {
      var t, a, o, s;
      return ((t = e.unavailableReasons) == null ? void 0 : t[n]) ?? ((a = e.lockedCells) == null ? void 0 : a[n]) ?? ((o = e.updatedCells) == null ? void 0 : o[n]) ?? ((s = e.toolTips) == null ? void 0 : s[n]) ?? void 0;
    }
    function fe(e, n) {
      var a, o, s;
      const t = [
        "ofx-ag-grid-body-cell",
        e.dataColumn ? "is-right" : "is-left"
      ];
      return e.field === "keyFigure" && t.push("ofx-planning-book-key-figure-column"), (a = n.data) != null && a.isPrimaryKeyFigureRow && !e.dataColumn && t.push("ofx-planning-book-primary-row"), !((o = n.data) != null && o.isPrimaryKeyFigureRow) && e.field === "keyFigure" && t.push("ofx-planning-book-secondary-key-figure"), W(e) && t.push("ofx-planning-book-past-period"), (s = n.data) != null && s.isDetailedRow && t.push("ofx-planning-book-detailed-row"), n.node.rowPinned === "bottom" && t.push("ofx-planning-book-subtotal-row"), t;
    }
    function ce(e) {
      var t;
      const n = ["ofx-ag-grid-body-cell", "is-center", "ofx-planning-book-hierarchy-column"];
      return (t = e.data) != null && t.isDetailedRow && n.push("ofx-planning-book-detailed-row"), e.node.rowPinned === "bottom" && n.push("ofx-planning-book-subtotal-row"), n;
    }
    function ge() {
      const e = {
        rowKey: "__subtotal__",
        ancestorKeys: [],
        level: 0,
        treeDepth: 0,
        rowOrder: -1,
        hasChildren: !1,
        keyFigure: b.value,
        groupLabel: "Subtotal",
        isPrimaryKeyFigureRow: !0,
        isDetailedRow: !1,
        hierarchyVariant: "group-total",
        uom: l.planningBook.uom,
        editMode: "noEdit"
      };
      v.value.descriptorFields.forEach((t) => {
        e[t] = "";
      });
      const n = rn(
        v.value.rows,
        F.value,
        b.value,
        !B.value
      );
      return v.value.periodFields.forEach((t) => {
        const a = sn(
          l.planningBook,
          b.value,
          n,
          t
        );
        e[t] = a.value, a.unavailableReason && (e.unavailableReasons ?? (e.unavailableReasons = {}), e.unavailableReasons[t] = a.unavailableReason);
      }), e;
    }
    const pe = i(() => b.value ? [ge()] : []), he = i(() => l.height == null ? "100%" : typeof l.height == "number" ? `${l.height}px` : l.height), be = i(() => r.value ? "bg-[color:var(--ofx-surface)]" : "bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"), me = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]" : "border-white/6"), ve = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/42"), N = i(() => r.value ? "bg-[color:var(--ofx-border-strong)]" : "bg-white/18"), Ce = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]" : "border-white/10 bg-white/[0.04] text-white/74"), xe = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/48"), ye = i(() => r.value ? "bg-transparent text-xs font-medium text-[color:var(--ofx-text)] outline-none" : "bg-transparent text-xs font-medium text-white outline-none"), we = i(() => r.value ? "bg-white" : "bg-[rgb(11_17_29)]"), ke = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]" : "border-white/12 bg-[rgb(10_16_29_/_0.98)]"), Ee = i(() => r.value ? "text-[color:var(--ofx-text)] hover:bg-[color:var(--ofx-surface-elevated)]" : "text-white/88 hover:bg-white/[0.06]");
    function Fe(e) {
      h[e] = !h[e], V().then(() => {
        w(), $();
      });
    }
    function w() {
      if (!f.value) {
        F.value = P.value;
        return;
      }
      const e = [];
      f.value.forEachNodeAfterFilterAndSort((n) => {
        n.rowPinned || !n.data || e.push(n.data);
      }), F.value = e;
    }
    function $() {
      if (!f.value) return;
      const e = T.value.filter((n) => !n.dataColumn).map((n) => n.field);
      if (e.length)
        try {
          f.value.autoSizeColumns(["__hierarchy__", ...e], !0);
        } catch {
        }
    }
    function G(e) {
      return e.dataColumn ? W(e) ? 112 : 124 : e.field === "uom" ? 58 : e.field === "keyFigure" ? 156 : e.field.endsWith("Description") ? 164 : e.field.endsWith("Id") ? 138 : z.value.has(e.field) ? 78 : 104;
    }
    const Se = i(() => [
      {
        colId: "__hierarchy__",
        field: "hierarchyVariant",
        headerName: "",
        width: 46,
        minWidth: 46,
        maxWidth: 46,
        pinned: "left",
        sortable: !1,
        filter: !1,
        resizable: !1,
        lockPinned: !0,
        editable: !1,
        cellRenderer: "planningBookTreeCellRenderer",
        headerClass: ["ofx-ag-grid-header-cell", "ofx-planning-book-hierarchy-header"],
        cellClass: ce
      },
      ...T.value.map((e) => ({
        colId: e.field,
        field: e.field,
        headerName: e.name,
        minWidth: G(e),
        width: G(e),
        pinned: z.value.has(e.field) ? "left" : void 0,
        sortable: e.enableSorting !== !1,
        filter: e.enableFiltering === !1 ? !1 : I(e) ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: !0,
        lockPinned: !1,
        editable: (n) => n.node.rowPinned || !n.data ? !1 : M(n.data, e.field, e) && !j(n.data, e.field),
        valueFormatter: I(e) ? (n) => se(
          n.data,
          e.field,
          n.value
        ) : void 0,
        cellStyle: (n) => n.node.rowPinned || !n.data ? void 0 : de(n.data, e.field, e),
        tooltipValueGetter: (n) => {
          var t;
          return (t = n.node) != null && t.rowPinned ? void 0 : ue(n.data, e.field);
        },
        headerClass: e.dataColumn ? ["ofx-ag-grid-header-cell", "is-right"] : ["ofx-ag-grid-header-cell"],
        cellClass: (n) => fe(e, n)
      }))
    ]), _e = i(() => ({
      rowHeight: pn,
      headerHeight: hn,
      enableCellTextSelection: !0,
      suppressRowClickSelection: !0,
      suppressContextMenu: !0,
      suppressCellFocus: !1,
      animateRows: !1,
      tooltipShowDelay: 150,
      tooltipMouseTrack: !0,
      stopEditingWhenCellsLoseFocus: !0,
      alwaysShowHorizontalScroll: !0,
      columnMenu: "new",
      defaultColDef: {
        suppressMovable: !1
      },
      context: {
        toggleRow: Fe,
        isRowExpanded: (e) => e ? h[e] !== !1 : !0
      }
    }));
    function De(e) {
      f.value = e.api, B.value = e.api.isAnyFilterPresent(), w();
    }
    function Be(e) {
      $(), w();
    }
    function Pe(e) {
      var n;
      B.value = ((n = f.value) == null ? void 0 : n.isAnyFilterPresent()) ?? !1, w();
    }
    function Re(e) {
      w();
    }
    function C() {
      m.value = null;
    }
    function q(e) {
      const n = String(e.editMode ?? "noEdit");
      return (n === "detailOrCellEdit" || n === "detailDisaggregatedOnly") && !!e.materialId || n === "detailAggregatedDisaggregated";
    }
    function Me(e) {
      return ae.reduce((n, t) => n.endsWith(`-${t}`) ? n.slice(0, -t.length - 1) : n.endsWith(` (${t})`) ? n.slice(0, -t.length - 3) : n, e);
    }
    function Ne(e) {
      const n = Me(String(e.keyFigure ?? ""));
      return oe.has(n) ? !0 : le.has(n) ? !!e.materialId : q(e);
    }
    function Ke(e, n) {
      if (!l.detailsEnabled || e.rowKey === "__subtotal__" || !v.value.periodFields.includes(n)) return !1;
      const t = l.planningBook.columnDefs.find((a) => a.field === n);
      return l.mode === "demand" && (!t || ee(t)) ? !1 : l.mode === "supply" ? Ne(e) : q(e);
    }
    function Ve(e) {
      var y;
      const n = String(e.colDef.field ?? ""), t = e.data, a = e.event instanceof MouseEvent ? e.event : null;
      if (a == null || a.preventDefault(), a == null || a.stopPropagation(), !t || !Ke(t, n)) {
        C();
        return;
      }
      const o = (y = D.value) == null ? void 0 : y.getBoundingClientRect();
      if (!o || !a) return;
      const s = 172, u = 52, g = Math.min(Math.max(a.clientX - o.left, 12), Math.max(o.width - s - 12, 12)), p = Math.min(Math.max(a.clientY - o.top, 12), Math.max(o.height - u - 12, 12));
      m.value = {
        x: g,
        y: p,
        row: t,
        field: n
      };
    }
    function Ae(e) {
      var o;
      const n = e.data, t = String(e.colDef.field ?? ""), a = (o = n == null ? void 0 : n.unavailableReasons) == null ? void 0 : o[t];
      a && _("unavailable-edit", { reason: a });
    }
    function j(e, n) {
      if (l.mode !== "demand" || !l.pendingEdits.length) return !1;
      const t = Number(e[n] ?? 0), a = ln(
        l.planningBook,
        e,
        n,
        t,
        t,
        { planId: "", viewName: l.planningBook.viewName }
      );
      return ie.value(a).length > 0;
    }
    function U(e, n, t) {
      const a = l.planningBook.columnDefs.find((o) => o.field === n);
      !e || !(a != null && a.dataColumn) || !M(e, n, a) || !j(e, n) || _("request-edit", {
        row: e,
        field: n,
        resumeEditing: async () => {
          var s, u;
          await V();
          const o = (s = f.value) == null ? void 0 : s.getRowNode(e.rowKey);
          (o == null ? void 0 : o.rowIndex) != null && ((u = f.value) == null || u.startEditingCell({ rowIndex: o.rowIndex, colKey: n, key: t }));
        }
      });
    }
    function Le(e) {
      e.node.rowPinned || U(e.data, String(e.colDef.field ?? ""));
    }
    function Oe(e) {
      const n = e.event;
      !(n instanceof KeyboardEvent) || e.node.rowPinned || n.ctrlKey || n.metaKey || n.altKey || n.target instanceof Element && n.target.closest('input, textarea, [contenteditable="true"]') || (n.key === "Enter" || n.key === "F2" || n.key === "Backspace" || n.key === "Delete" || n.key.length === 1) && U(e.data, String(e.colDef.field ?? ""), n.key);
    }
    function Te() {
      m.value && (_("request-details", {
        row: m.value.row,
        field: m.value.field
      }), C());
    }
    function ze(e) {
      var s, u, g, p;
      const n = String(e.colDef.field ?? ""), t = typeof e.oldValue == "number" ? e.oldValue : H(e.oldValue), a = H(e.newValue), o = l.planningBook.columnDefs.find((y) => y.field === n);
      if (!o || !M(e.data, n, o)) {
        e.data[n] = e.oldValue, (s = f.value) == null || s.refreshCells({ columns: [n], force: !0 });
        return;
      }
      if (n.length === 0 || Number.isNaN(a) || t === a) {
        Number.isNaN(a) && (e.data[n] = t, (u = f.value) == null || u.refreshCells({
          columns: [n],
          force: !0
        }));
        return;
      }
      l.mode === "demand" ? e.data[n] = t : ((g = e.data).updatedCells ?? (g.updatedCells = {}), e.data.updatedCells[n] = `Modified cell: from ${R(t)} to ${R(a)}`), _("edit", {
        row: e.data,
        field: n,
        oldValue: t,
        newValue: a
      }), (p = f.value) == null || p.refreshCells({
        columns: [n],
        force: !0
      });
    }
    function X(e) {
      var t;
      if (!m.value) return;
      const n = e.target;
      if (!(n instanceof Node)) {
        C();
        return;
      }
      (t = L.value) != null && t.contains(n) || C();
    }
    function Y(e) {
      e.preventDefault();
    }
    return He(() => {
      var e;
      (e = D.value) == null || e.addEventListener("contextmenu", Y, !0), window.addEventListener("pointerdown", X, !0), window.addEventListener("resize", C), window.addEventListener("scroll", C, !0);
    }), $e(() => {
      var e;
      (e = D.value) == null || e.removeEventListener("contextmenu", Y, !0), window.removeEventListener("pointerdown", X, !0), window.removeEventListener("resize", C), window.removeEventListener("scroll", C, !0);
    }), (e, n) => (k(), E("div", {
      ref_key: "rootElement",
      ref: D,
      class: c(["relative flex min-h-0 flex-col overflow-hidden", be.value]),
      style: Q({ height: he.value }),
      onContextmenu: n[1] || (n[1] = Ge(() => {
      }, ["prevent"]))
    }, [
      d("div", {
        class: c(["shrink-0 border-b px-3 py-2", me.value])
      }, [
        d("div", dn, [
          d("div", {
            class: c(["flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]", ve.value])
          }, [
            Z(e.$slots, "header-leading"),
            d("span", null, S(l.planningBook.viewType), 1),
            d("span", {
              class: c(["h-1 w-1 rounded-full", N.value])
            }, null, 2),
            d("span", null, S(F.value.length) + " rows in view", 1),
            d("span", {
              class: c(["h-1 w-1 rounded-full", N.value])
            }, null, 2),
            d("span", null, S(l.planningBook.autoSubmitChanges ? "Automatic save" : "Save in batch"), 1),
            l.pendingEditCount ? (k(), E("span", {
              key: 0,
              class: c(["h-1 w-1 rounded-full", N.value])
            }, null, 2)) : A("", !0),
            l.pendingEditCount ? (k(), E("span", un, S(l.pendingEditCount) + " pending edits", 1)) : A("", !0)
          ], 2),
          d("div", fn, [
            Z(e.$slots, "header-actions"),
            d("label", {
              class: c(["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", Ce.value])
            }, [
              d("span", {
                class: c(xe.value)
              }, "Subtotal", 2),
              qe(d("select", {
                "onUpdate:modelValue": n[0] || (n[0] = (t) => b.value = t),
                class: c(ye.value)
              }, [
                (k(!0), E(je, null, Ue(l.planningBook.keyFigures, (t) => (k(), E("option", {
                  key: t,
                  value: t,
                  class: c(we.value)
                }, S(t), 11, cn))), 128))
              ], 2), [
                [Xe, b.value]
              ])
            ], 2)
          ])
        ])
      ], 2),
      d("div", gn, [
        Ye(Je(Qe), {
          class: "h-full min-h-0 w-full",
          "row-data": P.value,
          "column-defs": Se.value,
          "grid-options": _e.value,
          components: { planningBookTreeCellRenderer: nn },
          "pinned-bottom-row-data": pe.value,
          "get-row-id": (t) => {
            var a;
            return String(((a = t.data) == null ? void 0 : a.rowKey) ?? "");
          },
          theme: "legacy",
          onGridReady: De,
          onFirstDataRendered: Be,
          onFilterChanged: Pe,
          onSortChanged: Re,
          onCellClicked: Ae,
          onCellDoubleClicked: Le,
          onCellKeyDown: Oe,
          onCellContextMenu: Ve,
          onCellValueChanged: ze
        }, null, 8, ["row-data", "column-defs", "grid-options", "components", "pinned-bottom-row-data", "get-row-id"])
      ]),
      m.value ? (k(), E("div", {
        key: 0,
        ref_key: "contextMenuElement",
        ref: L,
        class: c(["absolute z-20 min-w-[10.75rem] overflow-hidden rounded-[12px] border shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl", ke.value]),
        style: Q({ left: `${m.value.x}px`, top: `${m.value.y}px` })
      }, [
        d("button", {
          type: "button",
          class: c(["flex w-full items-center px-3 py-2.5 text-left text-sm font-medium transition", Ee.value]),
          onClick: Te
        }, [...n[2] || (n[2] = [
          d("span", null, "Show details", -1)
        ])], 2)
      ], 6)) : A("", !0)
    ], 38));
  }
});
export {
  kn as default
};
