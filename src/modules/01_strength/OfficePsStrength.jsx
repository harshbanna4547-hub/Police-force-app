import React, { useState, useMemo, useCallback, useEffect } from "react";
import { OFFICE_SECTIONS, PS_CHOWKI_MAP, CO_PS_MAP } from "../../data/officeUnits";
import { resolveUnitAndChowki } from "../../core/postingResolver";
import { matchEmployeeToUnit } from "../../forceLogic";
import { getRankCode } from "../../shared/commonFunctions";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import SmartEmployeeTable from "../../components/shared/SmartEmployeeTable";
import { translateSectionTitle, translateUnitName } from "../../utils/i18n";

const RANKS = ["ASP", "DYSP", "CI", "SI", "ASI", "HC", "FC", "FC(DR)"];
const OFFICIAL_UNITS = OFFICE_SECTIONS.flatMap((sec) => sec.units);
const fmtVac = (s, w) => (s - w < 0 ? `+${Math.abs(s - w)}` : s - w);
const getOfficeRankCode = (cader) => {
  const rank = getRankCode(cader);
  return rank === "OTHER" ? "FC" : rank;
};

/**
 * [COMPONENT] OfficePsStrength — कार्यालय, शाखा, वृत्त (CO) और थाना/चौकी-वार नफरी तालिका
 */
export default function OfficePsStrength({
  records = [],
  search = "",
  onEditEmployee,
  onArchiveEmployee,
  unitRankSanc = {},
  setUnitRankSanc,
  onSaveUnitRankSanc,
  onExportRowsChange,
  language = "hi"
}) {
  const [editing, setEditing] = useState(false);
  const [secFilter, setSecFilter] = useState("ALL");
  const [openSec, setOpenSec] = useState({ SEC_SPO: true, SEC_ASP: true, SEC_CO: true, SEC_PS: true, SEC_RPL: true });
  const [openUnit, setOpenUnit] = useState({});
  const [selectedSubTab, setSelectedSubTab] = useState({});
  const [modal, setModal] = useState(null);
  const [modalTab, setModalTab] = useState("ALL");
  const english = language === "en";

  // [MAPPING] Map active employees to official units & chowkis via dual DevLys/Unicode matching
  const workingMap = useMemo(() => {
    const map = {};
    const makeEmpty = () => ({ total: 0, list: [], byRank: { ASP: [], DYSP: [], CI: [], SI: [], ASI: [], HC: [], FC: [], "FC(DR)": [] }, chowkis: {} });
    records.forEach((r) => {
      const rawPosting = String(r["POSTING"] || "").trim();
      if (!rawPosting) return;
      const resolved = resolveUnitAndChowki(rawPosting);
      const matchedOfficial = OFFICIAL_UNITS.find((known) => matchEmployeeToUnit(resolved.unit || rawPosting, known)) || resolved.unit;
      if (!matchedOfficial) return;
      if (!map[matchedOfficial]) map[matchedOfficial] = makeEmpty();
      const rk = getOfficeRankCode(r["CADER"]);
      map[matchedOfficial].total += 1;
      map[matchedOfficial].list.push(r);
      map[matchedOfficial].byRank[rk].push(r);
      if (resolved.chowki) {
        if (!map[matchedOfficial].chowkis[resolved.chowki]) map[matchedOfficial].chowkis[resolved.chowki] = makeEmpty();
        map[matchedOfficial].chowkis[resolved.chowki].total += 1;
        map[matchedOfficial].chowkis[resolved.chowki].list.push(r);
        map[matchedOfficial].chowkis[resolved.chowki].byRank[rk].push(r);
      }
    });
    return map;
  }, [records]);

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
        {
          id: "ALL",
          label: `${english ? "Total (PS + Chowkis)" : "कुल योग (थाना + चौकियाँ)"}: ${filterModalRank(modalUnitData.list).length}`,
          list: filterModalRank(modalUnitData.list)
        },
        ...PS_CHOWKI_MAP[modal.unitName].map((chowki) => {
          const list = filterModalRank(modalUnitData.chowkis[chowki]?.list || []);
          return { id: chowki, label: `${translateUnitName(chowki, language)}: ${list.length}`, list };
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
        {
          id: "ALL",
          label: `${english ? "Total (CO + PS)" : "कुल योग (CO + थाने)"}: ${allCoEmployees.length}`,
          list: allCoEmployees
        },
        {
          id: "CO_ONLY",
          label: `${english ? "CO Office Only" : "केवल CO कार्यालय"}: ${officeList.length}`,
          list: officeList
        },
        ...coPsList.map((station) => {
          const list = filterModalRank(workingMap[station]?.list || []);
          return { id: station, label: `${translateUnitName(station, language)}: ${list.length}`, list };
        })
      ];
    }
    return [];
  })();

  const activeModalTab = modalTabs.find((tab) => tab.id === modalTab);
  const displayList = activeModalTab?.list || filterModalRank(modalUnitData?.list || []);

  const visibleSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return OFFICE_SECTIONS.filter(
      (sec) => secFilter === "ALL" || secFilter === sec.id || (secFilter === "CO_CIRCLE" && sec.id === "SEC_CO")
    ).map((sec) => ({
      ...sec,
      units: sec.units.filter((u) => {
        if (!q) return true;
        return u.toLowerCase().includes(q) || translateUnitName(u, "en").toLowerCase().includes(q) || matchEmployeeToUnit(q, u);
      })
    })).filter((sec) => sec.units.length > 0);
  }, [secFilter, search]);

  const grandTotals = useMemo(() => {
    let sSum = 0;
    let wSum = 0;
    visibleSections.forEach((sec) => {
      sec.units.forEach((u) => {
        sSum += getUnitTotalSanc(u);
        wSum += workingMap[u]?.total || 0;
      });
    });
    return { sanctioned: sSum, working: wSum, vacancy: fmtVac(sSum, wSum) };
  }, [visibleSections, getUnitTotalSanc, workingMap]);

  const exportRows = useMemo(() => {
    const rows = [];
    let snCount = 1;
    visibleSections.forEach((sec) => {
      sec.units.forEach((u) => {
        const s = getUnitTotalSanc(u);
        const w = workingMap[u]?.total || 0;
        rows.push({
          "क्र.सं.": snCount++,
          "इकाई का नाम": translateUnitName(u, language),
          "स्वीकृत": s,
          "कार्यरत": w,
          "रिक्त / अधिक": fmtVac(s, w)
        });
      });
    });
    rows.push({
      "क्र.सं.": "",
      "इकाई का नाम": english ? "GRAND TOTAL" : "महायोग (GRAND TOTAL)",
      "स्वीकृत": grandTotals.sanctioned,
      "कार्यरत": grandTotals.working,
      "रिक्त / अधिक": grandTotals.vacancy
    });
    return rows;
  }, [visibleSections, workingMap, getUnitTotalSanc, grandTotals, language, english]);

  useEffect(() => {
    onExportRowsChange?.(exportRows);
  }, [exportRows, onExportRowsChange]);

  const saveUnitSanc = async () => {
    try {
      await onSaveUnitRankSanc(unitRankSanc);
      setEditing(false);
      alert(english
        ? "Unit-wise sanctioned strength saved to IndexedDB."
        : "इकाई-वार स्वीकृत नफरी IndexedDB में सुरक्षित हो गई है!");
    } catch (error) {
      console.error("Office/PS sanctioned strength could not be saved:", error);
      alert(`इकाई-वार नफरी सेव नहीं हो सकी: ${error.message}`);
    }
  };

  const handleEmployeeAction = (action, employee) => {
    if (action === "UPDATE") onEditEmployee?.(employee, "personal");
    if (action === "TRANSFER") onEditEmployee?.(employee, "posting");
    if (action === "RELIEVE") {
      const reason = window.prompt(english
        ? "Enter reason for Relieve / Retire / Death / Deputation:"
        : "Relieve / Retire / Death / Deputation का कारण लिखें:");
      if (reason) onArchiveEmployee?.(employee, reason);
    }
    if (action === "SERVICE_SLIP") openEmployeeServiceSlip(employee);
  };

  let sn = 1;
  return (
    <div className="office-ps-strength">
      <div className="office-ps-topbar">
        <div className="office-ps-filter-pills">
          {[
            ["ALL", english ? "All" : "सभी"],
            ["SEC_SPO", english ? "SP Office" : "SP कार्यालय"],
            ["SEC_ASP", english ? "ASP Offices" : "ASP कार्यालय"],
            ["SEC_CO", english ? "CO Offices" : "CO कार्यालय"],
            ["CO_CIRCLE", english ? "CO Circle-Wise" : "वृत्त-वार"],
            ["SEC_PS", english ? "Police Stations" : "पुलिस थाने"],
            ["SEC_RPL", english ? "Police Line" : "पुलिस लाइन"]
          ].map(([id, lbl]) => (
            <button
              type="button"
              key={id}
              onClick={() => setSecFilter(id)}
              className={`office-ps-filter-pill ${secFilter === id ? "is-active" : ""}`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} className="module-btn-primary">
              ✏️ {english ? "Edit Sanctioned" : "स्वीकृत भरें"}
            </button>
          ) : (
            <button type="button" onClick={saveUnitSanc} className="module-btn-success">
              ✅ {english ? "Save" : "सेव करें"}
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive-box">
        <table className="office-ps-table">
          <thead>
            <tr>
              <th className="office-ps-col-sn">{english ? "S.N." : "क्र.सं."}</th>
              <th>{english ? "Office / Branch / CO / Police Station" : "कार्यालय / शाखा / CO / थाना का नाम"}</th>
              <th className="office-ps-col-num">{english ? "Sanctioned" : "स्वीकृत"}</th>
              <th className="office-ps-col-num">{english ? "Working" : "कार्यरत"}</th>
              <th className="office-ps-col-num">{english ? "Vacant / Surplus" : "रिक्त / अधिक"}</th>
            </tr>
          </thead>
          <tbody>
            {visibleSections.map((sec) => {
              const isSecOpen = !!openSec[sec.id] || editing || !!search.trim();
              const sSum = sec.units.reduce((a, u) => a + getUnitTotalSanc(u), 0);
              const wSum = sec.units.reduce((a, u) => a + (workingMap[u]?.total || 0), 0);

              return (
                <React.Fragment key={sec.id}>
                  <tr onClick={() => setOpenSec((p) => ({ ...p, [sec.id]: !p[sec.id] }))} className="office-ps-sec-row">
                    <td className="module-cell-center">•</td>
                    <td>{translateSectionTitle(sec.id, sec.title, language)}</td>
                    <td className="module-cell-center english-cell">{sSum}</td>
                    <td className="module-cell-center english-cell module-cell-accent-green">{wSum}</td>
                    <td className="module-cell-center english-cell">{fmtVac(sSum, wSum)}</td>
                  </tr>

                  {isSecOpen && sec.units.map((u) => {
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
                          <td className="module-cell-center english-cell">{sn++}</td>
                          <td onClick={() => setOpenUnit((p) => ({ ...p, [u]: !p[u] }))} className="office-ps-unit-name">
                            {translateUnitName(u, language)}
                          </td>
                          <td className="module-cell-center english-cell">{totalSanc}</td>
                          <td
                            onClick={() => wObj.total > 0 && openUnitModal(translateUnitName(u, language), u, "ALL")}
                            className={`module-cell-center english-cell ${wObj.total > 0 ? "strength-working-cell" : "module-cell-accent-green"}`}
                          >
                            {wObj.total}
                          </td>
                          <td className={`module-cell-center english-cell ${String(totalVac).startsWith("+") || totalVac === 0 ? "strength-vac-ok" : "strength-vac-deficit"}`}>
                            {totalVac}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr>
                            <td></td>
                            <td colSpan="4" className="office-ps-unit-detail-cell">
                              {chowkis.length > 0 && (
                                <div className="office-chowki-tabs">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubTab((p) => ({ ...p, [u]: "TOTAL" }))}
                                    className={`office-chowki-total-btn ${activeSub === "TOTAL" ? "is-active" : ""}`}
                                  >
                                    {english ? "Total (PS + Chowkis)" : "कुल योग (थाना + चौकियाँ)"}: {wObj.total}
                                  </button>
                                  {chowkis.map((ck) => {
                                    const cd = wObj.chowkis[ck] || { total: 0 };
                                    return (
                                      <button
                                        type="button"
                                        key={ck}
                                        onClick={() => setSelectedSubTab((p) => ({ ...p, [u]: ck }))}
                                        className={`office-chowki-btn ${activeSub === ck ? "is-active" : ""}`}
                                      >
                                        {translateUnitName(ck, language)}: {cd.total}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="office-subtable-caption">
                                📊 {activeSub === "TOTAL" ? `${translateUnitName(u, language)} — ${english ? "Total" : "कुल योग"}` : `${translateUnitName(u, language)} ➔ ${translateUnitName(activeSub, language)}`}
                              </div>

                              <div className="table-responsive-box">
                                <table className="office-rank-table">
                                  <thead>
                                    <tr>
                                      <th>{english ? "Particulars" : "विवरण"}</th>
                                      {RANKS.map((rk) => <th key={rk}>{rk}</th>)}
                                      <th>{english ? "Total" : "योग"}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>{english ? "Sanctioned" : "स्वीकृत"}</td>
                                      {RANKS.map((rk) => {
                                        const val = chowkis.length > 0 && activeSub === "TOTAL"
                                          ? (chowkis.reduce((a, ck) => a + Number(unitRankSanc[`${u}::${ck}`]?.[rk] || 0), 0) || Number(unitRankSanc[u]?.[rk] || 0))
                                          : Number(unitRankSanc[activeSancKey]?.[rk] || 0);
                                        return (
                                          <td key={rk} className="english-cell">
                                            {editing && !(chowkis.length > 0 && activeSub === "TOTAL") ? (
                                              <input
                                                type="number"
                                                min="0"
                                                value={unitRankSanc[activeSancKey]?.[rk] || 0}
                                                onChange={(e) => setUnitRankSanc((p) => ({ ...p, [activeSancKey]: { ...(p[activeSancKey] || {}), [rk]: Number(e.target.value) } }))}
                                                className="office-rank-input"
                                              />
                                            ) : val}
                                          </td>
                                        );
                                      })}
                                      <td className="english-cell module-cell-bold">{activeSanc}</td>
                                    </tr>
                                    <tr>
                                      <td className="module-cell-accent-green">{english ? "Working" : "कार्यरत"}</td>
                                      {RANKS.map((rk) => {
                                        const list = activeData.byRank?.[rk] || [];
                                        return (
                                          <td
                                            key={rk}
                                            onClick={() => list.length > 0 && openUnitModal(`${translateUnitName(activeSub === "TOTAL" ? u : activeSub, language)} (${rk})`, u, activeSub === "TOTAL" ? "ALL" : activeSub, rk)}
                                            className={`english-cell ${list.length > 0 ? "strength-working-cell" : "module-cell-accent-green"}`}
                                          >
                                            {list.length}
                                          </td>
                                        );
                                      })}
                                      <td
                                        onClick={() => activeData.total > 0 && openUnitModal(translateUnitName(u, language), u, activeSub === "TOTAL" ? "ALL" : activeSub)}
                                        className={`english-cell ${activeData.total > 0 ? "strength-working-cell" : "module-cell-accent-green"}`}
                                      >
                                        {activeData.total}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>{english ? "Vacant / Surplus" : "रिक्त/अधिक"}</td>
                                      {RANKS.map((rk) => {
                                        const sVal = chowkis.length > 0 && activeSub === "TOTAL"
                                          ? (chowkis.reduce((a, ck) => a + Number(unitRankSanc[`${u}::${ck}`]?.[rk] || 0), 0) || Number(unitRankSanc[u]?.[rk] || 0))
                                          : Number(unitRankSanc[activeSancKey]?.[rk] || 0);
                                        const v = fmtVac(sVal, activeData.byRank?.[rk]?.length || 0);
                                        return (
                                          <td key={rk} className={`english-cell ${String(v).startsWith("+") || v === 0 ? "strength-vac-ok" : "strength-vac-deficit"}`}>
                                            {v}
                                          </td>
                                        );
                                      })}
                                      <td className="english-cell module-cell-bold">{activeVac}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {CO_PS_MAP[u] && (
                                <div className="office-co-ps-wrap">
                                  <div className="office-co-ps-title">
                                    🏛️ {english ? "Police Stations under this CO Circle:" : "इस वृत्त (CO) के अधीन आने वाले पुलिस थाने:"}
                                  </div>
                                  <div className="office-co-ps-list">
                                    {CO_PS_MAP[u].map((psName) => {
                                      const psData = workingMap[psName] || { total: 0, list: [] };
                                      return (
                                        <button
                                          type="button"
                                          key={psName}
                                          onClick={() => openUnitModal(`${translateUnitName(psName, language)} (${translateUnitName(u, language)})`, psName, "ALL")}
                                          className="office-co-ps-chip"
                                        >
                                          🚔 {translateUnitName(psName, language)}: <span className="module-cell-accent-green">{psData.total}</span>
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
            <tr className="strength-grand-total-row">
              <td className="module-cell-center">Σ</td>
              <td>{english ? "GRAND TOTAL" : "महायोग (GRAND TOTAL)"}</td>
              <td className="module-cell-center english-cell">{grandTotals.sanctioned}</td>
              <td className="module-cell-center english-cell">{grandTotals.working}</td>
              <td className="module-cell-center english-cell">{grandTotals.vacancy}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="strength-working-modal">
          <div className="strength-working-modal-card">
            <div className="strength-modal-header">
              <b className="strength-modal-title">🏢 {modal.title} ({displayList.length})</b>
              <button type="button" onClick={() => setModal(null)} className="module-btn-danger">
                ✕ {english ? "Close" : "बंद करें"}
              </button>
            </div>

            {modalTabs.length > 0 && (
              <div className="strength-modal-tabs">
                {modalTabs.map((tb) => (
                  <button
                    type="button"
                    key={tb.id}
                    onClick={() => setModalTab(tb.id)}
                    className={`strength-modal-tab ${modalTab === tb.id ? "is-active" : ""}`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            )}

            <SmartEmployeeTable
              employees={displayList}
              onAction={handleEmployeeAction}
              caption={modal.title}
              language={language}
            />
          </div>
        </div>
      )}
    </div>
  );
}
