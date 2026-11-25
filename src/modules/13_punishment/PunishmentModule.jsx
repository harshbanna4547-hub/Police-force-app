import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, formatDateOnly } from "../../shared/commonFunctions";
import { getCleanRecordEmployees } from "./punishmentLogic";
import "./punishment.css";

export default function PunishmentModule({ records = [], allSheets = {}, setAllSheets, language = "hi" }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [sajaType, setSajaType] = useState("17 CC - Censure (निंदा)");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [reason, setReason] = useState("");
  const [cleanOnly, setCleanOnly] = useState(false);
  const english = language === "en";

  const rows = useMemo(() => allSheets["Saja_Record"] || [], [allSheets]);
  const cleanRows = useMemo(
    () => getCleanRecordEmployees(filterEmployeesByGender(records, gender), rows),
    [records, gender, rows]
  );

  const displayedRows = useMemo(() => {
    const base = cleanOnly ? cleanRows : rows;
    if (!search.trim()) return base;
    return base.filter((row) =>
      matchesEmployeeSearch(row, search, ["NAME", "BELT NO", "CADER", "POSTING", "PUNISHMENT_TYPE", "BRIEF_REASON"])
    );
  }, [cleanOnly, cleanRows, rows, search]);

  const exportRows = cleanOnly
    ? displayedRows.map((record) => ({
      "BELT NO": record["BELT NO"],
      CADER: record.CADER,
      NAME: record.NAME,
      POSTING: record.POSTING,
      "स्थिति": "कोई सजा रिकॉर्ड नहीं"
    }))
    : displayedRows;

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
    alert(english ? "Punishment record saved." : "सज़ा / विभागीय कार्यवाही रिकॉर्ड सुरक्षित हो गया!");
    setOrderNo("");
    setReason("");
  };

  return (
    <div className="punishment-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={english ? "⚖️ Departmental Punishment & Clean Record" : "⚖️ विभागीय सज़ा / दण्ड रिकॉर्ड (17 CC / 16 CC)"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName={cleanOnly ? "Clean_Record_List" : "Punishment_Record"}
        language={language}
      />

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input type="text" required placeholder={english ? "Belt No." : "बेल्ट नं."} value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder={english ? "Employee Name" : "कर्मचारी का नाम"} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <select value={sajaType} onChange={(e) => setSajaType(e.target.value)} style={{ padding: "8px" }}>
          <option>17 CC - Censure (निंदा)</option>
          <option>17 CC - Increment Stop (वेतन वृद्धि रोक)</option>
          <option>16 CC - Major Penalty</option>
          <option>Suspension (निलंबन)</option>
        </select>
        <input type="text" required placeholder={english ? "DOB / Order No." : "DOB / आदेश नं."} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "Date (DD-MM-YYYY)" : "दिनांक (DD-MM-YYYY)"} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "Brief Reason" : "संक्षिप्त कारण"} value={reason} onChange={(e) => setReason(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#DC2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ➕ {english ? "Save Punishment" : "सज़ा रिकॉर्ड सेव करें"}
        </button>
      </form>

      <div style={{ display: "flex", gap: "8px", margin: "8px 0 12px" }}>
        <button type="button" onClick={() => setCleanOnly(false)} style={{ padding: "8px 12px", border: 0, borderRadius: "6px", cursor: "pointer", background: cleanOnly ? "#E2E8F0" : "#0B1E3D", color: cleanOnly ? "#1E293B" : "#fff" }}>
          {english ? `Punishment Records (${rows.length})` : `सजा रिकॉर्ड (${rows.length})`}
        </button>
        <button type="button" onClick={() => setCleanOnly(true)} style={{ padding: "8px 12px", border: 0, borderRadius: "6px", cursor: "pointer", background: cleanOnly ? "#0B1E3D" : "#E2E8F0", color: cleanOnly ? "#fff" : "#1E293B" }}>
          {english ? `Clean Record (${cleanRows.length})` : `स्वच्छ छवि (${cleanRows.length})`}
        </button>
      </div>

      <div className="table-responsive-box">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>{english ? "Belt No." : "BELT NO"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Name" : "NAME"}</th>
              {!cleanOnly && (
                <>
                  <th style={{ padding: "8px" }}>{english ? "Punishment Type" : "सज़ा प्रकार"}</th>
                  <th style={{ padding: "8px" }}>{english ? "Order No." : "आदेश नं."}</th>
                  <th style={{ padding: "8px" }}>{english ? "Date" : "दिनांक"}</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Reason" : "कारण"}</th>
                </>
              )}
              {cleanOnly && <th style={{ padding: "8px" }}>{english ? "Status" : "स्थिति"}</th>}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={r["NAME"]} /></td>
                {cleanOnly ? (
                  <td style={{ padding: "6px", textAlign: "center", color: "#15803D" }}>
                    {english ? "No Punishment Record" : "कोई दर्ज सजा नहीं"}
                  </td>
                ) : (
                  <>
                    <td style={{ padding: "6px", textAlign: "center", color: "#B91C1C", fontWeight: "bold" }}>{r["PUNISHMENT_TYPE"]}</td>
                    <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["ORDER_NO"]}</td>
                    <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["ORDER_DATE"])}</td>
                    <td style={{ padding: "6px" }}><HindiText text={r["BRIEF_REASON"]} /></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
