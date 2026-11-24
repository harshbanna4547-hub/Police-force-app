import { useState } from "react";
import { downloadAllReportsExcel } from "../utils/reportEngine";
import ExportBar from "../core/ExportBar";

export default function RosterModule({ reports, records = [], allSheets = {}, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [dutyDate, setDutyDate] = useState("");
  const [dutyType, setDutyType] = useState("गश्त");
  const [shift, setShift] = useState("दैनिक");
  const rows = reports.monthlyRoster || [];
  const dutyRows = allSheets["Duty_Roster"] || [];
  const selectedEmployee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);
  const dutyExportRows = dutyRows.map((row) => ({
    "दिनांक": row.DUTY_DATE,
    "अवधि": row.SHIFT,
    "थाना / कार्यालय": devToHindi(row.POSTING),
    "BELT NO": row["BELT NO"],
    "NAME": devToHindi(row.NAME),
    "ड्यूटी": row.DUTY_TYPE
  }));
  const addDuty = (event) => {
    event.preventDefault();
    if (!selectedEmployee || !dutyDate) {
      alert("कर्मचारी और ड्यूटी दिनांक चुनें।");
      return;
    }
    const dutyRow = {
      DUTY_DATE: dutyDate,
      SHIFT: shift,
      POSTING: selectedEmployee.POSTING,
      "BELT NO": selectedEmployee["BELT NO"],
      NAME: selectedEmployee.NAME,
      DUTY_TYPE: dutyType
    };
    setAllSheets((previous) => ({
      ...previous,
      Duty_Roster: [...(previous.Duty_Roster || []), dutyRow]
    }));
    setBelt("");
    setDutyDate("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, color: "#0B1E3D" }}>🏢 थाना-वार नफरी एवं ड्यूटी रोस्टर</h2>
        <ExportBar title="मासिक थाना-वार नफरी रोस्टर" rows={rows} fileName="Monthly_PS_Roster" />
        <button
          onClick={() => downloadAllReportsExcel(reports)}
          style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          📥 सभी 8 रिपोर्ट्स Excel डाउनलोड करें
        </button>
      </div>

      <form onSubmit={addDuty} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", margin: "14px 0", background: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input required type="date" value={dutyDate} onChange={(event) => setDutyDate(event.target.value)} style={{ padding: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">कर्मचारी चुनें</option>
          {records.map((record) => <option key={record._uid || record["BELT NO"]} value={String(record["BELT NO"] || "").trim().toUpperCase()}>{record["BELT NO"]} — {devToHindi(record.NAME)}</option>)}
        </select>
        <select value={shift} onChange={(event) => setShift(event.target.value)} style={{ padding: "8px" }}>
          <option>दैनिक</option><option>साप्ताहिक</option>
        </select>
        <select value={dutyType} onChange={(event) => setDutyType(event.target.value)} style={{ padding: "8px" }}>
          <option>गश्त</option><option>संतरी</option><option>कोर्ट</option><option>VIP ड्यूटी</option>
        </select>
        <button type="submit" style={{ background: "#16A34A", color: "#fff", border: 0, borderRadius: "6px", padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}>ड्यूटी जोड़ें</button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>क्र.सं.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>थाना / शाखा / कार्यालय</th>
              <th style={{ padding: "8px" }}>HC (पुरुष)</th>
              <th style={{ padding: "8px" }}>MHC (महिला)</th>
              <th style={{ padding: "8px" }}>FC (पुरुष)</th>
              <th style={{ padding: "8px" }}>MFC (महिला)</th>
              <th style={{ padding: "8px" }}>MT (चालक)</th>
              <th style={{ padding: "8px" }}>Recruit (RT)</th>
              <th style={{ padding: "8px" }}>कुल नफरी</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["क्र.सं."]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["थाना / शाखा / कार्यालय"])}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["HC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MHC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["FC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MFC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MT (चालक)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["Recruit (RT)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", backgroundColor: "#F1F5F9" }}>{r["कुल कार्यरत नफरी"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>दैनिक / साप्ताहिक ड्यूटी ({dutyRows.length})</h3>
      <ExportBar title="दैनिक साप्ताहिक ड्यूटी रोस्टर" rows={dutyExportRows} fileName="Duty_Roster" />
      <div style={{ overflowX: "auto", marginTop: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["दिनांक", "अवधि", "थाना / कार्यालय", "बेल्ट नं.", "नाम", "ड्यूटी"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{dutyExportRows.map((row, index) => <tr key={`${row["BELT NO"]}-${row["दिनांक"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
            {Object.values(row).map((value, cellIndex) => <td key={cellIndex} style={{ padding: "6px", textAlign: "center", fontFamily: cellIndex === 0 || cellIndex === 3 ? "'Times New Roman', Times, serif" : undefined }}>{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
