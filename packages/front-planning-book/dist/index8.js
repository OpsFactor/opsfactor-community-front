import { defineComponent as ze, computed as i, ref as m, reactive as Ie, watch as N, nextTick as K, onMounted as We, onBeforeUnmount as He, openBlock as w, createElementBlock as k, withModifiers as $e, normalizeStyle as Q, normalizeClass as f, createElementVNode as d, renderSlot as Z, toDisplayString as S, createCommentVNode as V, withDirectives as Ge, Fragment as qe, renderList as je, vModelSelect as Ue, createVNode as Xe, unref as Ye } from "vue";
import { AgGridVue as Je } from "ag-grid-vue3";
import { ModuleRegistry as Qe, AllCommunityModule as Ze } from "ag-grid-community";
import et from "./index4.js";
import { applyPendingPlanningBookEdits as tt, createDemandPlanningBookConflictFinder as nt } from "./index14.js";
import { buildPlanningBookSelectedCellDto as at } from "./index13.js";
import { normalizePlanningBook as lt, selectPlanningBookSubtotalContributors as ot, aggregatePlanningBookSubtotalField as it } from "./index9.js";
const rt = { class: "flex flex-wrap items-center justify-between gap-3" }, st = { key: 1 }, dt = { class: "flex flex-wrap items-center justify-end gap-2" }, ut = ["value"], ft = { class: "ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1" }, ct = 30, gt = 32, yt = /* @__PURE__ */ ze({
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
  setup(ee, { emit: te }) {
    Qe.registerModules([Ze]);
    const l = ee, _ = te, r = i(() => l.themeMode === "light"), c = m(null), D = m(null), A = m(null), g = Ie({}), p = m(""), E = m([]), h = m(null), L = m(!1), P = m(!1), ne = ["Constrained Plan", "Unconstrained Plan", "Working Plan"], ae = /* @__PURE__ */ new Set([
      "Planned Inbound",
      "Inbound Orders",
      "Planned Production",
      "Production Orders"
    ]), le = /* @__PURE__ */ new Set([
      "Indirect Demand"
    ]), b = i(() => {
      const e = lt(l.planningBook);
      return l.mode === "demand" && tt(l.planningBook, e.rows, l.pendingEdits), e;
    }), oe = i(() => nt(
      l.planningBook,
      l.pendingEdits,
      b.value.rows
    )), O = i(() => {
      const e = new Map(l.planningBook.columnDefs.map((a) => [a.field, a])), t = l.orderedFields.map((a) => e.get(a)).filter((a) => !!a), n = new Set(t.map((a) => a.field));
      return [
        ...t,
        ...l.planningBook.columnDefs.filter((a) => !n.has(a.field))
      ];
    }), T = i(() => /* @__PURE__ */ new Set([
      ...l.planningBook.columnDefs.filter((e) => e.pinnedLeft).map((e) => e.field),
      ...l.pinnedFields
    ]));
    N(
      b,
      (e) => {
        const t = new Set(e.rows.map((n) => n.rowKey));
        if (Object.keys(g).forEach((n) => {
          t.has(n) || delete g[n];
        }), !L.value) {
          e.rows.forEach((n) => {
            n.hasChildren && n.isPrimaryKeyFigureRow && (g[n.rowKey] = !1);
          }), L.value = !0;
          return;
        }
        e.rows.forEach((n) => {
          n.hasChildren && n.isPrimaryKeyFigureRow && g[n.rowKey] == null && (g[n.rowKey] = !1);
        });
      },
      { immediate: !0 }
    ), N(
      () => l.planningBook.keyFigures,
      (e) => {
        if (!e.length) {
          p.value = "";
          return;
        }
        e.includes(p.value) || (p.value = e[0]);
      },
      { immediate: !0, deep: !0 }
    );
    const ie = i(
      () => b.value.rows.filter((e) => e.ancestorKeys.every((t) => g[t] !== !1))
    ), B = i(() => P.value ? b.value.rows : ie.value);
    N(
      B,
      async (e) => {
        if (!c.value) {
          E.value = e;
          return;
        }
        await K(), y();
      },
      { immediate: !0 }
    );
    function z(e) {
      var t;
      return !!(e.dataColumn || (t = e.cellFilter) != null && t.includes("customFormatNumber"));
    }
    function I(e) {
      return e.cellClass === "pastPeriods" || e.field === "Average Historical Sales";
    }
    function R(e) {
      const t = typeof e == "number" ? e : Number(e ?? Number.NaN);
      return Number.isFinite(t) ? t.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "";
    }
    function re(e, t, n) {
      var a;
      return (a = e == null ? void 0 : e.unavailableReasons) != null && a[t] ? "N/A" : R(n);
    }
    function W(e) {
      if (typeof e == "number") return e;
      if (typeof e != "string") return Number(e ?? Number.NaN);
      const t = e.trim().replace(/,/g, "");
      return t.length === 0 ? 0 : Number(t);
    }
    function H(e, t, n) {
      var C, x, F, J;
      if ((C = e.unavailableReasons) != null && C[t]) return !1;
      const a = (x = e.lockedCells) == null ? void 0 : x[t], s = (((F = e.additionalClasses) == null ? void 0 : F[t]) ?? []).includes("crosshatch"), u = String(e.editMode ?? "noEdit");
      return l.isSaving || a || s || n.enableCellEdit === !1 || u !== "cellEdit" && u !== "detailOrCellEdit" ? !1 : ((J = l.isCellEditable) == null ? void 0 : J.call(l, e, t, n)) ?? !0;
    }
    function se(e, t, n) {
      var s, u, C, x;
      const a = {}, o = ((s = e.additionalClasses) == null ? void 0 : s[t]) ?? [];
      return n.dataColumn && (a.justifyContent = "flex-end", a.textAlign = "right", a.fontVariantNumeric = "tabular-nums"), (u = e.unavailableReasons) != null && u[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(227, 102, 102, 0.16), rgba(255, 239, 239, 0.9))" : "linear-gradient(180deg, rgba(227, 102, 102, 0.18), rgba(102, 35, 45, 0.2))", a.color = r.value ? "rgba(132, 38, 50, 0.96)" : "rgba(255, 213, 219, 0.94)", a.fontWeight = "600"), o.includes("crosshatch") && (a.background = r.value ? "repeating-linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.18) 7px, rgba(226,232,240,0.55) 7px, rgba(226,232,240,0.55) 14px)" : "repeating-linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 7px, rgba(255,255,255,0.02) 7px, rgba(255,255,255,0.02) 14px)", a.color = r.value ? "rgba(82,97,121,0.92)" : "rgba(206,216,238,0.72)"), (C = e.updatedCells) != null && C[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(31, 135, 93, 0.14), rgba(226, 247, 239, 0.82))" : "linear-gradient(180deg, rgba(68, 204, 153, 0.18), rgba(27, 76, 61, 0.18))", a.boxShadow = r.value ? "inset 0 0 0 1px rgba(31, 135, 93, 0.22)" : "inset 0 0 0 1px rgba(68, 204, 153, 0.28)"), (x = e.lockedCells) != null && x[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(211, 155, 42, 0.15), rgba(255, 248, 230, 0.9))" : "linear-gradient(180deg, rgba(238, 173, 68, 0.15), rgba(122, 82, 23, 0.16))", a.color = r.value ? "rgba(95, 67, 18, 0.96)" : "rgba(255, 235, 204, 0.9)"), Object.keys(a).length > 0 ? a : void 0;
    }
    function de(e, t) {
      var n, a, o, s;
      return ((n = e.unavailableReasons) == null ? void 0 : n[t]) ?? ((a = e.lockedCells) == null ? void 0 : a[t]) ?? ((o = e.updatedCells) == null ? void 0 : o[t]) ?? ((s = e.toolTips) == null ? void 0 : s[t]) ?? void 0;
    }
    function ue(e, t) {
      var a, o, s;
      const n = [
        "ofx-ag-grid-body-cell",
        e.dataColumn ? "is-right" : "is-left"
      ];
      return e.field === "keyFigure" && n.push("ofx-planning-book-key-figure-column"), (a = t.data) != null && a.isPrimaryKeyFigureRow && !e.dataColumn && n.push("ofx-planning-book-primary-row"), !((o = t.data) != null && o.isPrimaryKeyFigureRow) && e.field === "keyFigure" && n.push("ofx-planning-book-secondary-key-figure"), I(e) && n.push("ofx-planning-book-past-period"), (s = t.data) != null && s.isDetailedRow && n.push("ofx-planning-book-detailed-row"), t.node.rowPinned === "bottom" && n.push("ofx-planning-book-subtotal-row"), n;
    }
    function fe(e) {
      var n;
      const t = ["ofx-ag-grid-body-cell", "is-center", "ofx-planning-book-hierarchy-column"];
      return (n = e.data) != null && n.isDetailedRow && t.push("ofx-planning-book-detailed-row"), e.node.rowPinned === "bottom" && t.push("ofx-planning-book-subtotal-row"), t;
    }
    function ce() {
      const e = {
        rowKey: "__subtotal__",
        ancestorKeys: [],
        level: 0,
        treeDepth: 0,
        rowOrder: -1,
        hasChildren: !1,
        keyFigure: p.value,
        groupLabel: "Subtotal",
        isPrimaryKeyFigureRow: !0,
        isDetailedRow: !1,
        hierarchyVariant: "group-total",
        uom: l.planningBook.uom,
        editMode: "noEdit"
      };
      b.value.descriptorFields.forEach((n) => {
        e[n] = "";
      });
      const t = ot(
        b.value.rows,
        E.value,
        p.value,
        !P.value
      );
      return b.value.periodFields.forEach((n) => {
        const a = it(
          l.planningBook,
          p.value,
          t,
          n
        );
        e[n] = a.value, a.unavailableReason && (e.unavailableReasons ?? (e.unavailableReasons = {}), e.unavailableReasons[n] = a.unavailableReason);
      }), e;
    }
    const ge = i(() => p.value ? [ce()] : []), pe = i(() => l.height == null ? "100%" : typeof l.height == "number" ? `${l.height}px` : l.height), he = i(() => r.value ? "bg-[color:var(--ofx-surface)]" : "bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"), be = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]" : "border-white/6"), ve = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/42"), M = i(() => r.value ? "bg-[color:var(--ofx-border-strong)]" : "bg-white/18"), me = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]" : "border-white/10 bg-white/[0.04] text-white/74"), Ce = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/48"), xe = i(() => r.value ? "bg-transparent text-xs font-medium text-[color:var(--ofx-text)] outline-none" : "bg-transparent text-xs font-medium text-white outline-none"), ye = i(() => r.value ? "bg-white" : "bg-[rgb(11_17_29)]"), we = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]" : "border-white/12 bg-[rgb(10_16_29_/_0.98)]"), ke = i(() => r.value ? "text-[color:var(--ofx-text)] hover:bg-[color:var(--ofx-surface-elevated)]" : "text-white/88 hover:bg-white/[0.06]");
    function Ee(e) {
      g[e] = !g[e], K().then(() => {
        y(), $();
      });
    }
    function y() {
      if (!c.value) {
        E.value = B.value;
        return;
      }
      const e = [];
      c.value.forEachNodeAfterFilterAndSort((t) => {
        t.rowPinned || !t.data || e.push(t.data);
      }), E.value = e;
    }
    function $() {
      if (!c.value) return;
      const e = O.value.filter((t) => !t.dataColumn).map((t) => t.field);
      if (e.length)
        try {
          c.value.autoSizeColumns(["__hierarchy__", ...e], !0);
        } catch {
        }
    }
    function G(e) {
      return e.dataColumn ? I(e) ? 112 : 124 : e.field === "uom" ? 58 : e.field === "keyFigure" ? 156 : e.field.endsWith("Description") ? 164 : e.field.endsWith("Id") ? 138 : T.value.has(e.field) ? 78 : 104;
    }
    const Fe = i(() => [
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
        cellClass: fe
      },
      ...O.value.map((e) => ({
        colId: e.field,
        field: e.field,
        headerName: e.name,
        minWidth: G(e),
        width: G(e),
        pinned: T.value.has(e.field) ? "left" : void 0,
        sortable: e.enableSorting !== !1,
        filter: e.enableFiltering === !1 ? !1 : z(e) ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: !0,
        lockPinned: !1,
        editable: (t) => t.node.rowPinned || !t.data ? !1 : H(t.data, e.field, e) && !j(t.data, e.field),
        valueFormatter: z(e) ? (t) => re(
          t.data,
          e.field,
          t.value
        ) : void 0,
        cellStyle: (t) => t.node.rowPinned || !t.data ? void 0 : se(t.data, e.field, e),
        tooltipValueGetter: (t) => {
          var n;
          return (n = t.node) != null && n.rowPinned ? void 0 : de(t.data, e.field);
        },
        headerClass: e.dataColumn ? ["ofx-ag-grid-header-cell", "is-right"] : ["ofx-ag-grid-header-cell"],
        cellClass: (t) => ue(e, t)
      }))
    ]), Se = i(() => ({
      rowHeight: ct,
      headerHeight: gt,
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
        toggleRow: Ee,
        isRowExpanded: (e) => e ? g[e] !== !1 : !0
      }
    }));
    function _e(e) {
      c.value = e.api, P.value = e.api.isAnyFilterPresent(), y();
    }
    function De(e) {
      $(), y();
    }
    function Pe(e) {
      var t;
      P.value = ((t = c.value) == null ? void 0 : t.isAnyFilterPresent()) ?? !1, y();
    }
    function Be(e) {
      y();
    }
    function v() {
      h.value = null;
    }
    function q(e) {
      const t = String(e.editMode ?? "noEdit");
      return (t === "detailOrCellEdit" || t === "detailDisaggregatedOnly") && !!e.materialId || t === "detailAggregatedDisaggregated";
    }
    function Re(e) {
      return ne.reduce((t, n) => t.endsWith(`-${n}`) ? t.slice(0, -n.length - 1) : t.endsWith(` (${n})`) ? t.slice(0, -n.length - 3) : t, e);
    }
    function Me(e) {
      const t = Re(String(e.keyFigure ?? ""));
      return le.has(t) ? !0 : ae.has(t) ? !!e.materialId : q(e);
    }
    function Ne(e, t) {
      return !l.detailsEnabled || e.rowKey === "__subtotal__" || !b.value.periodFields.includes(t) ? !1 : l.mode === "supply" ? Me(e) : q(e);
    }
    function Ke(e) {
      var F;
      const t = String(e.colDef.field ?? ""), n = e.data, a = e.event instanceof MouseEvent ? e.event : null;
      if (a == null || a.preventDefault(), a == null || a.stopPropagation(), !n || !Ne(n, t)) {
        v();
        return;
      }
      const o = (F = D.value) == null ? void 0 : F.getBoundingClientRect();
      if (!o || !a) return;
      const s = 172, u = 52, C = Math.min(Math.max(a.clientX - o.left, 12), Math.max(o.width - s - 12, 12)), x = Math.min(Math.max(a.clientY - o.top, 12), Math.max(o.height - u - 12, 12));
      h.value = {
        x: C,
        y: x,
        row: n,
        field: t
      };
    }
    function Ve(e) {
      var o;
      const t = e.data, n = String(e.colDef.field ?? ""), a = (o = t == null ? void 0 : t.unavailableReasons) == null ? void 0 : o[n];
      a && _("unavailable-edit", { reason: a });
    }
    function j(e, t) {
      if (l.mode !== "demand" || !l.pendingEdits.length) return !1;
      const n = Number(e[t] ?? 0), a = at(
        l.planningBook,
        e,
        t,
        n,
        n,
        { planId: "", viewName: l.planningBook.viewName }
      );
      return oe.value(a).length > 0;
    }
    function U(e, t, n) {
      const a = l.planningBook.columnDefs.find((o) => o.field === t);
      !e || !(a != null && a.dataColumn) || !H(e, t, a) || !j(e, t) || _("request-edit", {
        row: e,
        field: t,
        resumeEditing: async () => {
          var s, u;
          await K();
          const o = (s = c.value) == null ? void 0 : s.getRowNode(e.rowKey);
          (o == null ? void 0 : o.rowIndex) != null && ((u = c.value) == null || u.startEditingCell({ rowIndex: o.rowIndex, colKey: t, key: n }));
        }
      });
    }
    function Ae(e) {
      e.node.rowPinned || U(e.data, String(e.colDef.field ?? ""));
    }
    function Le(e) {
      const t = e.event;
      !(t instanceof KeyboardEvent) || e.node.rowPinned || t.ctrlKey || t.metaKey || t.altKey || t.target instanceof Element && t.target.closest('input, textarea, [contenteditable="true"]') || (t.key === "Enter" || t.key === "F2" || t.key === "Backspace" || t.key === "Delete" || t.key.length === 1) && U(e.data, String(e.colDef.field ?? ""), t.key);
    }
    function Oe() {
      h.value && (_("request-details", {
        row: h.value.row,
        field: h.value.field
      }), v());
    }
    function Te(e) {
      var o, s, u;
      const t = String(e.colDef.field ?? ""), n = typeof e.oldValue == "number" ? e.oldValue : W(e.oldValue), a = W(e.newValue);
      if (t.length === 0 || Number.isNaN(a) || n === a) {
        Number.isNaN(a) && (e.data[t] = n, (o = c.value) == null || o.refreshCells({
          columns: [t],
          force: !0
        }));
        return;
      }
      l.mode === "demand" ? e.data[t] = n : ((s = e.data).updatedCells ?? (s.updatedCells = {}), e.data.updatedCells[t] = `Modified cell: from ${R(n)} to ${R(a)}`), _("edit", {
        row: e.data,
        field: t,
        oldValue: n,
        newValue: a
      }), (u = c.value) == null || u.refreshCells({
        columns: [t],
        force: !0
      });
    }
    function X(e) {
      var n;
      if (!h.value) return;
      const t = e.target;
      if (!(t instanceof Node)) {
        v();
        return;
      }
      (n = A.value) != null && n.contains(t) || v();
    }
    function Y(e) {
      e.preventDefault();
    }
    return We(() => {
      var e;
      (e = D.value) == null || e.addEventListener("contextmenu", Y, !0), window.addEventListener("pointerdown", X, !0), window.addEventListener("resize", v), window.addEventListener("scroll", v, !0);
    }), He(() => {
      var e;
      (e = D.value) == null || e.removeEventListener("contextmenu", Y, !0), window.removeEventListener("pointerdown", X, !0), window.removeEventListener("resize", v), window.removeEventListener("scroll", v, !0);
    }), (e, t) => (w(), k("div", {
      ref_key: "rootElement",
      ref: D,
      class: f(["relative flex min-h-0 flex-col overflow-hidden", he.value]),
      style: Q({ height: pe.value }),
      onContextmenu: t[1] || (t[1] = $e(() => {
      }, ["prevent"]))
    }, [
      d("div", {
        class: f(["shrink-0 border-b px-3 py-2", be.value])
      }, [
        d("div", rt, [
          d("div", {
            class: f(["flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]", ve.value])
          }, [
            Z(e.$slots, "header-leading"),
            d("span", null, S(l.planningBook.viewType), 1),
            d("span", {
              class: f(["h-1 w-1 rounded-full", M.value])
            }, null, 2),
            d("span", null, S(E.value.length) + " rows in view", 1),
            d("span", {
              class: f(["h-1 w-1 rounded-full", M.value])
            }, null, 2),
            d("span", null, S(l.planningBook.autoSubmitChanges ? "Automatic save" : "Save in batch"), 1),
            l.pendingEditCount ? (w(), k("span", {
              key: 0,
              class: f(["h-1 w-1 rounded-full", M.value])
            }, null, 2)) : V("", !0),
            l.pendingEditCount ? (w(), k("span", st, S(l.pendingEditCount) + " pending edits", 1)) : V("", !0)
          ], 2),
          d("div", dt, [
            Z(e.$slots, "header-actions"),
            d("label", {
              class: f(["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", me.value])
            }, [
              d("span", {
                class: f(Ce.value)
              }, "Subtotal", 2),
              Ge(d("select", {
                "onUpdate:modelValue": t[0] || (t[0] = (n) => p.value = n),
                class: f(xe.value)
              }, [
                (w(!0), k(qe, null, je(l.planningBook.keyFigures, (n) => (w(), k("option", {
                  key: n,
                  value: n,
                  class: f(ye.value)
                }, S(n), 11, ut))), 128))
              ], 2), [
                [Ue, p.value]
              ])
            ], 2)
          ])
        ])
      ], 2),
      d("div", ft, [
        Xe(Ye(Je), {
          class: "h-full min-h-0 w-full",
          "row-data": B.value,
          "column-defs": Fe.value,
          "grid-options": Se.value,
          components: { planningBookTreeCellRenderer: et },
          "pinned-bottom-row-data": ge.value,
          "get-row-id": (n) => {
            var a;
            return String(((a = n.data) == null ? void 0 : a.rowKey) ?? "");
          },
          theme: "legacy",
          onGridReady: _e,
          onFirstDataRendered: De,
          onFilterChanged: Pe,
          onSortChanged: Be,
          onCellClicked: Ve,
          onCellDoubleClicked: Ae,
          onCellKeyDown: Le,
          onCellContextMenu: Ke,
          onCellValueChanged: Te
        }, null, 8, ["row-data", "column-defs", "grid-options", "components", "pinned-bottom-row-data", "get-row-id"])
      ]),
      h.value ? (w(), k("div", {
        key: 0,
        ref_key: "contextMenuElement",
        ref: A,
        class: f(["absolute z-20 min-w-[10.75rem] overflow-hidden rounded-[12px] border shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl", we.value]),
        style: Q({ left: `${h.value.x}px`, top: `${h.value.y}px` })
      }, [
        d("button", {
          type: "button",
          class: f(["flex w-full items-center px-3 py-2.5 text-left text-sm font-medium transition", ke.value]),
          onClick: Oe
        }, [...t[2] || (t[2] = [
          d("span", null, "Show details", -1)
        ])], 2)
      ], 6)) : V("", !0)
    ], 38));
  }
});
export {
  yt as default
};
