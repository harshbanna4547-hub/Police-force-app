import { useState } from "react";
import ExportBar from "../../core/ExportBar";
import { appendRowToSheet, formatDateOnly } from "../../shared/commonFunctions";
import { getCleanRecordEmployees } from "./punishmentLogic";
import "./punishment.css";

export default function PunishmentModule({ records = [], allSheets, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [sajaType, setSajaType] = useState("17 CC - Censure (निंदा)");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [reason, setReason] = useState("");
  const [cleanOnly, setCleanOnly] = useState(false);

  const rows = allSheets["Saja_Record"] || [];
  const cleanRows = getCleanRecordEmployees(records, rows);
  const displayedRows = cleanOnly ? cleanRows : rows;

  const handleSave = (e) => {
    e.preventDefault();
    const entry = {
      "BELT NO": belt.trim().toUpperCase(),
      NAME: name.trim(),
      PUNISHMENT_TYPE: sajaType,
      ORDER_NO: orderNo,
      ORDER_DATE: orderDate,
      BRIEF_REASON: reason
    };
    appendRowToSheet(setAllSheets, "Saja_Record", entry);
    alert("सज़ा / विभागीय कार्यवाही रिकॉर्ड सुरक्षित हो गया!");
    setOrderNo(""); setReason("");
  };

  return (
    <div className="punishment-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>⚖️ विभागीय सज़ा / दण्ड रिकॉर्ड (17 CC / 16 CC)</h2>
        <ExportBar title={cleanOnly ? "स्वच्छ छवि सूची" : "विभागीय सज़ा रिकॉर्ड"} rows={cleanOnly ? cleanRows.map((record) => ({
          "BELT NO": record["BELT NO"], CADER: record.CADER, NAME: devToHindi(record.NAME), POSTING: devToHindi(record.POSTING), "स्थिति": "कोई सजा रिकॉर्ड नहीं"
        })) : rows} fileName={cleanOnly ? "Clean_Record_List" : "Punishment_Record"} />
      </div>
      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="कर्मचारी का नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <select value={sajaType} onChange={(e) => setSajaType(e.target.value)} style={{ padding: "8px" }}>
          <option>17 CC - Censure (निंदा)</option>
          <option>17 CC - Increment Stop (वेतन वृद्धि रोक)</option>
          <option>16 CC - Major Penalty</option>
          <option>Suspension (निलंबन)</option>
        </select>
        <input type="text" required placeholder="DOB / आदेश नं." value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="दिनांक (DD-MM-YYYY)" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="संक्षिप्त कारण" value={reason} onChange={(e) => setReason(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#DC2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ➕ Save Punishment
        </button>
      </form>

      <div style={{ display: "flex", gap: "8px", margin: "8px 0 12px" }}>
        <button type="button" onClick={() => setCleanOnly(false)} style={{ padding: "8px 12px", border: 0, borderRadius: "6px", cursor: "pointer", background: cleanOnly ? "#E2E8F0" : "#0B1E3D", color: cleanOnly ? "#1E293B" : "#fff" }}>सजा रिकॉर्ड ({rows.length})</button>
        <button type="button" onClick={() => setCleanOnly(true)} style={{ padding: "8px 12px", border: 0, borderRadius: "6px", cursor: "pointer", background: cleanOnly ? "#0B1E3D" : "#E2E8F0", color: cleanOnly ? "#fff" : "#1E293B" }}>स्वच्छ छवि ({cleanRows.length})</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px" }}>BELT NO</th>
            <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
            {!cleanOnly && <><th style={{ padding: "8px" }}>सज़ा प्रकार</th><th style={{ padding: "8px" }}>आदेश नं.</th><th style={{ padding: "8px" }}>दिनांक</th><th style={{ padding: "8px", textAlign: "left" }}>कारण</th></>}
            {cleanOnly && <th style={{ padding: "8px" }}>स्थिति</th>}
          </tr>
        </thead>
        <tbody>
          {displayedRows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
              <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              {cleanOnly ? <td style={{ padding: "6px", textAlign: "center", color: "#15803D" }}>कोई दर्ज सजा नहीं</td> : <>
                <td style={{ padding: "6px", textAlign: "center", color: "#B91C1C", fontWeight: "bold" }}>{r["PUNISHMENT_TYPE"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["ORDER_NO"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["ORDER_DATE"])}</td>
                <td style={{ padding: "6px" }}>{devToHindi(r["BRIEF_REASON"])}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
