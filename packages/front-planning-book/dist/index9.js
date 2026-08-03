function N(a, n) {
  return a === "Average Historical Sales" ? a : n === "DIARIO" || n === "SEMANAL" || n === "MENSAL" ? a.slice(0, 10) : a;
}
function R(a, n) {
  const i = N(n, a.bucketSize), r = a.columnDefs.find((s) => !!s.dataColumn && (s.field === i || s.field === n || s.name === i));
  return (r == null ? void 0 : r.field) ?? i;
}
function I(a, n) {
  const i = a.columnDefs.find((e) => !!e.dataColumn && (e.field === n || e.name === n)), r = (i == null ? void 0 : i.field) ?? n, s = a.periodList.find((e) => e === r || N(e, a.bucketSize) === r);
  return s ? R(a, s) : r;
}
function h(a, n) {
  return n.locationId ? `${a}${n.locationId}` : n.materialId ? `${a}-${n.materialId}` : Object.keys(n).sort().reduce((i, r) => `${i}-${r}-${n[r]}`, a);
}
function O(a, n) {
  return { ...a ?? {}, ...n ?? {} };
}
function F(a, n, i, r, s, e, t, u) {
  const o = {
    ...n,
    rowKey: r,
    parentRowKey: s.length > 0 ? s[s.length - 1] : void 0,
    ancestorKeys: s,
    level: e,
    treeDepth: e,
    rowOrder: -1,
    hasChildren: !1,
    keyFigure: i.keyFigure,
    groupLabel: "",
    isPrimaryKeyFigureRow: t,
    isDetailedRow: u,
    hierarchyVariant: u ? t ? "detail-total" : "detail-key-figure" : t ? "group-total" : "group-key-figure",
    uom: a.uom,
    editMode: i.editMode ?? "noEdit",
    materialId: typeof n.materialId == "string" ? n.materialId : void 0,
    locationId: typeof n.locationId == "string" ? n.locationId : void 0,
    toolTips: void 0,
    unavailableReasons: void 0,
    additionalClasses: void 0,
    updatedCells: void 0,
    lockedCells: void 0,
    aggregationNumerators: void 0,
    aggregationDenominators: void 0
  };
  return a.periodList.forEach((g) => {
    var m, b, y, p, v, D;
    const l = R(a, g), c = (m = i.values) == null ? void 0 : m[g];
    ((b = i.unavailableReasons) == null ? void 0 : b[g]) !== void 0 ? (o[l] = null, o.unavailableReasons ?? (o.unavailableReasons = {}), o.unavailableReasons[l] = i.unavailableReasons[g]) : o[l] = c ?? 0;
    const f = (y = i.aggregatedNumerator) == null ? void 0 : y[g];
    typeof f == "number" && (o.aggregationNumerators ?? (o.aggregationNumerators = {}), o.aggregationNumerators[l] = f);
    const d = (p = i.aggregatedDenominator) == null ? void 0 : p[g];
    typeof d == "number" && (o.aggregationDenominators ?? (o.aggregationDenominators = {}), o.aggregationDenominators[l] = d), ((v = i.toolTips) == null ? void 0 : v[g]) !== void 0 && (o.toolTips ?? (o.toolTips = {}), o.toolTips[l] = i.toolTips[g]), ((D = i.additionalClasses) == null ? void 0 : D[g]) !== void 0 && (o.additionalClasses ?? (o.additionalClasses = {}), o.additionalClasses[l] = i.additionalClasses[g]);
  }), o;
}
function C(a, n, i, r, s, e, t) {
  var y, p;
  const u = O(r, i.locationDescriptionCols), o = O(s, i.materialDescriptionCols), g = { ...u, ...o };
  let l = "";
  Object.keys(u).length > 0 && (l = h(l, u)), Object.keys(o).length > 0 && (l = h(l, o));
  const c = !!(u.locationId || o.materialId), f = i.keyFigures[0], d = `${l}-${f.keyFigure}`.replace(/^-/, ""), m = F(
    a,
    g,
    f,
    d,
    e,
    t,
    !0,
    c
  );
  n.push(m);
  const b = [...e, d];
  i.keyFigures.slice(1).forEach((v) => {
    n.push(F(
      a,
      g,
      v,
      `${l}-${v.keyFigure}`.replace(/^-/, ""),
      b,
      t,
      !1,
      c
    ));
  }), (y = i.subGroups) == null || y.forEach((v) => {
    C(a, n, v, u, o, b, t + 1);
  }), m.hasChildren = i.keyFigures.length > 1 || (((p = i.subGroups) == null ? void 0 : p.length) ?? 0) > 0;
}
function K(a) {
  const n = [], i = a.columnDefs.filter((e) => !e.dataColumn && e.field !== "keyFigure" && e.dimension).map((e) => e.field), r = a.columnDefs.filter((e) => !e.dataColumn && e.field !== "keyFigure" && e.dimension === "material").map((e) => e.field), s = a.columnDefs.filter((e) => !e.dataColumn && e.field !== "keyFigure" && e.dimension === "location").map((e) => e.field);
  return a.groups.forEach((e) => {
    C(a, n, e, {}, {}, [], 0);
  }), n.forEach((e, t) => {
    e.rowOrder = t;
  }), {
    rows: n,
    periodFields: a.periodList.map((e) => R(a, e)),
    periodLabels: Object.fromEntries(a.columnDefs.filter((e) => e.dataColumn).map((e) => [e.field, e.name])),
    descriptorFields: i,
    materialFields: r,
    locationFields: s,
    maxLevel: n.reduce((e, t) => Math.max(e, t.level), 0),
    firstKeyFigure: a.keyFigures[0] ?? null
  };
}
function k(a, n, i, r) {
  const s = /* @__PURE__ */ new Map();
  a.forEach((t) => {
    t.keyFigure === i && s.set(t.isPrimaryKeyFigureRow ? t.rowKey : t.parentRowKey ?? t.rowKey, t);
  });
  const e = /* @__PURE__ */ new Map();
  return n.forEach((t) => {
    if (t.keyFigure === i && e.set(t.rowKey, t), r && t.isPrimaryKeyFigureRow) {
      const u = s.get(t.rowKey);
      u && e.set(u.rowKey, u);
    }
  }), [...e.values()].filter((t, u, o) => {
    const g = t.isPrimaryKeyFigureRow ? t.rowKey : t.parentRowKey ?? t.rowKey;
    return !o.some((l) => l.rowKey !== t.rowKey && l.ancestorKeys.includes(g));
  }).sort((t, u) => t.rowOrder - u.rowOrder);
}
const E = 1e-9;
function A(a, n, i, r) {
  var t, u, o, g;
  if ((((t = a.aggregationModelByKeyFigure) == null ? void 0 : t[n]) ?? "PADRAO") === "RAZAO_ENTRE_SOMAS") {
    let l = 0, c = 0;
    for (const f of i) {
      const d = (u = f.aggregationNumerators) == null ? void 0 : u[r], m = (o = f.aggregationDenominators) == null ? void 0 : o[r];
      if (typeof d != "number" || !Number.isFinite(d) || typeof m != "number" || !Number.isFinite(m))
        return { value: null, unavailableReason: "Ratio unavailable because at least one contributing component is missing or invalid." };
      l += d, c += m;
    }
    return Math.abs(c) <= E ? { value: null, unavailableReason: "Ratio unavailable because the denominator total is zero." } : { value: l / c };
  }
  let e = 0;
  for (const l of i) {
    const c = (g = l.unavailableReasons) == null ? void 0 : g[r];
    if (c) return { value: null, unavailableReason: c };
    const f = typeof l[r] == "number" ? l[r] : Number(l[r] ?? 0);
    if (!Number.isFinite(f))
      return { value: null, unavailableReason: "Subtotal unavailable because at least one contributing value is invalid." };
    e += f;
  }
  return { value: e };
}
export {
  A as aggregatePlanningBookSubtotalField,
  R as getPlanningBookPeriodField,
  K as normalizePlanningBook,
  I as resolvePlanningBookPeriodFromField,
  k as selectPlanningBookSubtotalContributors,
  N as summarizePlanningBookPeriod
};
