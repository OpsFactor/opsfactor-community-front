import { buildPlanningBookSelectedCellKey as s, buildPlanningBookSelectedCellDto as y } from "./index13.js";
import { getPlanningBookPeriodField as f, normalizePlanningBook as w } from "./index9.js";
function g(e) {
  var t;
  return new Set((((t = e.additionalParameters) == null ? void 0 : t.directDemandAdjustmentKeyFigures) ?? "").split(/[|,]/).map((n) => n.trim()).filter(Boolean));
}
function u(e) {
  return s({ ...e, period: "" });
}
function p(e, t) {
  return new Map(t.map((n) => {
    const r = y(e, n, "", 0, 0, { planId: "", viewName: e.viewName });
    return [u(r), n];
  }));
}
function m(e) {
  return e.isPrimaryKeyFigureRow ? e.rowKey : e.parentRowKey ?? e.rowKey;
}
function P(e, t) {
  const n = m(e), r = m(t);
  return n === r || e.ancestorKeys.includes(r) || t.ancestorKeys.includes(n);
}
function K(e, t, n = w(e).rows) {
  const r = g(e), i = p(e, n);
  return (o) => {
    if (!r.has(o.keyFigure) || !t.length) return [];
    const l = s(o), d = i.get(u(o));
    return d ? t.filter((c) => {
      if (s(c) === l || !r.has(c.keyFigure) || f(e, c.period) !== f(e, o.period)) return !1;
      const a = i.get(u(c));
      return !!(a && P(d, a));
    }) : [];
  };
}
function F(e, t, n) {
  const r = s(n), i = t.find((a) => s(a) === r), o = { ...n, oldValue: (i == null ? void 0 : i.oldValue) ?? n.oldValue }, l = t.filter((a) => s(a) !== r);
  if (o.newValue === o.oldValue)
    return { conflicts: [], pendingEdits: l };
  const d = K(e, l)(n), c = new Set(d.map(s));
  return {
    conflicts: d,
    pendingEdits: [...l.filter((a) => !c.has(s(a))), o]
  };
}
function R(e, t, n) {
  const r = p(e, t);
  for (const i of n) {
    const o = r.get(u(i));
    if (!o) continue;
    const l = f(e, i.period);
    o[l] = i.newValue, o.updatedCells ?? (o.updatedCells = {}), o.updatedCells[l] = `Modified cell: from ${i.oldValue} to ${i.newValue}`;
  }
}
export {
  R as applyPendingPlanningBookEdits,
  K as createDemandPlanningBookConflictFinder,
  F as proposeDemandPlanningBookEdit
};
