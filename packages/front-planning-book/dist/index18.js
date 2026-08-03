import { defineComponent as z, ref as m, reactive as A, watch as P, computed as s, nextTick as G, onMounted as U, onBeforeUnmount as Y, openBlock as r, createElementBlock as i, createElementVNode as d, toDisplayString as v, createTextVNode as K, withDirectives as q, vModelText as J, normalizeStyle as w, Fragment as R, renderList as C, normalizeClass as $, renderSlot as T } from "vue";
const Q = {
  class: "planning-book-virtual-grid",
  "aria-label": "Planning Book grid"
}, X = { class: "grid-toolbar" }, Z = ["disabled"], ee = ["aria-expanded", "onClick"], te = {
  key: 1,
  class: "tree-spacer",
  "aria-hidden": "true"
}, ae = { class: "grid-empty" }, o = 42, H = 8, ie = /* @__PURE__ */ z({
  __name: "PlanningBookVirtualGrid",
  props: {
    rows: {},
    columns: {},
    emptyMessage: { default: "No Planning Book rows are available." },
    busy: { type: Boolean, default: !1 }
  },
  setup(y) {
    const c = y, u = m(null), E = m(520), b = m(0), p = m(""), n = A({});
    let g;
    P(() => c.rows, (e) => {
      const a = new Set(e.map((t) => t.rowKey));
      Object.keys(n).forEach((t) => {
        a.has(t) || delete n[t];
      }), e.forEach((t) => {
        t.hierarchyExpandable && n[t.rowKey] === void 0 && (n[t.rowKey] = !0);
      });
    }, { immediate: !0 });
    const k = s(() => new Map(c.rows.filter((e) => e.hierarchyParentRowKey !== void 0).map((e) => [e.rowKey, e.hierarchyParentRowKey])));
    function f(e, a) {
      var t;
      return (t = a.getValue) == null ? void 0 : t.call(a, e);
    }
    function _(e) {
      const a = p.value.trim().toLocaleLowerCase();
      return a.length === 0 || c.columns.some((t) => String(f(e, t) ?? "").toLocaleLowerCase().includes(a));
    }
    const L = s(() => {
      const e = new Set(c.rows.filter(_).map((a) => a.rowKey));
      return p.value.trim().length === 0 || [...e].forEach((a) => {
        let t = k.value.get(a);
        for (; t !== void 0; )
          e.add(t), t = k.value.get(t);
      }), e;
    });
    function F(e) {
      let a = e.hierarchyParentRowKey;
      for (; a !== void 0; ) {
        if (n[a] === !1) return !1;
        a = k.value.get(a);
      }
      return !0;
    }
    const h = s(() => c.rows.filter((e) => L.value.has(e.rowKey) && F(e))), M = s(() => Math.max(0, b.value - o)), S = s(() => Math.max(0, Math.floor(M.value / o) - H)), I = s(() => Math.min(h.value.length, Math.ceil((M.value + Math.max(0, E.value - o)) / o) + H)), N = s(() => h.value.slice(S.value, I.value)), V = s(() => c.columns.map((e) => e.width ?? "9rem").join(" "));
    function O(e) {
      return e.id.startsWith("period:");
    }
    function W(e) {
      e.hierarchyExpandable && (n[e.rowKey] = !(n[e.rowKey] ?? !0));
    }
    function D(e) {
      b.value = e.currentTarget.scrollTop;
    }
    function x() {
      var e;
      E.value = Math.max(((e = u.value) == null ? void 0 : e.clientHeight) ?? 0, o * 3);
    }
    return P([h, p], () => {
      b.value = 0, u.value !== null && (u.value.scrollTop = 0), G(x);
    }), U(() => {
      x(), g = new ResizeObserver(x), u.value !== null && g.observe(u.value);
    }), Y(() => g == null ? void 0 : g.disconnect()), (e, a) => (r(), i("section", Q, [
      d("header", X, [
        d("span", null, v(h.value.length) + " rows in view", 1),
        d("label", null, [
          a[1] || (a[1] = K("Filter visible book", -1)),
          q(d("input", {
            "onUpdate:modelValue": a[0] || (a[0] = (t) => p.value = t),
            type: "search",
            placeholder: "Material, location or key figure",
            disabled: y.busy
          }, null, 8, Z), [
            [J, p.value]
          ])
        ])
      ]),
      h.value.length > 0 ? (r(), i("div", {
        key: 0,
        ref_key: "viewportElement",
        ref: u,
        class: "grid-viewport",
        onScroll: D
      }, [
        d("div", {
          class: "grid-content",
          style: w({ height: `${(h.value.length + 1) * o}px`, minWidth: "max-content" })
        }, [
          d("div", {
            class: "grid-row grid-header",
            style: w({ gridTemplateColumns: V.value })
          }, [
            (r(!0), i(R, null, C(y.columns, (t) => (r(), i("div", {
              key: t.id,
              class: $(t.headerClass)
            }, v(t.label), 3))), 128))
          ], 4),
          (r(!0), i(R, null, C(N.value, (t, j) => (r(), i("div", {
            key: t.rowKey,
            class: "grid-row grid-data-row",
            style: w({ gridTemplateColumns: V.value, transform: `translateY(${o + (S.value + j) * o}px)` })
          }, [
            (r(!0), i(R, null, C(y.columns, (l) => {
              var B;
              return r(), i("div", {
                key: l.id,
                class: $([l.cellClass, { "period-cell": O(l), "crosshatched-cell": (B = t.additionalClasses[l.id.slice(7)]) == null ? void 0 : B.includes("crosshatch") }])
              }, [
                l.hierarchy ? (r(), i("div", {
                  key: 0,
                  class: "hierarchy-cell",
                  style: w({ paddingInlineStart: `${t.hierarchyDepth * 1.35 + 0.35}rem` })
                }, [
                  t.hierarchyExpandable ? (r(), i("button", {
                    key: 0,
                    class: "tree-toggle",
                    type: "button",
                    "aria-expanded": n[t.rowKey] !== !1,
                    onClick: (le) => W(t)
                  }, v(n[t.rowKey] === !1 ? "›" : "⌄"), 9, ee)) : (r(), i("span", te)),
                  T(e.$slots, "cell", {
                    row: t,
                    column: l,
                    value: f(t, l)
                  }, () => [
                    K(v(f(t, l)), 1)
                  ], !0)
                ], 4)) : T(e.$slots, "cell", {
                  key: 1,
                  row: t,
                  column: l,
                  value: f(t, l)
                }, () => [
                  K(v(f(t, l)), 1)
                ], !0)
              ], 2);
            }), 128))
          ], 4))), 128))
        ], 4)
      ], 544)) : T(e.$slots, "empty", { key: 1 }, () => [
        d("p", ae, v(y.emptyMessage), 1)
      ], !0)
    ]));
  }
});
export {
  ie as default
};
