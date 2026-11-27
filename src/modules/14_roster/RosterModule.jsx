import { useMemo, useState } from "react";
import { downloadAllReportsExcel } from "../../utils/reportEngine";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet } from "../../shared/commonFunctions";
import Pi300ChartModule from "./Pi300ChartModule";
import { createDutyRosterEntry } from "./rosterLogic";
import "./roster.css";

export default function RosterModule({
  reports,
  records = [],
  plSummary = [],
  allSheets = {},
  setAllSheets,
  initialTab = "PS_ROSTER",
  singleTabMode = false,
  language = "hi"
}) {
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [dutyDate, setDutyDate] = useState("");
  const [dutyType, setDutyType] = useState("गश्त");
  const [shift, setShift] = useState("दैनिक");
  const english = language === "en";

  const rows = useMemo(() => {
    const base = reports.monthlyRoster || [];
    if (!search.trim()) return base;
    return base.filter((row) =>
      matchesEmployeeSearch({ POSTING: row["थाना / शाखा / कार्यालय"] }, search, ["POSTING"])
    );
  }, [reports.monthlyRoster, search]);

  const dutyRows = useMemo(() => allSheets["Duty_Roster"] || [], [allSheets]);
  const genderFilteredRecords = useMemo(() => filterEmployeesByGender(records, gender), [records, gender]);
  const selectedEmployee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);

  const dutyExportRows = dutyRows.map((row) => ({
    "दिनांक": row.DUTY_DATE,
    "अवधि": row.SHIFT,
    "थाना / कार्यालय": row.POSTING,
    "BELT NO": row["BELT NO"],
    "NAME": row.NAME,
    "ड्यूटी": row.DUTY_TYPE
  }));

  const addDuty = (event) => {
    event.preventDefault();
    if (!selectedEmployee || !dutyDate) {
      alert(english ? "Select employee and duty date." : "कर्मचारी और ड्यूटी दिनांक चुनें।");
      return;
    }
    const dutyRow = createDutyRosterEntry(selectedEmployee, { date: dutyDate, shift, dutyType });
    appendRowToSheet(setAllSheets, "Duty_Roster", dutyRow, { prepend: false });
    setBelt("");
    setDutyDate("");
  };

  const showGuardOnly = singleTabMode && initialTab === "GUARD_CHART";
  const showPsRosterOnly = singleTabMode && initialTab === "PS_ROSTER";
  const rosterSectionLabel = showGuardOnly
    ? (english ? "Guard & Duty Chart" : "गार्ड एवं विशेष ड्यूटी")
    : (english ? "PS Daily Roster" : "थाना दैनिक रोस्टर");

  return (
    <div className="roster-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "🏢 PS-Wise Strength & Duty Roster" : "🏢 थाना-वार नफरी एवं ड्यूटी रोस्टर"}
        sectionLabel={rosterSectionLabel}
        search={search}
        onSearchChange={setSearch}
        rows={showGuardOnly ? dutyExportRows : rows}
        fileName={showGuardOnly ? "Guard_Special_Duty_Chart" : "Monthly_PS_Roster"}
        language={language}
        extraActions={(
          <button
            type="button"
            onClick={() => downloadAllReportsExcel(reports)}
            className="module-btn-success"
          >
            📥 {english ? "Download All 8 Reports (Excel)" : "सभी 8 रिपोर्ट्स Excel"}
          </button>
        )}
      />

      {/* [FORM] Add Daily / Weekly Duty Entry (दैनिक / साप्ताहिक ड्यूटी जोड़ने का फॉर्म) */}
      {!showPsRosterOnly && (
        <form onSubmit={addDuty} className="module-form-card">
          <input required type="date" value={dutyDate} onChange={(event) => setDutyDate(event.target.value)} className="module-cell-tnr" />
          <select required value={belt} onChange={(event) => setBelt(event.target.value)}>
            <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
            {genderFilteredRecords.map((record) => (
              <option
                key={record._uid || record["BELT NO"]}
                value={String(record["BELT NO"] || "").trim().toUpperCase()}
                className={isDevlysText(record.NAME) ? "devlys-text" : undefined}
              >
                {record["BELT NO"]} — {record.NAME}
              </option>
            ))}
          </select>
          <select value={shift} onChange={(event) => setShift(event.target.value)}>
            <option value="दैनिक">{english ? "Daily" : "दैनिक"}</option>
            <option value="साप्ताहिक">{english ? "Weekly" : "साप्ताहिक"}</option>
          </select>
          <select value={dutyType} onChange={(event) => setDutyType(event.target.value)}>
            <option value="गश्त">{english ? "Patrol" : "गश्त"}</option>
            <option value="संतरी">{english ? "Sentry" : "संतरी"}</option>
            <option value="कोर्ट">{english ? "Court" : "कोर्ट"}</option>
            <option value="VIP ड्यूटी">{english ? "VIP Duty" : "VIP ड्यूटी"}</option>
          </select>
          <button type="submit" className="module-btn-success">
            {english ? "Add Duty" : "ड्यूटी जोड़ें"}
          </button>
        </form>
      )}

      {/* [TABLE 1] Station-Wise Strength Summary (थाना-वार नफरी विवरण) */}
      {!showGuardOnly && (
        <div className="module-table-wrap table-responsive-box">
          <table className="module-table">
            <thead>
              <tr>
                <th>{english ? "S.N." : "क्र.सं."}</th>
                <th className="module-cell-left">{english ? "PS / Branch / Office" : "थाना / शाखा / कार्यालय"}</th>
                <th>HC (M)</th>
                <th>MHC (F)</th>
                <th>FC (M)</th>
                <th>MFC (F)</th>
                <th>MT</th>
                <th>RT</th>
                <th>{english ? "Total" : "कुल नफरी"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="module-cell-center module-cell-tnr">{r["क्र.सं."]}</td>
                  <td className="module-cell-bold"><HindiText text={r["थाना / शाखा / कार्यालय"]} /></td>
                  <td className="module-cell-center module-cell-tnr">{r["HC (पुरुष)"]}</td>
                  <td className="module-cell-center module-cell-tnr">{r["MHC (महिला)"]}</td>
                  <td className="module-cell-center module-cell-tnr">{r["FC (पुरुष)"]}</td>
                  <td className="module-cell-center module-cell-tnr">{r["MFC (महिला)"]}</td>
                  <td className="module-cell-center module-cell-tnr">{r["MT (चालक)"]}</td>
                  <td className="module-cell-center module-cell-tnr">{r["Recruit (RT)"]}</td>
                  <td className="module-cell-center module-cell-tnr roster-total-cell">{r["कुल कार्यरत नफरी"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* [TABLE 2] Daily / Weekly Duty Log (दैनिक / साप्ताहिक ड्यूटी लॉग) */}
      {!showPsRosterOnly && (
        <>
          <h3>{english ? `Daily / Weekly Duty (${dutyRows.length})` : `दैनिक / साप्ताहिक ड्यूटी (${dutyRows.length})`}</h3>
          <div className="module-table-wrap table-responsive-box roster-duty-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  {[
                    english ? "Date" : "दिनांक",
                    english ? "Shift" : "अवधि",
                    english ? "Station / Office" : "थाना / कार्यालय",
                    english ? "Belt No." : "बेल्ट नं.",
                    english ? "Name" : "नाम",
                    english ? "Duty" : "ड्यूटी"
                  ].map((heading) => <th key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {dutyExportRows.map((row, index) => (
                  <tr key={`${row["BELT NO"]}-${row["दिनांक"]}-${index}`}>
                    <td className="module-cell-center module-cell-tnr">{row["दिनांक"]}</td>
                    <td className="module-cell-center">{row["अवधि"]}</td>
                    <td><HindiText text={row["थाना / कार्यालय"]} /></td>
                    <td className="module-cell-center module-cell-tnr">{row["BELT NO"]}</td>
                    <td className="module-cell-bold"><HindiText text={row["NAME"]} /></td>
                    <td className="module-cell-center">{row["ड्यूटी"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!showGuardOnly && (
        <Pi300ChartModule plSummary={plSummary} search={search} language={language} />
      )}
    </div>
  );
}
