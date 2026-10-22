import { resolvePlanningBookPeriodFromField as f } from "./index9.js";
function m(e) {
  if (e == null) return;
  const i = String(e).trim();
  return i.length > 0 ? i : void 0;
}
function s(e, i, t) {
  return i.reduce((n, r) => {
    if (r.dimension !== t) return n;
    const o = m(e[r.field]);
    return o && (n[r.field] = o), n;
  }, {});
}
function u(e) {
  return Object.keys(e).sort().map((i) => `${i}:${e[i]}`).join("|");
}
function v(e, i, t, n, r, o) {
  const d = e.columnDefs.filter((a) => !a.dataColumn && a.field !== "keyFigure"), l = s(i, d, "location"), c = s(i, d, "material");
  return {
    planId: o.planId,
    referencePlanId: o.referencePlanId ?? void 0,
    viewType: e.viewType,
    viewName: o.viewName,
    locationId: o.locationId ?? l.locationId ?? i.locationId ?? void 0,
    locationDescriptionCols: l,
    materialDescriptionCols: c,
    keyFigure: i.keyFigure,
    period: f(e, t),
    uom: e.uom,
    oldValue: r,
    newValue: n
  };
}
function I(e) {
  return [
    e.viewName,
    e.locationId ?? "",
    e.keyFigure,
    e.period,
    u(e.locationDescriptionCols),
    u(e.materialDescriptionCols)
  ].join("::");
}
export {
  v as buildPlanningBookSelectedCellDto,
  I as buildPlanningBookSelectedCellKey
};
