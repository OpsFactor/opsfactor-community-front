import { defineComponent as Ve, computed as i, ref as m, reactive as ze, watch as P, nextTick as Y, onMounted as Ie, onBeforeUnmount as We, openBlock as w, createElementBlock as k, withModifiers as He, normalizeStyle as J, normalizeClass as f, createElementVNode as d, renderSlot as Q, toDisplayString as _, createCommentVNode as T, withDirectives as $e, Fragment as je, renderList as Ge, vModelSelect as qe, createVNode as Ue, unref as Xe } from "vue";
import { AgGridVue as Ye } from "ag-grid-vue3";
import { ModuleRegistry as Je, AllCommunityModule as Qe } from "ag-grid-community";
import Ze from "./index4.js";
import { normalizePlanningBook as et, getPlanningBookPeriodField as tt, selectPlanningBookSubtotalContributors as nt, aggregatePlanningBookSubtotalField as at } from "./index9.js";
const lt = { class: "flex flex-wrap items-center justify-between gap-3" }, ot = { key: 1 }, it = { class: "flex flex-wrap items-center justify-end gap-2" }, rt = ["value"], st = { class: "ofx-ag-grid ag-theme-quartz ofx-planning-book-grid min-h-0 flex-1" }, ut = 30, dt = 32, bt = /* @__PURE__ */ Ve({
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
  emits: ["edit", "unavailable-edit", "request-details"],
  setup(Z, { emit: ee }) {
    Je.registerModules([Qe]);
    const l = Z, B = ee, r = i(() => l.themeMode === "light"), g = m(null), E = m(null), A = m(null), p = ze({}), h = m(""), F = m([]), b = m(null), L = m(!1), M = m(!1), te = ["Constrained Plan", "Unconstrained Plan", "Working Plan"], ne = /* @__PURE__ */ new Set([
      "Planned Inbound",
      "Inbound Orders",
      "Planned Production",
      "Production Orders"
    ]), ae = /* @__PURE__ */ new Set([
      "Indirect Demand"
    ]), c = i(() => et(l.planningBook)), D = i(() => {
      var e;
      return new Set(
        (((e = l.planningBook.additionalParameters) == null ? void 0 : e.directDemandAdjustmentKeyFigures) ?? "").split(/[|,]/).map((t) => t.trim()).filter(Boolean)
      );
    });
    function O(e) {
      const t = `-${e.keyFigure}`, n = e.rowKey.lastIndexOf(t);
      return n >= 0 ? e.rowKey.slice(0, n) : e.rowKey;
    }
    function le(e, t) {
      if (e.keyFigure !== t.keyFigure) return !1;
      const n = {
        ...t.locationDescriptionCols,
        ...t.materialDescriptionCols
      };
      return Object.entries(n).every(([a, o]) => String(e[a] ?? "") === o);
    }
    function oe() {
      var e;
      c.value.rows.forEach((t) => {
        t.lockedCells = void 0;
      }), !(l.planningBook.autoSubmitChanges || !D.value.size) && (l.pendingEdits.forEach((t) => {
        if (!D.value.has(t.keyFigure)) return;
        const n = tt(l.planningBook, t.period);
        c.value.rows.filter((o) => le(o, t)).forEach((o) => {
          const u = O(o);
          c.value.rows.forEach((s) => {
            s.rowKey === o.rowKey || O(s) !== u || !D.value.has(s.keyFigure) || (s.lockedCells ?? (s.lockedCells = {}), s.lockedCells[n] = "This cell is locked because an unsaved Gross/Net or Direct Demand quantity adjustment exists for this level and period.");
          });
        });
      }), (e = g.value) == null || e.refreshCells({ force: !0 }));
    }
    P(
      [c, () => l.pendingEdits, D],
      () => oe(),
      { immediate: !0 }
    );
    const V = i(() => {
      const e = new Map(l.planningBook.columnDefs.map((a) => [a.field, a])), t = l.orderedFields.map((a) => e.get(a)).filter((a) => !!a), n = new Set(t.map((a) => a.field));
      return [
        ...t,
        ...l.planningBook.columnDefs.filter((a) => !n.has(a.field))
      ];
    }), z = i(() => /* @__PURE__ */ new Set([
      ...l.planningBook.columnDefs.filter((e) => e.pinnedLeft).map((e) => e.field),
      ...l.pinnedFields
    ]));
    P(
      c,
      (e) => {
        const t = new Set(e.rows.map((n) => n.rowKey));
        if (Object.keys(p).forEach((n) => {
          t.has(n) || delete p[n];
        }), !L.value) {
          e.rows.forEach((n) => {
            n.hasChildren && n.isPrimaryKeyFigureRow && (p[n.rowKey] = !1);
          }), L.value = !0;
          return;
        }
        e.rows.forEach((n) => {
          n.hasChildren && n.isPrimaryKeyFigureRow && p[n.rowKey] == null && (p[n.rowKey] = !1);
        });
      },
      { immediate: !0 }
    ), P(
      () => l.planningBook.keyFigures,
      (e) => {
        if (!e.length) {
          h.value = "";
          return;
        }
        e.includes(h.value) || (h.value = e[0]);
      },
      { immediate: !0, deep: !0 }
    );
    const ie = i(
      () => c.value.rows.filter((e) => e.ancestorKeys.every((t) => p[t] !== !1))
    ), R = i(() => M.value ? c.value.rows : ie.value);
    P(
      R,
      async (e) => {
        if (!g.value) {
          F.value = e;
          return;
        }
        await Y(), C();
      },
      { immediate: !0 }
    );
    function I(e) {
      var t;
      return !!(e.dataColumn || (t = e.cellFilter) != null && t.includes("customFormatNumber"));
    }
    function W(e) {
      return e.cellClass === "pastPeriods" || e.field === "Average Historical Sales";
    }
    function N(e) {
      const t = typeof e == "number" ? e : Number(e ?? Number.NaN);
      return Number.isFinite(t) ? t.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "";
    }
    function re(e, t, n) {
      var a;
      return (a = e == null ? void 0 : e.unavailableReasons) != null && a[t] ? "N/A" : N(n);
    }
    function H(e) {
      if (typeof e == "number") return e;
      if (typeof e != "string") return Number(e ?? Number.NaN);
      const t = e.trim().replace(/,/g, "");
      return t.length === 0 ? 0 : Number(t);
    }
    function se(e, t, n) {
      var x, y, S, X;
      if ((x = e.unavailableReasons) != null && x[t]) return !1;
      const a = (y = e.lockedCells) == null ? void 0 : y[t], u = (((S = e.additionalClasses) == null ? void 0 : S[t]) ?? []).includes("crosshatch"), s = String(e.editMode ?? "noEdit");
      return l.isSaving || a || u || n.enableCellEdit === !1 || s !== "cellEdit" && s !== "detailOrCellEdit" ? !1 : ((X = l.isCellEditable) == null ? void 0 : X.call(l, e, t, n)) ?? !0;
    }
    function ue(e, t, n) {
      var u, s, x, y;
      const a = {}, o = ((u = e.additionalClasses) == null ? void 0 : u[t]) ?? [];
      return n.dataColumn && (a.justifyContent = "flex-end", a.textAlign = "right", a.fontVariantNumeric = "tabular-nums"), (s = e.unavailableReasons) != null && s[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(227, 102, 102, 0.16), rgba(255, 239, 239, 0.9))" : "linear-gradient(180deg, rgba(227, 102, 102, 0.18), rgba(102, 35, 45, 0.2))", a.color = r.value ? "rgba(132, 38, 50, 0.96)" : "rgba(255, 213, 219, 0.94)", a.fontWeight = "600"), o.includes("crosshatch") && (a.background = r.value ? "repeating-linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.18) 7px, rgba(226,232,240,0.55) 7px, rgba(226,232,240,0.55) 14px)" : "repeating-linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 7px, rgba(255,255,255,0.02) 7px, rgba(255,255,255,0.02) 14px)", a.color = r.value ? "rgba(82,97,121,0.92)" : "rgba(206,216,238,0.72)"), (x = e.updatedCells) != null && x[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(31, 135, 93, 0.14), rgba(226, 247, 239, 0.82))" : "linear-gradient(180deg, rgba(68, 204, 153, 0.18), rgba(27, 76, 61, 0.18))", a.boxShadow = r.value ? "inset 0 0 0 1px rgba(31, 135, 93, 0.22)" : "inset 0 0 0 1px rgba(68, 204, 153, 0.28)"), (y = e.lockedCells) != null && y[t] && (a.background = r.value ? "linear-gradient(180deg, rgba(211, 155, 42, 0.15), rgba(255, 248, 230, 0.9))" : "linear-gradient(180deg, rgba(238, 173, 68, 0.15), rgba(122, 82, 23, 0.16))", a.color = r.value ? "rgba(95, 67, 18, 0.96)" : "rgba(255, 235, 204, 0.9)"), Object.keys(a).length > 0 ? a : void 0;
    }
    function de(e, t) {
      var n, a, o, u;
      return ((n = e.unavailableReasons) == null ? void 0 : n[t]) ?? ((a = e.lockedCells) == null ? void 0 : a[t]) ?? ((o = e.updatedCells) == null ? void 0 : o[t]) ?? ((u = e.toolTips) == null ? void 0 : u[t]) ?? void 0;
    }
    function fe(e, t) {
      var a, o, u;
      const n = [
        "ofx-ag-grid-body-cell",
        e.dataColumn ? "is-right" : "is-left"
      ];
      return e.field === "keyFigure" && n.push("ofx-planning-book-key-figure-column"), (a = t.data) != null && a.isPrimaryKeyFigureRow && !e.dataColumn && n.push("ofx-planning-book-primary-row"), !((o = t.data) != null && o.isPrimaryKeyFigureRow) && e.field === "keyFigure" && n.push("ofx-planning-book-secondary-key-figure"), W(e) && n.push("ofx-planning-book-past-period"), (u = t.data) != null && u.isDetailedRow && n.push("ofx-planning-book-detailed-row"), t.node.rowPinned === "bottom" && n.push("ofx-planning-book-subtotal-row"), n;
    }
    function ce(e) {
      var n;
      const t = ["ofx-ag-grid-body-cell", "is-center", "ofx-planning-book-hierarchy-column"];
      return (n = e.data) != null && n.isDetailedRow && t.push("ofx-planning-book-detailed-row"), e.node.rowPinned === "bottom" && t.push("ofx-planning-book-subtotal-row"), t;
    }
    function ge() {
      const e = {
        rowKey: "__subtotal__",
        ancestorKeys: [],
        level: 0,
        treeDepth: 0,
        rowOrder: -1,
        hasChildren: !1,
        keyFigure: h.value,
        groupLabel: "Subtotal",
        isPrimaryKeyFigureRow: !0,
        isDetailedRow: !1,
        hierarchyVariant: "group-total",
        uom: l.planningBook.uom,
        editMode: "noEdit"
      };
      c.value.descriptorFields.forEach((n) => {
        e[n] = "";
      });
      const t = nt(
        c.value.rows,
        F.value,
        h.value,
        !M.value
      );
      return c.value.periodFields.forEach((n) => {
        const a = at(
          l.planningBook,
          h.value,
          t,
          n
        );
        e[n] = a.value, a.unavailableReason && (e.unavailableReasons ?? (e.unavailableReasons = {}), e.unavailableReasons[n] = a.unavailableReason);
      }), e;
    }
    const pe = i(() => h.value ? [ge()] : []), he = i(() => l.height == null ? "100%" : typeof l.height == "number" ? `${l.height}px` : l.height), be = i(() => r.value ? "bg-[color:var(--ofx-surface)]" : "bg-[linear-gradient(180deg,rgb(17_24_40_/_0.98),rgb(9_13_23_/_0.99))]"), ve = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]" : "border-white/6"), me = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/42"), K = i(() => r.value ? "bg-[color:var(--ofx-border-strong)]" : "bg-white/18"), xe = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)]" : "border-white/10 bg-white/[0.04] text-white/74"), ye = i(() => r.value ? "text-[color:var(--ofx-text-subtle)]" : "text-white/48"), Ce = i(() => r.value ? "bg-transparent text-xs font-medium text-[color:var(--ofx-text)] outline-none" : "bg-transparent text-xs font-medium text-white outline-none"), we = i(() => r.value ? "bg-white" : "bg-[rgb(11_17_29)]"), ke = i(() => r.value ? "border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]" : "border-white/12 bg-[rgb(10_16_29_/_0.98)]"), Fe = i(() => r.value ? "text-[color:var(--ofx-text)] hover:bg-[color:var(--ofx-surface-elevated)]" : "text-white/88 hover:bg-white/[0.06]");
    function Se(e) {
      p[e] = !p[e], Y().then(() => {
        C(), $();
      });
    }
    function C() {
      if (!g.value) {
        F.value = R.value;
        return;
      }
      const e = [];
      g.value.forEachNodeAfterFilterAndSort((t) => {
        t.rowPinned || !t.data || e.push(t.data);
      }), F.value = e;
    }
    function $() {
      if (!g.value) return;
      const e = V.value.filter((t) => !t.dataColumn).map((t) => t.field);
      if (e.length)
        try {
          g.value.autoSizeColumns(["__hierarchy__", ...e], !0);
        } catch {
        }
    }
    function j(e) {
      return e.dataColumn ? W(e) ? 112 : 124 : e.field === "uom" ? 58 : e.field === "keyFigure" ? 156 : e.field.endsWith("Description") ? 164 : e.field.endsWith("Id") ? 138 : z.value.has(e.field) ? 78 : 104;
    }
    const _e = i(() => [
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
      ...V.value.map((e) => ({
        colId: e.field,
        field: e.field,
        headerName: e.name,
        minWidth: j(e),
        width: j(e),
        pinned: z.value.has(e.field) ? "left" : void 0,
        sortable: e.enableSorting !== !1,
        filter: e.enableFiltering === !1 ? !1 : I(e) ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: !0,
        lockPinned: !1,
        editable: (t) => t.node.rowPinned || !t.data ? !1 : se(t.data, e.field, e),
        valueFormatter: I(e) ? (t) => re(
          t.data,
          e.field,
          t.value
        ) : void 0,
        cellStyle: (t) => t.node.rowPinned || !t.data ? void 0 : ue(t.data, e.field, e),
        tooltipValueGetter: (t) => {
          var n;
          return (n = t.node) != null && n.rowPinned ? void 0 : de(t.data, e.field);
        },
        headerClass: e.dataColumn ? ["ofx-ag-grid-header-cell", "is-right"] : ["ofx-ag-grid-header-cell"],
        cellClass: (t) => fe(e, t)
      }))
    ]), Ee = i(() => ({
      rowHeight: ut,
      headerHeight: dt,
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
        suppressMovable: !1,
        menuTabs: ["generalMenuTab", "filterMenuTab", "columnsMenuTab"]
      },
      context: {
        toggleRow: Se,
        isRowExpanded: (e) => e ? p[e] !== !1 : !0
      }
    }));
    function Me(e) {
      g.value = e.api, M.value = e.api.isAnyFilterPresent(), C();
    }
    function De(e) {
      $(), C();
    }
    function Pe(e) {
      var t;
      M.value = ((t = g.value) == null ? void 0 : t.isAnyFilterPresent()) ?? !1, C();
    }
    function Be(e) {
      C();
    }
    function v() {
      b.value = null;
    }
    function G(e) {
      const t = String(e.editMode ?? "noEdit");
      return (t === "detailOrCellEdit" || t === "detailDisaggregatedOnly") && !!e.materialId || t === "detailAggregatedDisaggregated";
    }
    function Re(e) {
      return te.reduce((t, n) => t.endsWith(`-${n}`) ? t.slice(0, -n.length - 1) : t.endsWith(` (${n})`) ? t.slice(0, -n.length - 3) : t, e);
    }
    function Ne(e) {
      const t = Re(String(e.keyFigure ?? ""));
      return ae.has(t) ? !0 : ne.has(t) ? !!e.materialId : G(e);
    }
    function Ke(e, t) {
      return !l.detailsEnabled || e.rowKey === "__subtotal__" || !c.value.periodFields.includes(t) ? !1 : l.mode === "supply" ? Ne(e) : G(e);
    }
    function Te(e) {
      var S;
      const t = String(e.colDef.field ?? ""), n = e.data, a = e.event instanceof MouseEvent ? e.event : null;
      if (a == null || a.preventDefault(), a == null || a.stopPropagation(), !n || !Ke(n, t)) {
        v();
        return;
      }
      const o = (S = E.value) == null ? void 0 : S.getBoundingClientRect();
      if (!o || !a) return;
      const u = 172, s = 52, x = Math.min(Math.max(a.clientX - o.left, 12), Math.max(o.width - u - 12, 12)), y = Math.min(Math.max(a.clientY - o.top, 12), Math.max(o.height - s - 12, 12));
      b.value = {
        x,
        y,
        row: n,
        field: t
      };
    }
    function Ae(e) {
      var o;
      const t = e.data, n = String(e.colDef.field ?? ""), a = (o = t == null ? void 0 : t.unavailableReasons) == null ? void 0 : o[n];
      a && B("unavailable-edit", { reason: a });
    }
    function Le() {
      b.value && (B("request-details", {
        row: b.value.row,
        field: b.value.field
      }), v());
    }
    function Oe(e) {
      var o, u, s;
      const t = String(e.colDef.field ?? ""), n = typeof e.oldValue == "number" ? e.oldValue : H(e.oldValue), a = H(e.newValue);
      if (t.length === 0 || Number.isNaN(a) || n === a) {
        Number.isNaN(a) && (e.data[t] = n, (o = g.value) == null || o.refreshCells({
          columns: [t],
          force: !0
        }));
        return;
      }
      (u = e.data).updatedCells ?? (u.updatedCells = {}), e.data.updatedCells[t] = `Modified cell: from ${N(n)} to ${N(a)}`, B("edit", {
        row: e.data,
        field: t,
        oldValue: n,
        newValue: a
      }), (s = g.value) == null || s.refreshCells({
        columns: [t],
        force: !0
      });
    }
    function q(e) {
      var n;
      if (!b.value) return;
      const t = e.target;
      if (!(t instanceof Node)) {
        v();
        return;
      }
      (n = A.value) != null && n.contains(t) || v();
    }
    function U(e) {
      e.preventDefault();
    }
    return Ie(() => {
      var e;
      (e = E.value) == null || e.addEventListener("contextmenu", U, !0), window.addEventListener("pointerdown", q, !0), window.addEventListener("resize", v), window.addEventListener("scroll", v, !0);
    }), We(() => {
      var e;
      (e = E.value) == null || e.removeEventListener("contextmenu", U, !0), window.removeEventListener("pointerdown", q, !0), window.removeEventListener("resize", v), window.removeEventListener("scroll", v, !0);
    }), (e, t) => (w(), k("div", {
      ref_key: "rootElement",
      ref: E,
      class: f(["relative flex min-h-0 flex-col overflow-hidden", be.value]),
      style: J({ height: he.value }),
      onContextmenu: t[1] || (t[1] = He(() => {
      }, ["prevent"]))
    }, [
      d("div", {
        class: f(["shrink-0 border-b px-3 py-2", ve.value])
      }, [
        d("div", lt, [
          d("div", {
            class: f(["flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em]", me.value])
          }, [
            Q(e.$slots, "header-leading"),
            d("span", null, _(l.planningBook.viewType), 1),
            d("span", {
              class: f(["h-1 w-1 rounded-full", K.value])
            }, null, 2),
            d("span", null, _(F.value.length) + " rows in view", 1),
            d("span", {
              class: f(["h-1 w-1 rounded-full", K.value])
            }, null, 2),
            d("span", null, _(l.planningBook.autoSubmitChanges ? "Automatic save" : "Save in batch"), 1),
            l.pendingEditCount ? (w(), k("span", {
              key: 0,
              class: f(["h-1 w-1 rounded-full", K.value])
            }, null, 2)) : T("", !0),
            l.pendingEditCount ? (w(), k("span", ot, _(l.pendingEditCount) + " pending edits", 1)) : T("", !0)
          ], 2),
          d("div", it, [
            Q(e.$slots, "header-actions"),
            d("label", {
              class: f(["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", xe.value])
            }, [
              d("span", {
                class: f(ye.value)
              }, "Subtotal", 2),
              $e(d("select", {
                "onUpdate:modelValue": t[0] || (t[0] = (n) => h.value = n),
                class: f(Ce.value)
              }, [
                (w(!0), k(je, null, Ge(l.planningBook.keyFigures, (n) => (w(), k("option", {
                  key: n,
                  value: n,
                  class: f(we.value)
                }, _(n), 11, rt))), 128))
              ], 2), [
                [qe, h.value]
              ])
            ], 2)
          ])
        ])
      ], 2),
      d("div", st, [
        Ue(Xe(Ye), {
          class: "h-full min-h-0 w-full",
          "row-data": R.value,
          "column-defs": _e.value,
          "grid-options": Ee.value,
          components: { planningBookTreeCellRenderer: Ze },
          "pinned-bottom-row-data": pe.value,
          "get-row-id": (n) => {
            var a;
            return String(((a = n.data) == null ? void 0 : a.rowKey) ?? "");
          },
          theme: "legacy",
          onGridReady: Me,
          onFirstDataRendered: De,
          onFilterChanged: Pe,
          onSortChanged: Be,
          onCellClicked: Ae,
          onCellContextMenu: Te,
          onCellValueChanged: Oe
        }, null, 8, ["row-data", "column-defs", "grid-options", "components", "pinned-bottom-row-data", "get-row-id"])
      ]),
      b.value ? (w(), k("div", {
        key: 0,
        ref_key: "contextMenuElement",
        ref: A,
        class: f(["absolute z-20 min-w-[10.75rem] overflow-hidden rounded-[12px] border shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl", ke.value]),
        style: J({ left: `${b.value.x}px`, top: `${b.value.y}px` })
      }, [
        d("button", {
          type: "button",
          class: f(["flex w-full items-center px-3 py-2.5 text-left text-sm font-medium transition", Fe.value]),
          onClick: Le
        }, [...t[2] || (t[2] = [
          d("span", null, "Show details", -1)
        ])], 2)
      ], 6)) : T("", !0)
    ], 38));
  }
});
export {
  bt as default
};
