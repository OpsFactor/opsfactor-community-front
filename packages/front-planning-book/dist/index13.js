import { resolvePlanningBookPeriodFromField as m } from "./index9.js";
function p(e) {
  var i;
  return !e.dataColumn || e.enableCellEdit === !1 || ((i = e.cellClass) == null ? void 0 : i.split(/\s+/).includes("pastPeriods")) === !0 || e.field === "Average Historical Sales";
}
function v(e, i) {
  const o = e.columnDefs.find((t) => t.field === i || t.name === i);
  if (!o || p(o))
    throw new Error("This Planning Book column is read-only.");
  const n = m(e, i);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n))
    throw new Error("A Planning Book update requires a calendar date.");
  return n;
}
function C(e) {
  if (e == null) return;
  const i = String(e).trim();
  return i.length > 0 ? i : void 0;
}
function l(e, i, o) {
  return i.reduce((n, t) => {
    if (t.dimension !== o) return n;
    const r = C(e[t.field]);
    return r && (n[t.field] = r), n;
  }, {});
}
function c(e) {
  return Object.keys(e).sort().map((i) => `${i}:${e[i]}`).join("|");
}
function P(e, i, o, n, t, r) {
  const u = v(e, o), a = e.columnDefs.filter((s) => !s.dataColumn && s.field !== "keyFigure"), d = l(i, a, "location"), f = l(i, a, "material");
  return {
    planId: r.planId,
    referencePlanId: r.referencePlanId ?? void 0,
    viewType: e.viewType,
    viewName: r.viewName,
    locationId: r.locationId ?? d.locationId ?? i.locationId ?? void 0,
    locationDescriptionCols: d,
    materialDescriptionCols: f,
    keyFigure: i.keyFigure,
    period: u,
    uom: e.uom,
    oldValue: t,
    newValue: n
  };
}
function I(e, i) {
  const o = l(i, e.columnDefs, "location");
  return y({
    viewName: e.viewName,
    locationId: o.locationId ?? i.locationId,
    locationDescriptionCols: o,
    materialDescriptionCols: l(i, e.columnDefs, "material"),
    keyFigure: i.keyFigure,
    period: ""
  });
}
function y(e) {
  return [
    e.viewName,
    e.locationId ?? "",
    e.keyFigure,
    e.period,
    c(e.locationDescriptionCols),
    c(e.materialDescriptionCols)
  ].join("::");
}
export {
  I as buildPlanningBookRowScopeKey,
  P as buildPlanningBookSelectedCellDto,
  y as buildPlanningBookSelectedCellKey,
  p as isPlanningBookReadOnlyColumn,
  v as resolvePlanningBookEditablePeriod
};
