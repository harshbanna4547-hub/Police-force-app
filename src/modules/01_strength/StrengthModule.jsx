// src/modules/01_strength/StrengthModule.jsx
import React, { useState, useMemo } from "react";
import { CADRE_GROUPS, DEFAULT_SANCTIONED, mapRankToCode } from "../../data/cadreConfig";
import { filterEmployeesByGender } from "../../forceLogic";
import { getBeltNo } from "../../shared/commonFunctions";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import SmartEmployeeTable from "../../components/shared/SmartEmployeeTable";
import OfficePsStrength from "./OfficePsStrength";
import { filterStrengthRecords, formatVacancy, POST_FILTER_TABS } from "./strengthLogic";
import { translateCadreGroup, translateRankLabel } from "../../utils/i18n";
import "./strength.css";

export default function StrengthModule({
  records = [],
  sanctioned = {},
  setSanctioned,
  unitRankSanc = {},
  setUnitRankSanc,
  onSaveSanctioned,
  onSaveUnitRankSanc,
  onEditEmployee,
  onArchiveEmployee,
  language = "hi"
}) {
  const [subTab, setSubTab] = useState("POST_WISE");
  const [selectedPostTab, setSelectedPostTab] = useState("ALL");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(false);
  const [officeExportRows, setOfficeExportRows] = useState([]);
  const english = language === "en";

  const genderFilteredRecords = useMemo(
    () => filterEmployeesByGender(records, genderFilter),
    [records, genderFilter]
  );

  const workStats = useMemo(() => {
    const stats = {};
    Object.keys(DEFAULT_SANCTIONED).forEach((k) => {
      stats[k] = { working: 0, empList: [] };
    });
    genderFilteredRecords.forEach((row) => {
      const code = mapRankToCode(row["CADER"] || "", getBeltNo(row));
      if (!stats[code]) return;
      stats[code].working += 1;
      stats[code].empList.push(row);
    });
    return stats;
  }, [genderFilteredRecords]);

  const visibleGroups = useMemo(() => {
    const tabSpec = POST_FILTER_TABS.find((t) => t.id === selectedPostTab);
    if (!tabSpec || !tabSpec.groupIds) return CADRE_GROUPS;
    return CADRE_GROUPS.filter((g) => tabSpec.groupIds.includes(g.id)).map((g) => {
      if (tabSpec.rankFilter) {
        return { ...g, ranks: g.ranks.filter((r) => tabSpec.rankFilter.includes(r.code)) };
      }
      return g;
    });
  }, [selectedPostTab]);

  const selectedPostEmployees = useMemo(() => {
    if (selectedPostTab === "ALL") return genderFilteredRecords;
    const list = [];
    visibleGroups.forEach((g) => {
      g.ranks.forEach((rk) => {
        if (workStats[rk.code]?.empList) list.push(...workStats[rk.code].empList);
      });
    });
    return list;
  }, [selectedPostTab, genderFilteredRecords, visibleGroups, workStats]);

  const employeeSearchResults = useMemo(
    () => filterStrengthRecords(selectedPostEmployees, employeeSearch, "ALL"),
    [selectedPostEmployees, employeeSearch]
  );

  const grandTotals = useMemo(() => {
    let totalSanctioned = 0;
    let totalWorking = 0;
    visibleGroups.forEach((grp) => {
      totalSanctioned += grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
      totalWorking += grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
    });
    return {
      sanctioned: totalSanctioned,
      working: totalWorking,
      vacancy: formatVacancy(totalSanctioned, totalWorking)
    };
  }, [visibleGroups, sanctioned, workStats]);

  const postExportRows = useMemo(() => {
    const rows = [];
    visibleGroups.forEach((grp) => {
      const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
      const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
      rows.push({
        "संवर्ग / पद का नाम": translateCadreGroup(grp, language),
        "स्वीकृत (Sanc.)": gSanc,
        "कार्यरत (Work.)": gWork,
        "रिक्त / अधिक": formatVacancy(gSanc, gWork)
      });
      grp.ranks.forEach((rk) => {
        const sVal = Number(sanctioned[rk.code] || 0);
        const wVal = workStats[rk.code]?.working || 0;
        rows.push({
          "संवर्ग / पद का नाम": `    ${translateRankLabel(rk, language)}`,
          "स्वीकृत (Sanc.)": sVal,
          "कार्यरत (Work.)": wVal,
          "रिक्त / अधिक": formatVacancy(sVal, wVal)
        });
      });
    });
    rows.push({
      "संवर्ग / पद का नाम": english ? "GRAND TOTAL" : "महायोग (GRAND TOTAL)",
      "स्वीकृत (Sanc.)": grandTotals.sanctioned,
      "कार्यरत (Work.)": grandTotals.working,
      "रिक्त / अधिक": grandTotals.vacancy
    });
    return rows;
  }, [visibleGroups, sanctioned, workStats, grandTotals, language, english]);

  const savePostSanctioned = async () => {
    try {
      await onSaveSanctioned(sanctioned);
      setEditing(false);
      alert(english
        ? "Post-wise sanctioned strength saved to IndexedDB."
        : "पद-वार स्वीकृत नफरी IndexedDB में सुरक्षित हो गई है!");
    } catch (error) {
      console.error("Post-wise sanctioned strength could not be saved:", error);
      alert(`स्वीकृत नफरी सेव नहीं हो सकी: ${error.message}`);
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

  const toolbarTitle = subTab === "OFFICE_PS_WISE"
    ? (english ? "Office / CO / PS-Wise Strength" : "कार्यालय, वृत्त एवं थाना-वार नफरी")
    : subTab === "VACANCY_SUMMARY"
      ? (english ? "Vacancy & Recruitment Summary" : "संवर्ग-वार रिक्त पदों का संक्षिप्त सारांश")
      : (english ? "Sanctioned & Working Strength" : "स्वीकृत एवं कार्यरत नफरी");

  const toolbarRows = subTab === "OFFICE_PS_WISE" ? officeExportRows : postExportRows;
  const toolbarFileName = subTab === "OFFICE_PS_WISE"
    ? "Office_CO_PS_Strength"
    : subTab === "VACANCY_SUMMARY"
      ? "Vacancy_Summary"
      : `Strength_${selectedPostTab}`;

  const toolbarExtraActions = subTab === "POST_WISE" ? (
    !editing ? (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "0.82rem", cursor: "pointer" }}
      >
        ✏️ {english ? "Edit Sanctioned" : "स्वीकृत नफरी बदलें"}
      </button>
    ) : (
      <div style={{ display: "flex", gap: "6px" }}>
        <button type="button" onClick={savePostSanctioned} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "0.82rem", cursor: "pointer" }}>
          ✅ {english ? "Save" : "सेव करें"}
        </button>
        <button type="button" onClick={() => setEditing(false)} style={{ backgroundColor: "#64748B", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>
          {english ? "Cancel" : "रद्द करें"}
        </button>
      </div>
    )
  ) : null;

  return (
    <div className="strength-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "14px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={`🛡️ ${toolbarTitle}`}
        search={employeeSearch}
        onSearchChange={setEmployeeSearch}
        gender={genderFilter}
        onGenderChange={setGenderFilter}
        rows={toolbarRows}
        fileName={toolbarFileName}
        language={language}
        extraActions={toolbarExtraActions}
        searchPlaceholder={subTab === "OFFICE_PS_WISE"
          ? (english ? "🔍 Search office, CO, PS..." : "🔍 कार्यालय, वृत्त या थाना खोजें...")
          : (english ? "🔍 Search name, belt no., post, unit..." : "🔍 नाम, बेल्ट नं., पद या पदस्थापन खोजें...")}
      />

      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid var(--border, #E2E8F0)", paddingBottom: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { id: "POST_WISE", hi: "पद-वार स्वीकृत नफरी", en: "Post-Wise Sanctioned Strength" },
          { id: "OFFICE_PS_WISE", hi: "कार्यालय / वृत्त / थाना-वार नफरी", en: "Office / CO / PS-Wise Strength" },
          { id: "VACANCY_SUMMARY", hi: "रिक्त पद सारांश", en: "Vacancy & Recruitment Summary" }
        ].map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.88rem",
              backgroundColor: subTab === t.id ? "#0B1E3D" : "#F1F5F9",
              color: subTab === t.id ? "#FFD700" : "#334155"
            }}
          >
            {english ? t.en : t.hi}
          </button>
        ))}
      </div>

      {subTab === "POST_WISE" && (
        <div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", backgroundColor: "#F8FAFC", padding: "10px", borderRadius: "10px", border: "1px solid #CBD5E1", marginBottom: "14px" }}>
            {POST_FILTER_TABS.map((pt) => {
              const active = selectedPostTab === pt.id;
              return (
                <button
                  type="button"
                  key={pt.id}
                  onClick={() => setSelectedPostTab(pt.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: active ? "none" : "1px solid #CBD5E1",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.84rem",
                    backgroundColor: active ? "#1D63DC" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#1E293B"
                  }}
                >
                  {english ? pt.enLabel : pt.label}
                </button>
              );
            })}
          </div>

          <div style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <table className="strength-summary-table">
              <colgroup>
                <col style={{ width: "46%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
                  <th style={{ padding: "10px", textAlign: "left", border: "1px solid #CBD5E1" }}>
                    {english ? "Cadre / Post Name" : "संवर्ग / पद का नाम"}
                  </th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>
                    {english ? "Sanctioned" : "स्वीकृत (Sanc.)"}
                  </th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>
                    {english ? "Working" : "कार्यरत (Work.)"}
                  </th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>
                    {english ? "Vacant / Surplus" : "रिक्त / अधिक"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((grp) => {
                  const isOpen = selectedPostTab !== "ALL" || !!expanded[grp.id] || editing;
                  const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
                  const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
                  const gVac = gSanc - gWork;
                  return (
                    <React.Fragment key={grp.id}>
                      <tr onClick={() => setExpanded((p) => ({ ...p, [grp.id]: !p[grp.id] }))} style={{ backgroundColor: "#D8E4F0", fontWeight: "bold", cursor: "pointer" }}>
                        <td style={{ padding: "8px 10px", border: "1px solid #CBD5E1" }}>
                          {translateCadreGroup(grp, language)}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1" }}>{gSanc}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1" }}>{gWork}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1", color: gVac > 0 ? "#B91C1C" : "#15803D" }}>
                          {formatVacancy(gSanc, gWork)}
                        </td>
                      </tr>
                      {isOpen && grp.ranks.map((rk) => {
                        const sVal = Number(sanctioned[rk.code] || 0);
                        const wVal = workStats[rk.code]?.working || 0;
                        const diff = sVal - wVal;
                        return (
                          <tr key={rk.code}>
                            <td style={{ padding: "7px 10px 7px 28px", border: "1px solid #E2E8F0" }}>
                              {translateRankLabel(rk, language)}
                            </td>
                            <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                              {editing ? (
                                <input type="number" min="0" value={sVal} onChange={(e) => setSanctioned({ ...sanctioned, [rk.code]: Number(e.target.value) })} style={{ width: "65px", textAlign: "center" }} />
                              ) : sVal}
                            </td>
                            <td
                              onClick={() => setSelectedPostTab(POST_FILTER_TABS.find((tab) =>
                                tab.rankFilter?.includes(rk.code) ||
                                tab.groupIds?.some((groupId) => CADRE_GROUPS.some((group) => group.id === groupId && group.ranks.some((rank) => rank.code === rk.code)))
                              )?.id || selectedPostTab)}
                              title={english ? "Open working employees list" : "कार्यरत कर्मचारियों की सूची खोलें"}
                              style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", color: "#15803D", fontWeight: "bold", cursor: "pointer" }}
                            >
                              {wVal}
                            </td>
                            <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", color: diff > 0 ? "#DC2626" : "#15803D", fontWeight: "bold" }}>
                              {formatVacancy(sVal, wVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <tr className="strength-grand-total-row">
                  <td style={{ padding: "10px", border: "1px solid #334155" }}>
                    {english ? "GRAND TOTAL" : "महायोग (GRAND TOTAL)"}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", border: "1px solid #334155" }}>{grandTotals.sanctioned}</td>
                  <td style={{ padding: "10px", textAlign: "center", border: "1px solid #334155" }}>{grandTotals.working}</td>
                  <td style={{ padding: "10px", textAlign: "center", border: "1px solid #334155" }}>{grandTotals.vacancy}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {(employeeSearch.trim() || (selectedPostTab !== "ALL" && selectedPostEmployees.length > 0)) && (
            <div style={{ marginTop: "20px", borderTop: "2px solid #CBD5E1", paddingTop: "14px" }}>
              <h4 style={{ margin: "0 0 10px", color: "#1D63DC" }}>
                {employeeSearch.trim()
                  ? `${english ? "Search Results" : "कर्मचारी खोज परिणाम"} (${employeeSearchResults.length})`
                  : `${selectedPostTab} — ${english ? "Working Employees" : "कार्यरत कर्मचारी सूची"} (${employeeSearchResults.length})`}
              </h4>
              <SmartEmployeeTable
                employees={employeeSearchResults}
                onAction={handleEmployeeAction}
                caption={english ? "Working employees list" : "कार्यरत कर्मचारी सूची"}
                language={language}
              />
            </div>
          )}
        </div>
      )}

      {subTab === "OFFICE_PS_WISE" && (
        <OfficePsStrength
          records={genderFilteredRecords}
          search={employeeSearch}
          onEditEmployee={onEditEmployee}
          onArchiveEmployee={onArchiveEmployee}
          unitRankSanc={unitRankSanc}
          setUnitRankSanc={setUnitRankSanc}
          onSaveUnitRankSanc={onSaveUnitRankSanc}
          onExportRowsChange={setOfficeExportRows}
          language={language}
        />
      )}

      {subTab === "VACANCY_SUMMARY" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {CADRE_GROUPS.map((grp) => {
              const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
              const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
              const gVac = gSanc - gWork;
              return (
                <div key={grp.id} style={{ backgroundColor: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontWeight: "bold", color: "#0B1E3D", fontSize: "0.9rem", marginBottom: "8px" }}>
                    {translateCadreGroup(grp, language)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span>{english ? "Sanc." : "स्वीकृत"}: <b>{gSanc}</b></span>
                    <span style={{ color: "#15803D" }}>{english ? "Work." : "कार्यरत"}: <b>{gWork}</b></span>
                    <span style={{ color: gVac > 0 ? "#DC2626" : "#15803D" }}>{english ? "Vac." : "रिक्त/अधिक"}: <b>{formatVacancy(gSanc, gWork)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
