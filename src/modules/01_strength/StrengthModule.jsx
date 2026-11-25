import React, { useState, useMemo } from "react";
import { CADRE_GROUPS, DEFAULT_SANCTIONED, mapRankToCode } from "../../data/cadreConfig";
import { filterEmployeesByGender } from "../../forceLogic";
import { getBeltNo } from "../../shared/commonFunctions";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import SmartEmployeeTable from "../../components/shared/SmartEmployeeTable";
import StatCards from "../../layout/StatCards";
import OfficePsStrength from "./OfficePsStrength";
import { filterStrengthRecords, formatVacancy, POST_FILTER_TABS } from "./strengthLogic";
import { translateCadreGroup, translateRankLabel } from "../../utils/i18n";
import "./strength.css";

/**
 * [COMPONENT] StrengthModule — स्वीकृत एवं कार्यरत नफरी, कार्यालय/थाना-वार नफरी और रिक्त पद सारांश
 */
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
  totalSanc,
  attCount = 0,
  depCount = 0,
  setActiveView,
  currentDistrict,
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

  // [FILTER] Male / Female / All employee count logic
  const genderFilteredRecords = useMemo(
    () => filterEmployeesByGender(records, genderFilter),
    [records, genderFilter]
  );

  // [CALCULATION] Rank-wise working strength count per cadre code
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

  // [FILTER] Visible cadre groups for selected rank tab
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

  // [CALCULATION] Grand Total across visible cadre groups
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
      <button type="button" onClick={() => setEditing(true)} className="module-btn-primary">
        ✏️ {english ? "Edit Sanctioned" : "स्वीकृत नफरी बदलें"}
      </button>
    ) : (
      <div className="export-bar-group">
        <button type="button" onClick={savePostSanctioned} className="module-btn-success">
          ✅ {english ? "Save" : "सेव करें"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="module-btn-neutral">
          {english ? "Cancel" : "रद्द करें"}
        </button>
      </div>
    )
  ) : null;

  const resolvedTotalSanc = typeof totalSanc === "number"
    ? totalSanc
    : Object.values(sanctioned || {}).reduce((sum, val) => sum + Number(val || 0), 0);

  return (
    <div className="strength-module">
      {/* === COMPACT ROYAL-NAVY 4-KPI BANNER (केवल नफरी मॉड्यूल के शीर्ष पर) === */}
      <div className="strength-kpi-banner">
        <StatCards
          totalSanc={resolvedTotalSanc}
          activeCount={records.length}
          attCount={attCount}
          depCount={depCount}
          setActiveView={(targetView) => {
            if (targetView === "STRENGTH") {
              setSubTab("POST_WISE");
            } else {
              setActiveView?.(targetView);
            }
          }}
          currentDistrict={currentDistrict}
          language={language}
        />
      </div>

      {/* === TOP UNIFIED TOOLBAR (ऊपरी टूलबार) === */}
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

      {/* === SUB-VIEW TABS (उप-टैब) === */}
      <div className="strength-subtabs">
        {[
          { id: "POST_WISE", hi: "पद-वार स्वीकृत नफरी", en: "Post-Wise Sanctioned Strength" },
          { id: "OFFICE_PS_WISE", hi: "कार्यालय / वृत्त / थाना-वार नफरी", en: "Office / CO / PS-Wise Strength" },
          { id: "VACANCY_SUMMARY", hi: "रिक्त पद सारांश", en: "Vacancy & Recruitment Summary" }
        ].map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`strength-subtab-btn ${subTab === t.id ? "is-active" : ""}`}
          >
            {english ? t.en : t.hi}
          </button>
        ))}
      </div>

      {/* === 1. POST-WISE STRENGTH TABLE === */}
      {subTab === "POST_WISE" && (
        <div>
          <div className="strength-post-pills">
            {POST_FILTER_TABS.map((pt) => (
              <button
                type="button"
                key={pt.id}
                onClick={() => setSelectedPostTab(pt.id)}
                className={`strength-post-pill ${selectedPostTab === pt.id ? "is-active" : ""}`}
              >
                {english ? pt.enLabel : pt.label}
              </button>
            ))}
          </div>

          <div className="strength-summary-wrap">
            <table className="strength-summary-table">
              <colgroup>
                <col className="col-cadre" />
                <col className="col-num" />
                <col className="col-num" />
                <col className="col-num" />
              </colgroup>
              <thead>
                <tr>
                  <th>{english ? "Cadre / Post Name" : "संवर्ग / पद का नाम"}</th>
                  <th>{english ? "Sanctioned" : "स्वीकृत (Sanc.)"}</th>
                  <th>{english ? "Working" : "कार्यरत (Work.)"}</th>
                  <th>{english ? "Vacant / Surplus" : "रिक्त / अधिक"}</th>
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
                      <tr onClick={() => setExpanded((p) => ({ ...p, [grp.id]: !p[grp.id] }))} className="strength-group-row">
                        <td>{translateCadreGroup(grp, language)}</td>
                        <td className="english-cell">{gSanc}</td>
                        <td className="english-cell">{gWork}</td>
                        <td className={`english-cell ${gVac > 0 ? "strength-vac-deficit" : "strength-vac-ok"}`}>
                          {formatVacancy(gSanc, gWork)}
                        </td>
                      </tr>
                      {isOpen && grp.ranks.map((rk) => {
                        const sVal = Number(sanctioned[rk.code] || 0);
                        const wVal = workStats[rk.code]?.working || 0;
                        const diff = sVal - wVal;
                        return (
                          <tr key={rk.code}>
                            <td className="strength-rank-name">{translateRankLabel(rk, language)}</td>
                            <td className="english-cell">
                              {editing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={sVal}
                                  onChange={(e) => setSanctioned({ ...sanctioned, [rk.code]: Number(e.target.value) })}
                                  className="strength-sanc-input"
                                />
                              ) : sVal}
                            </td>
                            <td
                              onClick={() => setSelectedPostTab(POST_FILTER_TABS.find((tab) =>
                                tab.rankFilter?.includes(rk.code) ||
                                tab.groupIds?.some((groupId) => CADRE_GROUPS.some((group) => group.id === groupId && group.ranks.some((rank) => rank.code === rk.code)))
                              )?.id || selectedPostTab)}
                              title={english ? "Open working employees list" : "कार्यरत कर्मचारियों की सूची खोलें"}
                              className="english-cell strength-working-cell"
                            >
                              {wVal}
                            </td>
                            <td className={`english-cell ${diff > 0 ? "strength-vac-deficit" : "strength-vac-ok"}`}>
                              {formatVacancy(sVal, wVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {/* === GRAND TOTAL ROW (महायोग पंक्ति) === */}
                <tr className="strength-grand-total-row">
                  <td>{english ? "GRAND TOTAL" : "महायोग (GRAND TOTAL)"}</td>
                  <td className="english-cell">{grandTotals.sanctioned}</td>
                  <td className="english-cell">{grandTotals.working}</td>
                  <td className="english-cell">{grandTotals.vacancy}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {(employeeSearch.trim() || (selectedPostTab !== "ALL" && selectedPostEmployees.length > 0)) && (
            <div className="strength-drilldown-section">
              <h4 className="strength-drilldown-heading">
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

      {/* === 2. OFFICE / CO / PS-WISE VIEW === */}
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

      {/* === 3. VACANCY SUMMARY CARDS === */}
      {subTab === "VACANCY_SUMMARY" && (
        <div className="strength-vacancy-grid">
          {CADRE_GROUPS.map((grp) => {
            const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
            const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
            const gVac = gSanc - gWork;
            return (
              <div key={grp.id} className="strength-vacancy-card">
                <div className="strength-vacancy-title">
                  {translateCadreGroup(grp, language)}
                </div>
                <div className="strength-vacancy-metrics">
                  <span>{english ? "Sanc." : "स्वीकृत"}: <b>{gSanc}</b></span>
                  <span className="module-cell-accent-green">{english ? "Work." : "कार्यरत"}: <b>{gWork}</b></span>
                  <span className={gVac > 0 ? "module-cell-accent-red" : "module-cell-accent-green"}>
                    {english ? "Vac." : "रिक्त/अधिक"}: <b>{formatVacancy(gSanc, gWork)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
