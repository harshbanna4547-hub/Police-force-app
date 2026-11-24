// src/modules/01_strength/OfficePsStrength.jsx
import React, { useState, useMemo, useCallback } from "react";
import { OFFICE_SECTIONS, PS_CHOWKI_MAP, CO_PS_MAP } from "../../data/officeUnits";
import { resolveUnitAndChowki } from "../../core/postingResolver";
import ExportBar from "../../core/ExportBar";
import HindiText from "../../core/HindiText";
import { formatDateOnly, getBeltNo, getRankCode } from "../../shared/commonFunctions";
import EmployeeActionRow from "../../core/EmployeeActionRow";

const RANKS = ["ASP", "DYSP", "CI", "SI", "ASI", "HC", "FC", "FC(DR)"];
const fmtVac = (s, w) => (s - w < 0 ? `+${Math.abs(s - w)}` : s - w);
const getOfficeRankCode = (cader) => {
  const rank = getRankCode(cader);
  return rank === "OTHER" ? "FC" : rank;
};

function getMobileNo(emp) {
  const value = emp?.["MOBILE NO 1"] || emp?.["MOBILE NO"] || emp?.MOBILE || emp?.CONTACT || "";
  return ["_", "-"].includes(String(value).trim()) ? "-" : (value || "-");
}

export default function OfficePsStrength({
  records,
  devToHindi,
  onEditEmployee,
  onArchiveEmployee,
  unitRankSanc,
  setUnitRankSanc,
  onSaveUnitRankSanc
}) {
  const [editing, setEditing] = useState(false);
  const [secFilter, setSecFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [openSec, setOpenSec] = useState({ SEC_SPO: true, SEC_ASP: true, SEC_CO: true, SEC_PS: true, SEC_RPL: true });
  const [openUnit, setOpenUnit] = useState({});
  const [selectedSubTab, setSelectedSubTab] = useState({});
  const [modal, setModal] = useState(null);
  const [modalTab, setModalTab] = useState("ALL");

  const workingMap = useMemo(() => {
    const map = {};
    const makeEmpty = () => ({ total: 0, list: [], byRank: { ASP: [], DYSP: [], CI: [], SI: [], ASI: [], HC: [], FC: [], "FC(DR)": [] }, chowkis: {} });
    records.forEach((r) => {
      const { unit, chowki } = resolveUnitAndChowki(r["POSTING"], devToHindi);
      if (!unit) return;
      if (!map[unit]) map[unit] = makeEmpty();
      const rk = getOfficeRankCode(r["CADER"]);
      map[unit].total += 1;
      map[unit].list.push(r);
      map[unit].byRank[rk].push(r);
      if (chowki) {
        if (!map[unit].chowkis[chowki]) map[unit].chowkis[chowki] = makeEmpty();
        map[unit].chowkis[chowki].total += 1;
        map[unit].chowkis[chowki].list.push(r);
        map[unit].chowkis[chowki].byRank[rk].push(r);
      }
    });
    return map;
  }, [records, devToHindi]);
  const getSancForKey = useCallback((sancKey) => RANKS.reduce((s, r) => s + Number(unitRankSanc[sancKey]?.[r] || 0), 0), [unitRankSanc]);

  const getUnitTotalSanc = useCallback((u) => {
    const chowkis = PS_CHOWKI_MAP[u] || [];
    if (chowkis.length > 0) {
      const subSum = chowkis.reduce((acc, ck) => acc + getSancForKey(`${u}::${ck}`), 0);
      if (subSum > 0) return subSum;
    }
    return getSancForKey(u);
  }, [getSancForKey]);

  const openUnitModal = (title, unitName, defaultTab = "ALL", rankFilter = null) => {
    setModalTab(defaultTab);
    setModal({ title, unitName, rankFilter, defaultTab });
  };

  const modalUnitData = modal ? workingMap[modal.unitName] || { list: [], chowkis: {} } : null;
  const filterModalRank = (list) => modal?.rankFilter
    ? list.filter((employee) => getOfficeRankCode(employee["CADER"]) === modal.rankFilter)
    : list;
  const modalTabs = (() => {
    if (!modal || !modalUnitData) return [];
    if (PS_CHOWKI_MAP[modal.unitName]) {
      return [
        { id: "ALL", label: `कुल योग (थाना + चौकियाँ): ${filterModalRank(modalUnitData.list).length}`, list: filterModalRank(modalUnitData.list) },
        ...PS_CHOWKI_MAP[modal.unitName].map((chowki) => {
          const list = filterModalRank(modalUnitData.chowkis[chowki]?.list || []);
          return { id: chowki, label: `${chowki}: ${list.length}`, list };
        })
      ];
    }
    if (CO_PS_MAP[modal.unitName]) {
      const coPsList = CO_PS_MAP[modal.unitName];
      const officeList = filterModalRank(modalUnitData.list);
      const allCoEmployees = [
        ...officeList,
        ...coPsList.flatMap((station) => filterModalRank(workingMap[station]?.list || []))
      ];
      return [
        { id: "ALL", label: `कुल योग (CO + थाने): ${allCoEmployees.length}`, list: allCoEmployees },
        { id: "CO_ONLY", label: `केवल CO कार्यालय: ${officeList.length}`, list: officeList },
        ...coPsList.map((station) => {
          const list = filterModalRank(workingMap[station]?.list || []);
          return { id: station, label: `${station}: ${list.length}`, list };
        })
      ];
    }
    return [];
  })();
  const activeModalTab = modalTabs.find((tab) => tab.id === modalTab);
  const displayList = activeModalTab?.list || filterModalRank(modalUnitData?.list || []);

  const exportRows = useMemo(() => {
    const rows = [];
    let sn = 1;
    OFFICE_SECTIONS.forEach((sec) => {
      if (secFilter !== "ALL" && secFilter !== sec.id && !(secFilter === "CO_CIRCLE" && sec.id === "SEC_CO")) return;
      sec.units.forEach((u) => {
        if (search.trim() && !u.toLowerCase().includes(search.trim().toLowerCase())) return;
        const s = getUnitTotalSanc(u), w = workingMap[u]?.total || 0;
        rows.push({ "क्र.सं.": sn++, "इकाई का नाम": u, "स्वीकृत": s, "कार्यरत": w, "रिक्त / अधिक": fmtVac(s, w) });
      });
    });
    return rows;
  }, [secFilter, search, workingMap, getUnitTotalSanc]);

  const saveUnitSanc = async () => {
    try {
      await onSaveUnitRankSanc(unitRankSanc);
      setEditing(false);
      alert("इकाई-वार स्वीकृत नफरी IndexedDB में सुरक्षित हो गई है!");
    } catch (error) {
      console.error("Office/PS sanctioned strength could not be saved:", error);
      alert(`इकाई-वार नफरी सेव नहीं हो सकी: ${error.message}`);
    }
  };

  let sn = 1;
  return (
    <div className="office-ps-strength">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[["ALL", "All"], ["SEC_SPO", "SP Office"], ["SEC_ASP", "ASP Offices"], ["SEC_CO", "CO Offices"], ["CO_CIRCLE", "CO Circle-Wise"], ["SEC_PS", "Police Stations"], ["SEC_RPL", "Police Line"]].map(([id, lbl]) => (
            <button key={id} onClick={() => setSecFilter(id)} style={{ padding: "5px 12px", borderRadius: "18px", border: "1px solid #CBD5E1", cursor: "pointer", fontWeight: "bold", backgroundColor: secFilter === id ? "#1D63DC" : "#fff", color: secFilter === id ? "#fff" : "#1E293B" }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ExportBar title="कार्यालय एवं थाना-वार नफरी" rows={exportRows} fileName="Office_CO_PS_Strength" />
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✏️ स्वीकृत भरें</button>
          ) : (
            <button onClick={saveUnitSanc} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ Save</button>
          )}
        </div>
      </div>

      <input type="text" placeholder="🔍 कार्यालय या थाना खोजें..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "7px 10px", borderRadius: "6px", border: "1px solid #94A3B8", marginBottom: "10px" }} />

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px", border: "1px solid #CBD5E1", width: "55px" }}>क्र.सं.</th>
            <th style={{ padding: "8px", textAlign: "left", border: "1px solid #CBD5E1" }}>कार्यालय / शाखा / CO / थाना का नाम</th>
            <th style={{ padding: "8px", border: "1px solid #CBD5E1", width: "110px" }}>स्वीकृत</th>
            <th style={{ padding: "8px", border: "1px solid #CBD5E1", width: "110px" }}>कार्यरत</th>
            <th style={{ padding: "8px", border: "1px solid #CBD5E1", width: "110px" }}>रिक्त / अधिक</th>
          </tr>
        </thead>
        <tbody>
          {OFFICE_SECTIONS.filter((sec) => secFilter === "ALL" || secFilter === sec.id || (secFilter === "CO_CIRCLE" && sec.id === "SEC_CO")).map((sec) => {
            const units = sec.units.filter((u) => !search.trim() || u.toLowerCase().includes(search.trim().toLowerCase()));
            if (!units.length) return null;
            const isSecOpen = !!openSec[sec.id] || editing || !!search.trim();
            const sSum = units.reduce((a, u) => a + getUnitTotalSanc(u), 0);
            const wSum = units.reduce((a, u) => a + (workingMap[u]?.total || 0), 0);

            return (
              <React.Fragment key={sec.id}>
                <tr onClick={() => setOpenSec((p) => ({ ...p, [sec.id]: !p[sec.id] }))} style={{ backgroundColor: "#D8E4F0", fontWeight: "bold", cursor: "pointer" }}>
                  <td style={{ padding: "7px", textAlign: "center", border: "1px solid #CBD5E1" }}>•</td>
                  <td style={{ padding: "7px 10px", border: "1px solid #CBD5E1" }}>{sec.title}</td>
                  <td style={{ padding: "7px", textAlign: "center", border: "1px solid #CBD5E1" }}>{sSum}</td>
                  <td style={{ padding: "7px", textAlign: "center", border: "1px solid #CBD5E1", color: "#15803D" }}>{wSum}</td>
                  <td style={{ padding: "7px", textAlign: "center", border: "1px solid #CBD5E1" }}>{fmtVac(sSum, wSum)}</td>
                </tr>

                {isSecOpen && units.map((u) => {
                  const totalSanc = getUnitTotalSanc(u);
                  const wObj = workingMap[u] || { total: 0, list: [], byRank: {}, chowkis: {} };
                  const totalVac = fmtVac(totalSanc, wObj.total);
                  const isOpen = !!openUnit[u] || editing;
                  const chowkis = PS_CHOWKI_MAP[u] || [];

                  const activeSub = selectedSubTab[u] || "TOTAL";
                  const activeData = activeSub === "TOTAL" ? wObj : (wObj.chowkis[activeSub] || { total: 0, list: [], byRank: {} });
                  const activeSancKey = activeSub === "TOTAL" ? u : `${u}::${activeSub}`;
                  const activeSanc = activeSub === "TOTAL" ? totalSanc : getSancForKey(activeSancKey);
                  const activeVac = fmtVac(activeSanc, activeData.total);

                  return (
                    <React.Fragment key={u}>
                      <tr>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #E2E8F0" }}>{sn++}</td>
                        <td onClick={() => setOpenUnit((p) => ({ ...p, [u]: !p[u] }))} style={{ padding: "6px 14px", border: "1px solid #E2E8F0", fontWeight: "bold", cursor: "pointer" }}>
                          {u}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #E2E8F0" }}>{totalSanc}</td>
                        <td onClick={() => wObj.total > 0 && openUnitModal(u, u, "ALL")} style={{ padding: "6px", textAlign: "center", border: "1px solid #E2E8F0", color: "#15803D", fontWeight: "bold", cursor: wObj.total > 0 ? "pointer" : "default", textDecoration: "none" }}>{wObj.total}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #E2E8F0", color: String(totalVac).startsWith("+") || totalVac === 0 ? "#15803D" : "#DC2626", fontWeight: "bold" }}>{totalVac}</td>
                      </tr>

                      {isOpen && (
                        <tr style={{ backgroundColor: "#F8FAFC" }}>
                          <td style={{ border: "1px solid #CBD5E1" }}></td>
                          <td colSpan="4" style={{ padding: "10px", border: "1px solid #CBD5E1" }}>
                            {chowkis.length > 0 && (
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <button
                                  onClick={() => setSelectedSubTab((p) => ({ ...p, [u]: "TOTAL" }))}
                                  style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #1D63DC", cursor: "pointer", fontWeight: "bold", fontSize: "0.78rem", backgroundColor: activeSub === "TOTAL" ? "#1D63DC" : "#EFF6FF", color: activeSub === "TOTAL" ? "#FFFFFF" : "#1E3A8A" }}
                                >
                                  कुल योग (थाना + चौकियाँ): {wObj.total}
                                </button>
                                {chowkis.map((ck) => {
                                  const cd = wObj.chowkis[ck] || { total: 0 };
                                  const isCkActive = activeSub === ck;
                                  return (
                                    <button
                                      key={ck}
                                      onClick={() => setSelectedSubTab((p) => ({ ...p, [u]: ck }))}
                                      style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #93C5FD", cursor: "pointer", fontWeight: "bold", fontSize: "0.78rem", backgroundColor: isCkActive ? "#0B1E3D" : "#FFFFFF", color: isCkActive ? "#FFD700" : "#1E293B" }}
                                    >
                                      {ck}: {cd.total}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#0B1E3D", marginBottom: "5px" }}>
                              📊 {activeSub === "TOTAL" ? `${u} — कुल योग (थाना + चौकियाँ)` : `${u} ➔ ${activeSub}`}
                            </div>

                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", backgroundColor: "#fff" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#1E293B", color: "#fff" }}>
                                  <th style={{ padding: "5px", border: "1px solid #CBD5E1" }}>विवरण</th>
                                  {RANKS.map((rk) => <th key={rk} style={{ padding: "5px", border: "1px solid #CBD5E1" }}>{rk}</th>)}
                                  <th style={{ padding: "5px", border: "1px solid #CBD5E1" }}>योग</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={{ padding: "5px", fontWeight: "bold", border: "1px solid #CBD5E1" }}>स्वीकृत</td>
                                  {RANKS.map((rk) => {
                                    const val = chowkis.length > 0 && activeSub === "TOTAL"
                                      ? (chowkis.reduce((a, ck) => a + Number(unitRankSanc[`${u}::${ck}`]?.[rk] || 0), 0) || Number(unitRankSanc[u]?.[rk] || 0))
                                      : Number(unitRankSanc[activeSancKey]?.[rk] || 0);
                                    return (
                                      <td key={rk} style={{ padding: "4px", textAlign: "center", border: "1px solid #CBD5E1" }}>
                                        {editing && !(chowkis.length > 0 && activeSub === "TOTAL") ? (
                                          <input
                                            type="number"
                                            min="0"
                                            value={unitRankSanc[activeSancKey]?.[rk] || 0}
                                            onChange={(e) => setUnitRankSanc((p) => ({ ...p, [activeSancKey]: { ...(p[activeSancKey] || {}), [rk]: Number(e.target.value) } }))}
                                            style={{ width: "42px", textAlign: "center" }}
                                          />
                                        ) : val}
                                      </td>
                                    );
                                  })}
                                  <td style={{ padding: "5px", textAlign: "center", fontWeight: "bold", border: "1px solid #CBD5E1" }}>{activeSanc}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "5px", fontWeight: "bold", border: "1px solid #CBD5E1", color: "#15803D" }}>कार्यरत</td>
                                  {RANKS.map((rk) => {
                                    const list = activeData.byRank?.[rk] || [];
                                    return (
                                      <td
                                        key={rk}
                                        onClick={() => list.length > 0 && openUnitModal(`${activeSub === "TOTAL" ? u : activeSub} (${rk})`, u, activeSub === "TOTAL" ? "ALL" : activeSub, rk)}
                                        style={{ padding: "5px", textAlign: "center", border: "1px solid #CBD5E1", color: "#15803D", fontWeight: "bold", cursor: list.length > 0 ? "pointer" : "default", textDecoration: "none" }}
                                      >
                                        {list.length}
                                      </td>
                                    );
                                  })}
                                  <td
                                    onClick={() => activeData.total > 0 && openUnitModal(u, u, activeSub === "TOTAL" ? "ALL" : activeSub)}
                                    style={{ padding: "5px", textAlign: "center", fontWeight: "bold", border: "1px solid #CBD5E1", color: "#15803D", cursor: activeData.total > 0 ? "pointer" : "default", textDecoration: "none" }}
                                  >
                                    {activeData.total}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "5px", fontWeight: "bold", border: "1px solid #CBD5E1" }}>रिक्त/अधिक</td>
                                  {RANKS.map((rk) => {
                                    const sVal = chowkis.length > 0 && activeSub === "TOTAL"
                                      ? (chowkis.reduce((a, ck) => a + Number(unitRankSanc[`${u}::${ck}`]?.[rk] || 0), 0) || Number(unitRankSanc[u]?.[rk] || 0))
                                      : Number(unitRankSanc[activeSancKey]?.[rk] || 0);
                                    const v = fmtVac(sVal, activeData.byRank?.[rk]?.length || 0);
                                    return <td key={rk} style={{ padding: "5px", textAlign: "center", fontWeight: "bold", border: "1px solid #CBD5E1", color: String(v).startsWith("+") || v === 0 ? "#15803D" : "#DC2626" }}>{v}</td>;
                                  })}
                                  <td style={{ padding: "5px", textAlign: "center", fontWeight: "bold", border: "1px solid #CBD5E1" }}>{activeVac}</td>
                                </tr>
                              </tbody>
                            </table>

                            {CO_PS_MAP[u] && (
                              <div style={{ marginTop: "10px" }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#0B1E3D", marginBottom: "6px" }}>
                                  🏛️ इस वृत्त (CO) के अधीन आने वाले पुलिस थाने:
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {CO_PS_MAP[u].map((psName) => {
                                    const psData = workingMap[psName] || { total: 0, list: [] };
                                    return (
                                      <button
                                        key={psName}
                                        onClick={() => openUnitModal(`${psName} (${u})`, psName, "ALL")}
                                        style={{ padding: "5px 12px", borderRadius: "20px", border: "1px solid #93C5FD", backgroundColor: "#EFF6FF", color: "#1E3A8A", fontWeight: "bold", fontSize: "0.78rem", cursor: "pointer" }}
                                      >
                                        🚔 {psName}: <span style={{ color: "#15803D" }}>{psData.total}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {modal && (
          <div className="strength-working-modal" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", width: "100%", maxWidth: "850px", maxHeight: "82vh", overflowY: "auto", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <b style={{ fontSize: "1rem", color: "#0B1E3D" }}>🏢 {modal.title} ({displayList.length})</b>
                <button onClick={() => setModal(null)} style={{ backgroundColor: "#DC2626", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  ✕ बंद करें
                </button>
              </div>

              {modalTabs.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px", padding: "8px", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                  {modalTabs.map((tb) => {
                    const active = modalTab === tb.id;
                    return (
                      <button
                        key={tb.id}
                        onClick={() => setModalTab(tb.id)}
                        style={{ padding: "5px 11px", borderRadius: "6px", border: active ? "1px solid #1D63DC" : "1px solid #CBD5E1", cursor: "pointer", fontWeight: "bold", fontSize: "0.78rem", backgroundColor: active ? "#1D63DC" : "#FFFFFF", color: active ? "#FFFFFF" : "#1E293B" }}
                      >
                        {tb.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
                    <th style={{ padding: "6px" }}>क्र.</th>
                    <th style={{ padding: "6px" }}>पिता का नाम</th>
                    <th style={{ padding: "6px" }}>पद</th>
                    <th style={{ padding: "6px" }}>बेल्ट नं.</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>नाम</th>
                    <th style={{ padding: "6px" }}>Posting DOB</th>
                    <th style={{ padding: "6px" }}>Posting Place</th>
                    <th style={{ padding: "6px" }}>Without DOB</th>
                    <th style={{ padding: "6px" }}>Education</th>
                    <th style={{ padding: "6px" }}>Date of Birth</th>
                    <th style={{ padding: "6px" }}>DOJ</th>
                    <th style={{ padding: "6px" }}>DOC</th>
                    <th style={{ padding: "6px" }}>मोबाइल</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((e, i) => (
                    <EmployeeActionRow key={e._uid || i} employee={e} onAction={(action, employee) => {
                      if (action === "UPDATE" || action === "TRANSFER") onEditEmployee?.(employee);
                      if (action === "RELIEVE") {
                        const reason = window.prompt("Relieve / Retire / Death / Deputation का कारण लिखें:");
                        if (reason) onArchiveEmployee?.(employee, reason);
                      }
                      if (action === "SERVICE_SLIP") window.alert(`${employee.NAME || ""}\n${employee.CADER || ""}\n${employee.POSTING || ""}`);
                    }} style={{ borderBottom: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "5px", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ padding: "5px" }}><HindiText text={e["FATHER NAME"]} /></td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{e["CADER"]}</td>
                      <td style={{ padding: "5px", textAlign: "center", fontWeight: "bold", color: "#0369A1" }}>{getBeltNo(e)}</td>
                      <td style={{ padding: "5px", fontWeight: "bold" }}><HindiText text={e["NAME"]} /></td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{formatDateOnly(e["POSTING DOB NO"])}</td>
                      <td style={{ padding: "5px" }}>{e.POSTING || "-"}</td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{e["WITHOUT DOB"] || "-"}</td>
                      <td style={{ padding: "5px" }}>{e.EDUCATION || "-"}</td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{formatDateOnly(e["DATE OF BIRTH"])}</td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{formatDateOnly(e["DATE OF JOINING"])}</td>
                      <td style={{ padding: "5px", textAlign: "center" }}>{formatDateOnly(e.DOC || e["DATE OF CONFIRMATION"])}</td>
                      <td style={{ padding: "5px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{getMobileNo(e)}</td>
                    </EmployeeActionRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      )}
    </div>
  );
}
