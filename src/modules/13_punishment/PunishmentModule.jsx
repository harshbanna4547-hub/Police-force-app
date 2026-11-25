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
    <div className="punishment-module module-panel">
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

      {/* [FORM] New Punishment Entry (नया सज़ा विवरण दर्ज करने का फॉर्म) */}
      <form onSubmit={handleSave} className="module-form-card">
        <input type="text" required placeholder={english ? "Belt No." : "बेल्ट नं."} value={belt} onChange={(e) => setBelt(e.target.value)} />
        <input type="text" required placeholder={english ? "Employee Name" : "कर्मचारी का नाम"} value={name} onChange={(e) => setName(e.target.value)} />
        <select value={sajaType} onChange={(e) => setSajaType(e.target.value)}>
          <option>17 CC - Censure (निंदा)</option>
          <option>17 CC - Increment Stop (वेतन वृद्धि रोक)</option>
          <option>16 CC - Major Penalty</option>
          <option>Suspension (निलंबन)</option>
        </select>
        <input type="text" required placeholder={english ? "DOB / Order No." : "DOB / आदेश नं."} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
        <input type="text" placeholder={english ? "Date (DD-MM-YYYY)" : "दिनांक (DD-MM-YYYY)"} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        <input type="text" placeholder={english ? "Brief Reason" : "संक्षिप्त कारण"} value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit" className="module-btn-danger">
          ➕ {english ? "Save Punishment" : "सज़ा रिकॉर्ड सेव करें"}
        </button>
      </form>

      {/* [TOGGLE] Punishment Records vs Clean Record Filter (सज़ा बनाम स्वच्छ छवि टैब) */}
      <div className="punishment-filter-tabs">
        <button
          type="button"
          onClick={() => setCleanOnly(false)}
          className={`punishment-filter-btn${!cleanOnly ? " is-active" : ""}`}
        >
          {english ? `Punishment Records (${rows.length})` : `सजा रिकॉर्ड (${rows.length})`}
        </button>
        <button
          type="button"
          onClick={() => setCleanOnly(true)}
          className={`punishment-filter-btn${cleanOnly ? " is-active" : ""}`}
        >
          {english ? `Clean Record (${cleanRows.length})` : `स्वच्छ छवि (${cleanRows.length})`}
        </button>
      </div>

      {/* [TABLE] Punishment / Clean Force List (सज़ा एवं स्वच्छ छवि तालिका) */}
      <div className="module-table-wrap table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              <th>{english ? "Belt No." : "BELT NO"}</th>
              <th className="module-cell-left">{english ? "Name" : "NAME"}</th>
              {!cleanOnly && (
                <>
                  <th>{english ? "Punishment Type" : "सज़ा प्रकार"}</th>
                  <th>{english ? "Order No." : "आदेश नं."}</th>
                  <th>{english ? "Date" : "दिनांक"}</th>
                  <th className="module-cell-left">{english ? "Reason" : "कारण"}</th>
                </>
              )}
              {cleanOnly && <th>{english ? "Status" : "स्थिति"}</th>}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, i) => (
              <tr key={i}>
                <td className="module-cell-center module-cell-tnr">{r["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={r["NAME"]} /></td>
                {cleanOnly ? (
                  <td className="module-cell-center module-cell-accent-green">
                    {english ? "No Punishment Record" : "कोई दर्ज सजा नहीं"}
                  </td>
                ) : (
                  <>
                    <td className="module-cell-center module-cell-accent-red">{r["PUNISHMENT_TYPE"]}</td>
                    <td className="module-cell-center module-cell-tnr">{r["ORDER_NO"]}</td>
                    <td className="module-cell-center module-cell-tnr">{formatDateOnly(r["ORDER_DATE"])}</td>
                    <td><HindiText text={r["BRIEF_REASON"]} /></td>
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
