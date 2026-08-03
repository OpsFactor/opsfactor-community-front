function p(e) {
  const n = [];
  function s(o, a, l, f, u) {
    const i = {
      ...f,
      ...o.locationDescriptionCols
    }, c = {
      ...u,
      ...o.materialDescriptionCols
    }, r = [...l, o];
    for (const t of o.keyFigures ?? [])
      n.push({
        keyFigure: t,
        group: o,
        parentGroup: a,
        groupPath: r,
        locationDescriptionCols: i,
        materialDescriptionCols: c
      });
    for (const t of o.subGroups ?? [])
      s(t, o, r, i, c);
  }
  for (const o of e)
    s(o, void 0, [], {}, {});
  return n;
}
export {
  p as flattenPlanningBookGroups
};
