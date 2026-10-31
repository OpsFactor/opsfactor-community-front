import { buildPlanningBookSelectedCellKey as a, buildPlanningBookRowScopeKey as y } from "./index13.js";
import { getPlanningBookPeriodField as d, normalizePlanningBook as w } from "./index9.js";
function g(e) {
  var o;
  return new Set((((o = e.additionalParameters) == null ? void 0 : o.directDemandAdjustmentKeyFigures) ?? "").split(/[|,]/).map((n) => n.trim()).filter(Boolean));
}
function f(e) {
  return a({ ...e, period: "" });
}
function m(e, o) {
  return new Map(o.map((n) => [y(e, n), n]));
}
function p(e) {
  return e.isPrimaryKeyFigureRow ? e.rowKey : e.parentRowKey ?? e.rowKey;
}
function K(e, o) {
  const n = p(e), i = p(o);
  return n === i || e.ancestorKeys.includes(i) || o.ancestorKeys.includes(n);
}
function P(e, o, n = w(e).rows) {
  const i = g(e), r = m(e, n);
  return (t) => {
    if (!i.has(t.keyFigure) || !o.length) return [];
    const l = a(t), u = r.get(f(t));
    return u ? o.filter((c) => {
      if (a(c) === l || !i.has(c.keyFigure) || d(e, c.period) !== d(e, t.period)) return !1;
      const s = r.get(f(c));
      return !!(s && K(u, s));
    }) : [];
  };
}
function V(e, o, n) {
  const i = a(n), r = o.find((s) => a(s) === i), t = { ...n, oldValue: (r == null ? void 0 : r.oldValue) ?? n.oldValue }, l = o.filter((s) => a(s) !== i);
  if (t.newValue === t.oldValue)
    return { conflicts: [], pendingEdits: l };
  const u = P(e, l)(n), c = new Set(u.map(a));
  return {
    conflicts: u,
    pendingEdits: [...l.filter((s) => !c.has(a(s))), t]
  };
}
function F(e, o, n) {
  const i = m(e, o);
  for (const r of n) {
    const t = i.get(f(r));
    if (!t) continue;
    const l = d(e, r.period);
    t[l] = r.newValue, t.updatedCells ?? (t.updatedCells = {}), t.updatedCells[l] = `Modified cell: from ${r.oldValue} to ${r.newValue}`;
  }
}
export {
  F as applyPendingPlanningBookEdits,
  P as createDemandPlanningBookConflictFinder,
  V as proposeDemandPlanningBookEdit
};
