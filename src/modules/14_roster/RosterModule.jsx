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

export default function RosterModule({ reports, records = [], plSummary = [], allSheets = {}, setAllSheets, language = "hi" }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
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

  return (
    <div className="roster-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={english ? "🏢 PS-Wise Strength & Duty Roster" : "🏢 थाना-वार नफरी एवं ड्यूटी रोस्टर"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={rows}
        fileName="Monthly_PS_Roster"
        language={language}
        extraActions={(
          <button
            type="button"
            onClick={() => downloadAllReportsExcel(reports)}
            style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", fontWeight: "bold", fontSize: "0.82rem", cursor: "pointer" }}
          >
            📥 {english ? "Download All 8 Reports (Excel)" : "सभी 8 रिपोर्ट्स Excel"}
          </button>
        )}
      />

      <form onSubmit={addDuty} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", margin: "14px 0", background: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input required type="date" value={dutyDate} onChange={(event) => setDutyDate(event.target.value)} style={{ padding: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
          {genderFilteredRecords.map((record) => (
            <option
              key={record._uid || record["BELT NO"]}
              value={String(record["BELT NO"] || "").trim().toUpperCase()}
              style={isDevlysText(record.NAME) ? { fontFamily: "'DevLys 010', sans-serif", fontSize: "17px" } : undefined}
            >
              {record["BELT NO"]} — {record.NAME}
            </option>
          ))}
        </select>
        <select value={shift} onChange={(event) => setShift(event.target.value)} style={{ padding: "8px" }}>
          <option value="दैनिक">{english ? "Daily" : "दैनिक"}</option>
          <option value="साप्ताहिक">{english ? "Weekly" : "साप्ताहिक"}</option>
        </select>
        <select value={dutyType} onChange={(event) => setDutyType(event.target.value)} style={{ padding: "8px" }}>
          <option value="गश्त">{english ? "Patrol" : "गश्त"}</option>
          <option value="संतरी">{english ? "Sentry" : "संतरी"}</option>
          <option value="कोर्ट">{english ? "Court" : "कोर्ट"}</option>
          <option value="VIP ड्यूटी">{english ? "VIP Duty" : "VIP ड्यूटी"}</option>
        </select>
        <button type="submit" style={{ background: "#16A34A", color: "#fff", border: 0, borderRadius: "6px", padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}>
          {english ? "Add Duty" : "ड्यूटी जोड़ें"}
        </button>
      </form>

      <div className="table-responsive-box" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>{english ? "S.N." : "क्र.सं."}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "PS / Branch / Office" : "थाना / शाखा / कार्यालय"}</th>
              <th style={{ padding: "8px" }}>HC (M)</th>
              <th style={{ padding: "8px" }}>MHC (F)</th>
              <th style={{ padding: "8px" }}>FC (M)</th>
              <th style={{ padding: "8px" }}>MFC (F)</th>
              <th style={{ padding: "8px" }}>MT</th>
              <th style={{ padding: "8px" }}>RT</th>
              <th style={{ padding: "8px" }}>{english ? "Total" : "कुल नफरी"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["क्र.सं."]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={r["थाना / शाखा / कार्यालय"]} /></td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["HC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["MHC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["FC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["MFC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["MT (चालक)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["Recruit (RT)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", backgroundColor: "#F1F5F9", fontFamily: "'Times New Roman', Times, serif" }}>{r["कुल कार्यरत नफरी"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>{english ? `Daily / Weekly Duty (${dutyRows.length})` : `दैनिक / साप्ताहिक ड्यूटी (${dutyRows.length})`}</h3>
      <div className="table-responsive-box" style={{ overflowX: "auto", marginTop: "10px", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Date" : "दिनांक",
                english ? "Shift" : "अवधि",
                english ? "Station / Office" : "थाना / कार्यालय",
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Duty" : "ड्यूटी"
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {dutyExportRows.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${row["दिनांक"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["दिनांक"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row["अवधि"]}</td>
                <td style={{ padding: "6px" }}><HindiText text={row["थाना / कार्यालय"]} /></td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row["NAME"]} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row["ड्यूटी"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pi300ChartModule plSummary={plSummary} search={search} language={language} />
    </div>
  );
}
