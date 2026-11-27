import React, { useMemo, useState } from "react";
import { CADRE_GROUPS, DEFAULT_SANCTIONED, mapRankToCode } from "../../data/cadreConfig";
import { filterEmployeesByGender, getEmployeeGender } from "../../forceLogic";
import { getBeltNo } from "../../shared/commonFunctions";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import SmartEmployeeTable from "../../components/shared/SmartEmployeeTable";
import StatCards from "../../layout/StatCards";
import OfficePsStrength from "./OfficePsStrength";
import {
  buildCasteStrengthSummary,
  filterStrengthRecords,
  formatVacancy,
  POST_FILTER_TABS
} from "./strengthLogic";
import { translateCadreGroup, translateRankLabel } from "../../utils/i18n";
import "./strength.css";

const VALID_TABS = new Set(["POST_WISE", "OFFICE_PS_WISE", "SUMMARY", "CASTE_WISE"]);

/**
 * [COMPONENT] StrengthModule — 4-Tab नफरी मॉड्यूल (Post-Wise, PS/CO/Office-Wise, Summary, Caste-Wise)
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
  initialTab = "POST_WISE",
  singleTabMode = false,
  currentDistrict,
  language = "hi"
}) {
  const [subTab, setSubTab] = useState(() =>
    VALID_TABS.has(initialTab) ? initialTab : "POST_WISE"
  );
  const [selectedPostTab, setSelectedPostTab] = useState("ALL");
  const [selectedCasteRow, setSelectedCasteRow] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [genderFilter] = useState("ALL");
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(false);
  const [officeExportRows, setOfficeExportRows] = useState([]);
  const english = language === "en";

  const genderFilteredRecords = useMemo(
    () => filterEmployeesByGender(records, genderFilter),
    [records, genderFilter]
  );

  // Rank-wise working strength count per cadre code
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

  // Live working count per rank/cadre filter pill
  const postTabCounts = useMemo(() => {
    const counts = {};
    POST_FILTER_TABS.forEach((tab) => {
      if (!tab.groupIds) {
        counts[tab.id] = genderFilteredRecords.length;
        return;
      }
      const matchingGroups = CADRE_GROUPS.filter((g) => tab.groupIds.includes(g.id));
      let total = 0;
      matchingGroups.forEach((g) => {
        const ranks = tab.rankFilter
          ? g.ranks.filter((r) => tab.rankFilter.includes(r.code))
          : g.ranks;
        ranks.forEach((rk) => {
          total += workStats[rk.code]?.working || 0;
        });
      });
      counts[tab.id] = total;
    });
    return counts;
  }, [genderFilteredRecords.length, workStats]);

  const postPillGroups = useMemo(() => [
    {
      id: "EXECUTIVE",
      enLabel: "Executive Police Ranks",
      hiLabel: "कार्यकारी पुलिस पद",
      items: POST_FILTER_TABS.filter((pt) => pt.group === "EXECUTIVE")
    },
    {
      id: "SUPPORT",
      enLabel: "Support & Other Cadres",
      hiLabel: "अन्य संवर्ग",
      items: POST_FILTER_TABS.filter((pt) => pt.group === "SUPPORT")
    }
  ], []);

  // Tab 1: Visible cadre groups for Post-Wise tab
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

  // Tab 3: Gender & Cadre Distribution Summary
  const genderBreakdown = useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;
    records.forEach((rec) => {
      const g = getEmployeeGender(rec);
      if (g === "MALE") male += 1;
      else if (g === "FEMALE") female += 1;
      else other += 1;
    });
    return { male, female, other, total: records.length };
  }, [records]);

  // Tab 4: Caste-Wise Strength Breakdown
  const casteSummaryRows = useMemo(
    () => buildCasteStrengthSummary(genderFilteredRecords),
    [genderFilteredRecords]
  );

  const selectedCasteEmployees = useMemo(() => {
    const activeCat = selectedCasteRow
      ? casteSummaryRows.find((r) => r.category === selectedCasteRow)?.employees || []
      : [];
    return filterStrengthRecords(activeCat, employeeSearch, "ALL");
  }, [selectedCasteRow, casteSummaryRows, employeeSearch]);

  // Exports per tab
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

  const casteExportRows = useMemo(
    () => casteSummaryRows.map((r) => ({
      Category: r.category,
      Male: r.male,
      Female: r.female,
      Total: r.total,
      "Share %": `${r.sharePct}%`,
      "Officers (SP-CI)": r.ranks.OFFICERS,
      "SI / ASI": r.ranks.SUPERVISORY,
      HC: r.ranks.HC,
      FC: r.ranks.FC,
      "Ministerial / Support": r.ranks.SUPPORT
    })),
    [casteSummaryRows]
  );

  const summaryExportRows = useMemo(
    () => CADRE_GROUPS.map((grp) => {
      const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
      const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
      return {
        Cadre: translateCadreGroup(grp, language),
        Sanctioned: gSanc,
        Working: gWork,
        "Vacant / Surplus": formatVacancy(gSanc, gWork)
      };
    }),
    [sanctioned, workStats, language]
  );

  const savePostSanctioned = async () => {
    setEditing(false);
    try {
      await onSaveSanctioned?.(sanctioned);
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
    ? (english ? "PS / CO / Office-Wise Strength" : "थाना / वृत्त / कार्यालयवार नफरी")
    : subTab === "SUMMARY"
      ? (english ? "Strength Summary & Gender Distribution" : "समेकित सारांश एवं Male/Female")
      : subTab === "CASTE_WISE"
        ? (english ? "Caste-Wise Strength" : "जाति / वर्गवार नफरी")
        : (english ? "Post-Wise Strength" : "पदवार नफरी");

  const toolbarRows = subTab === "OFFICE_PS_WISE"
    ? officeExportRows
    : subTab === "CASTE_WISE"
      ? casteExportRows
      : subTab === "SUMMARY"
        ? summaryExportRows
        : postExportRows;

  const toolbarFileName = `Strength_${subTab}`;

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

  const toolbarSectionLabel = subTab === "OFFICE_PS_WISE"
    ? (english ? "Office / PS-Wise" : "थाना / वृत्त / कार्यालयवार")
    : subTab === "SUMMARY"
      ? (english ? "Summary" : "समेकित सारांश")
      : subTab === "CASTE_WISE"
        ? (english ? "Caste-Wise" : "जाति / वर्गवार")
        : (english ? "Post-Wise" : "पदवार");

  return (
    <div className="strength-module">
      {/* === TOP UNIFIED TOOLBAR === */}
      <ModuleHeaderToolbar
        title={`🛡️ ${toolbarTitle}`}
        sectionLabel={toolbarSectionLabel}
        search={employeeSearch}
        onSearchChange={setEmployeeSearch}
        rows={toolbarRows}
        fileName={toolbarFileName}
        language={language}
        extraActions={toolbarExtraActions}
        searchPlaceholder={subTab === "OFFICE_PS_WISE"
          ? (english ? "🔍 Search office, CO, PS..." : "🔍 कार्यालय, वृत्त या थाना खोजें...")
          : (english ? "🔍 Search name, belt no., post, unit..." : "🔍 नाम, बेल्ट नं., पद या पदस्थापन खोजें...")}
      />

      {/* === 4 EXACT STRENGTH TABS (Hidden in singleTabMode) === */}
      {!singleTabMode && (
        <div className="strength-subtabs">
          {[
            { id: "POST_WISE", hi: "पदवार नफरी (Post-Wise)", en: "Post-Wise Strength" },
            { id: "OFFICE_PS_WISE", hi: "थाना / वृत्त / कार्यालयवार नफरी", en: "PS / CO / Office-Wise Strength" },
            { id: "SUMMARY", hi: "समेकित सारांश एवं Male/Female", en: "Strength Summary" },
            { id: "CASTE_WISE", hi: "जाति / वर्गवार नफरी", en: "Caste-Wise Strength" }
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
      )}

      {/* === TAB 1: POST-WISE STRENGTH === */}
      {subTab === "POST_WISE" && (
        <div>
          <div className="strength-post-pills" role="group" aria-label={english ? "Rank and cadre filters" : "पद एवं संवर्ग फ़िल्टर"}>
            {postPillGroups.map((group) => (
              <div key={group.id} className="strength-pill-group-row">
                <span className="strength-pill-group-label">
                  {english ? group.enLabel : group.hiLabel}
                </span>
                <div className="strength-pill-list">
                  {group.items.map((pt) => (
                    <button
                      type="button"
                      key={pt.id}
                      onClick={() => setSelectedPostTab(pt.id)}
                      aria-pressed={selectedPostTab === pt.id}
                      className={`strength-post-pill${selectedPostTab === pt.id ? " is-active" : ""}`}
                    >
                      <span className="strength-pill-label">{english ? pt.enLabel : pt.label}</span>
                      <span className="strength-pill-count">{postTabCounts[pt.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
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

      {/* === TAB 2: PS / CO / OFFICE-WISE VIEW === */}
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

      {/* === TAB 3: EXECUTIVE SUMMARY (4-KPI BANNER + MALE/FEMALE GENDER BREAKDOWN + CADRE DISTRIBUTION) === */}
      {subTab === "SUMMARY" && (
        <div className="strength-summary-tab">
          <div className="strength-kpi-banner">
            <StatCards
              totalSanc={resolvedTotalSanc}
              activeCount={records.length}
              attCount={attCount}
              depCount={depCount}
              setActiveView={(targetView) => {
                if (targetView === "STRENGTH") setSubTab("POST_WISE");
                else setActiveView?.(targetView);
              }}
              currentDistrict={currentDistrict}
              language={language}
            />
          </div>

          <div className="strength-gender-strip">
            <div className="strength-gender-card">
              <span className="strength-gender-label">👮 {english ? "Male Force" : "पुरुष बल (Male)"}</span>
              <strong className="strength-gender-value english-cell">{genderBreakdown.male}</strong>
            </div>
            <div className="strength-gender-card is-magenta">
              <span className="strength-gender-label">👮‍♀️ {english ? "Female Force" : "महिला बल (Female)"}</span>
              <strong className="strength-gender-value english-cell">{genderBreakdown.female}</strong>
            </div>
            <div className="strength-gender-card is-purple">
              <span className="strength-gender-label">⚖️ {english ? "Unspecified Gender" : "अन्य / अचिह्नित"}</span>
              <strong className="strength-gender-value english-cell">{genderBreakdown.other}</strong>
            </div>
            <div className="strength-gender-card is-blue">
              <span className="strength-gender-label">🛡️ {english ? "Total Active Force" : "कुल कार्यरत बल"}</span>
              <strong className="strength-gender-value english-cell">{genderBreakdown.total}</strong>
            </div>
          </div>

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
        </div>
      )}

      {/* === TAB 4: CASTE-WISE STRENGTH (GEN, OBC, MBC, EWS, SC, ST RANK & GENDER BREAKDOWN) === */}
      {subTab === "CASTE_WISE" && (
        <div>
          <div className="strength-summary-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th className="module-cell-left">{english ? "Category" : "वर्ग (Category)"}</th>
                  <th>{english ? "Male" : "पुरुष"}</th>
                  <th>{english ? "Female" : "महिला"}</th>
                  <th>{english ? "Total" : "कुल"}</th>
                  <th>{english ? "Share %" : "प्रतिशत"}</th>
                  <th>{english ? "Officers (SP-CI)" : "अधिकारी"}</th>
                  <th>SI / ASI</th>
                  <th>HC</th>
                  <th>FC</th>
                  <th>{english ? "Min./Support" : "मंत्रालयिक/अन्य"}</th>
                </tr>
              </thead>
              <tbody>
                {casteSummaryRows.map((row) => (
                  <tr
                    key={row.category}
                    onClick={() => setSelectedCasteRow((prev) => (prev === row.category ? null : row.category))}
                    className={`strength-caste-row${selectedCasteRow === row.category ? " is-selected" : ""}`}
                  >
                    <td className="module-cell-left"><strong>{row.category}</strong></td>
                    <td className="module-cell-center module-cell-tnr">{row.male}</td>
                    <td className="module-cell-center module-cell-tnr">{row.female}</td>
                    <td className="module-cell-center module-cell-tnr"><strong>{row.total}</strong></td>
                    <td className="module-cell-center module-cell-tnr">{row.sharePct}%</td>
                    <td className="module-cell-center module-cell-tnr">{row.ranks.OFFICERS}</td>
                    <td className="module-cell-center module-cell-tnr">{row.ranks.SUPERVISORY}</td>
                    <td className="module-cell-center module-cell-tnr">{row.ranks.HC}</td>
                    <td className="module-cell-center module-cell-tnr">{row.ranks.FC}</td>
                    <td className="module-cell-center module-cell-tnr">{row.ranks.SUPPORT}</td>
                  </tr>
                ))}
                <tr className="strength-grand-total-row">
                  <td className="module-cell-left">{english ? "GRAND TOTAL" : "महायोग"}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.male, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.female, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.total, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">100.0%</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.ranks.OFFICERS, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.ranks.SUPERVISORY, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.ranks.HC, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.ranks.FC, 0)}</td>
                  <td className="module-cell-center module-cell-tnr">{casteSummaryRows.reduce((s, r) => s + r.ranks.SUPPORT, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {selectedCasteRow && (
            <div className="strength-drilldown-section">
              <h4 className="strength-drilldown-heading">
                {selectedCasteRow} — {english ? "Category Personnel" : "वर्गवार कार्यरत कर्मचारी"} ({selectedCasteEmployees.length})
              </h4>
              <SmartEmployeeTable
                employees={selectedCasteEmployees}
                onAction={handleEmployeeAction}
                caption={`${selectedCasteRow} employees`}
                language={language}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
