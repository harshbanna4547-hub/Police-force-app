import { useMemo, useState } from "react";
import EmployeeActionMenu from "../../components/shared/EmployeeActionMenu";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import HindiText from "../../core/HindiText";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import { CO_PS_MAP, OFFICE_SECTIONS } from "../../data/officeUnits";
import { getBeltNo } from "../../shared/commonFunctions";
import { translateSectionTitle, translateUnitName } from "../../utils/i18n";
import { buildPostingGroups, POST_ORDER, rankOf } from "./postingLogic";
import "./posting.css";

function SummaryTable({
  rows,
  title,
  sanctioned = {},
  onAction,
  language = "hi",
  hideTitle = false
}) {
  const english = language === "en";

  return (
    <section className="posting-summary-section">
      {!hideTitle && title && <h3 className="posting-summary-heading">{title}</h3>}
      {rows.map(([unit, employees]) => (
        <details key={unit} className="posting-unit-card">
          <summary className="posting-unit-summary">
            {translateUnitName(unit, language)} — {employees.length} {english ? "Working" : "कार्यरत"}
          </summary>
          <div className="table-responsive-box posting-unit-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>{english ? "Post" : "पद"}</th>
                  <th>{english ? "Sanctioned" : "स्वीकृत"}</th>
                  <th>{english ? "Working" : "कार्यरत"}</th>
                  <th>{english ? "Employee" : "कर्मचारी"}</th>
                </tr>
              </thead>
              <tbody>
                {POST_ORDER.flatMap((rank) => {
                  const list = employees.filter((employee) => rankOf(employee) === rank);
                  const sancVal = Number(sanctioned[unit]?.[rank] || 0);
                  return [
                    <tr key={`${unit}-${rank}-total`} className="posting-rank-summary-row">
                      <td className="english-cell">{rank}</td>
                      <td className="module-cell-center english-cell">{sancVal}</td>
                      <td className="module-cell-center english-cell module-cell-accent-green">{list.length}</td>
                      <td className="module-cell-center english-cell">{list.length || "—"}</td>
                    </tr>,
                    ...list.map((employee, index) => (
                      <EmployeeActionMenu
                        key={employee._uid || `${rank}-${index}`}
                        employee={employee}
                        responsiveDetails
                        nameCellIndex={3}
                        language={language}
                        onAction={onAction}
                      >
                        <td className="english-cell">{rank}</td>
                        <td className="module-cell-center">—</td>
                        <td className="module-cell-center">—</td>
                        <td>
                          <HindiText text={employee.NAME} />{" "}
                          <span className="english-cell">({getBeltNo(employee)})</span>
                        </td>
                      </EmployeeActionMenu>
                    ))
                  ];
                })}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}

/**
 * [COMPONENT] PostingModule — समस्त इकाइयों, CO वृत्त एवं थानों की पदस्थापन सूची
 */
export default function PostingModule({
  records = [],
  sanctioned = {},
  unitRankSanc = {},
  onEditEmployee,
  onArchiveEmployee,
  initialTab = "ALL",
  singleTabMode = false,
  language = "hi"
}) {
  const [tab, setTab] = useState(() => (["ALL", "POST", "UNIT"].includes(initialTab) ? initialTab : "ALL"));
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");
  const [selectedSection, setSelectedSection] = useState(OFFICE_SECTIONS[0]?.id || "SEC_SPO");
  const [selectedCircle, setSelectedCircle] = useState(Object.keys(CO_PS_MAP)[0] || "");
  const english = language === "en";

  // [MAPPING] Filter & group employees by official unit
  const { filtered, placeMap, sections } = useMemo(
    () => buildPostingGroups(records, search, gender),
    [records, search, gender]
  );

  const postRows = useMemo(
    () => POST_ORDER.map((rank) => [rank, filtered.filter((employee) => rankOf(employee) === rank)]),
    [filtered]
  );

  const section = OFFICE_SECTIONS.find((item) => item.id === selectedSection);
  const sectionRows = useMemo(() => {
    if (selectedSection === "SEC_CO" && selectedCircle) {
      return [
        [selectedCircle, placeMap[selectedCircle] || []],
        ...(CO_PS_MAP[selectedCircle] || []).map((unit) => [unit, placeMap[unit] || []])
      ];
    }
    return section?.units.map((unit) => [unit, placeMap[unit] || []]) || [];
  }, [selectedSection, selectedCircle, section, placeMap]);

  const exportRows = useMemo(() => {
    if (tab === "POST") {
      return postRows.map(([rank, list]) => ({
        "पद (Post)": rank,
        "कार्यरत (Working)": list.length
      }));
    }
    const targetRows = tab === "UNIT" ? sectionRows : sections.flatMap((sec) => sec.units);
    return targetRows.map(([unit, employees], idx) => ({
      "क्र.सं.": idx + 1,
      "इकाई का नाम (Unit)": translateUnitName(unit, language),
      "कार्यरत (Working)": employees.length
    }));
  }, [tab, postRows, sectionRows, sections, language]);

  const handleAction = (action, selected) => {
    if (action === "UPDATE") onEditEmployee?.(selected, "personal");
    if (action === "TRANSFER") onEditEmployee?.(selected, "posting");
    if (action === "RELIEVE") {
      const reason = window.prompt(english
        ? "Enter reason for Relieve / Retire / Death / Deputation:"
        : "Relieve / Retire / Death / Deputation का कारण लिखें:");
      if (reason) onArchiveEmployee?.(selected, reason);
    }
    if (action === "SERVICE_SLIP") openEmployeeServiceSlip(selected);
  };

  const totalWorking = filtered.length;
  const totalSanctioned = Object.values(sanctioned).reduce((sum, value) => sum + Number(value || 0), 0);

  const sectionLabel = tab === "POST"
    ? (english ? "Post-Wise" : "पद-वार")
    : tab === "UNIT"
      ? (english ? "Office / CO / PS Wise" : "कार्यालय / वृत्त / थाना-वार")
      : (english ? "SP Office, ASP, CO & PS" : "सभी कार्यरत");

  return (
    <div className="posting-module">
      <ModuleHeaderToolbar
        title={english ? "📍 Posting & Unit Strength List" : "📍 पदस्थापन एवं इकाई-वार सूची"}
        sectionLabel={sectionLabel}
        search={search}
        onSearchChange={setSearch}
        rows={exportRows}
        fileName={`Posting_List_${tab}`}
        language={language}
      />

      {!singleTabMode && (
        <div className="posting-tab-bar">
          {[
            ["ALL", english ? "All Working" : "सभी कार्यरत"],
            ["POST", english ? "Post-Wise" : "पद-वार"],
            ["UNIT", english ? "Office / CO / PS Wise" : "कार्यालय / वृत्त / थाना-वार"]
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`posting-tab-btn ${tab === id ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "ALL" && sections.map((group) => {
        const groupTitle = translateSectionTitle(group.id, group.title, language);
        if (group.id === "SEC_CO") {
          return (
            <section key={group.id} className="posting-summary-section">
              <h3 className="posting-summary-heading">{groupTitle}</h3>
              {Object.entries(CO_PS_MAP).map(([circle, stations]) => (
                <details key={circle} className="posting-unit-card">
                  <summary className="posting-unit-summary">
                    {translateUnitName(circle, language)} — {(placeMap[circle] || []).length} {english ? "CO Staff" : "CO कर्मचारी"}
                  </summary>
                  <SummaryTable
                    rows={[[circle, placeMap[circle] || []], ...stations.map((station) => [station, placeMap[station] || []])]}
                    sanctioned={unitRankSanc}
                    onAction={handleAction}
                    language={language}
                    hideTitle
                  />
                </details>
              ))}
            </section>
          );
        }
        return (
          <SummaryTable
            key={group.id}
            rows={group.units}
            title={groupTitle}
            sanctioned={unitRankSanc}
            onAction={handleAction}
            language={language}
          />
        );
      })}

      {tab === "POST" && (
        <SummaryTable
          rows={postRows}
          title={english ? "Post-Wise Working" : "पद-वार कार्यरत नफरी"}
          onAction={handleAction}
          language={language}
        />
      )}

      {tab === "UNIT" && (
        <>
          <div className="posting-section-pills">
            {OFFICE_SECTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedSection(item.id)}
                aria-pressed={selectedSection === item.id}
                className={`posting-pill-btn ${selectedSection === item.id ? "is-active" : ""}`}
              >
                {translateSectionTitle(item.id, item.title, language)}
              </button>
            ))}
          </div>
          {selectedSection === "SEC_CO" && (
            <label className="posting-co-picker-label">
              {english ? "CO Circle" : "वृत्त कार्यालय"}
              <select value={selectedCircle} onChange={(event) => setSelectedCircle(event.target.value)} className="posting-co-picker-select">
                {Object.keys(CO_PS_MAP).map((circle) => (
                  <option key={circle} value={circle}>{translateUnitName(circle, language)}</option>
                ))}
              </select>
            </label>
          )}
          <SummaryTable
            rows={sectionRows}
            title={section ? translateSectionTitle(section.id, section.title, language) : (english ? "Unit-Wise Strength" : "इकाई-वार नफरी")}
            sanctioned={unitRankSanc}
            onAction={handleAction}
            language={language}
          />
        </>
      )}

      <div className="posting-footer-summary">
        {english
          ? `Total Sanctioned: ${totalSanctioned} | Total Working: ${totalWorking} | Vacant: ${Math.max(totalSanctioned - totalWorking, 0)}`
          : `कुल स्वीकृत: ${totalSanctioned} | कुल कार्यरत: ${totalWorking} | कुल रिक्त: ${Math.max(totalSanctioned - totalWorking, 0)}`}
      </div>
    </div>
  );
}
