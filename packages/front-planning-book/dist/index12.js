function i(o) {
  if (!o) return "planning-book.xlsx";
  const n = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(o);
  return n != null && n[1] ? decodeURIComponent(n[1].replace(/"/g, "")) : "planning-book.xlsx";
}
function d(o, n) {
  const a = window.URL.createObjectURL(o), e = document.createElement("a");
  e.href = a, e.download = n, document.body.appendChild(e), e.click(), document.body.removeChild(e), window.URL.revokeObjectURL(a);
}
function r(o) {
  return {
    fetchDemandPlans() {
      return o.requestJson("/api/secured/planning/demand/demandplan");
    },
    fetchDemandPlanningViews() {
      return o.requestJson("/api/secured/configuration/user/view/demandplanningbook");
    },
    fetchDemandPlanningBook(n) {
      return o.requestJson("/api/secured/planning/demand/planningbook", {
        method: "POST",
        body: JSON.stringify(n)
      });
    },
    updateDemandPlanningBook(n) {
      return o.requestJson("/api/secured/planning/demand/planningbook/update", {
        method: "POST",
        body: JSON.stringify(n)
      });
    },
    async exportDemandPlanningBook(n, a) {
      const e = await o.httpRequest("/api/secured/planning/demand/planningbook/xlsx", {
        method: "POST",
        query: { layout: a },
        // The export endpoint declares an XLSX representation; JSON is only the request body format.
        headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        body: JSON.stringify(n)
      });
      if (!e.ok)
        throw new Error(`Export failed with status ${e.status}`);
      const t = await e.blob();
      d(t, i(e.headers.get("content-disposition")));
    },
    importDemandPlanningBook(n, a) {
      const e = new FormData();
      return e.append("selection", new Blob([JSON.stringify(n)], { type: "application/json" })), e.append("file", a), o.requestJson("/api/secured/planning/demand/planningbook/xlsx/import", {
        method: "POST",
        body: e
      });
    }
  };
}
export {
  r as createDemandPlanningBookService
};
