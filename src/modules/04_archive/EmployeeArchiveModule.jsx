import { useMemo, useState } from "react";
import ExportBar from "../../core/ExportBar";

const ARCHIVE_TYPES = ["Retirement", "Relieve / Other District Transfer", "Death", "Deputation"];

function formatDay(value) {
  if (!value) return "-";
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text.split(/[T ]/)[0];
}

export default function EmployeeArchiveModule({ records = [], allSheets = {}, onArchiveEmployee }) {
  const [query, setQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState("");
  const [eventType, setEventType] = useState(ARCHIVE_TYPES[0]);
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const archiveRows = allSheets.Employee_Archive || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return records.filter((employee) => !q || [
      employee.NAME,
      employee["BELT NO"],
      employee.CADER
    ].some((value) => String(value || "").toLocaleLowerCase().includes(q))).slice(0, 25);
  }, [records, query]);
  const years = [...new Set(archiveRows.map((row) => String(row.YEAR || row.EVENT_DATE || "").slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse();
  const [year, setYear] = useState("");
  const visibleRows = archiveRows.filter((row) => !year || String(row.YEAR || row.EVENT_DATE || "").slice(0, 4) === year);
  const grouped = visibleRows.reduce((groups, row) => {
    const key = String(row.YEAR || row.EVENT_DATE || "अज्ञात").slice(0, 4);
    (groups[key] ||= []).push(row);
    return groups;
  }, {});
  const selectedEmployee = records.find((employee) => employee._uid === selectedUid);

  const archiveSelected = () => {
    if (!selectedEmployee) return;
    if (!window.confirm(`${selectedEmployee.NAME || "चयनित कर्मचारी"} को ${eventType} अभिलेख में दर्ज करें?`)) return;
    const saved = onArchiveEmployee?.(selectedEmployee, eventType, eventDate);
    if (saved !== false) {
      setSelectedUid("");
      setQuery("");
    }
  };

  return (
    <div className="employee-archive" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "14px", padding: "18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <h2>Relieve / Retire / Death / Deputation Archive</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label>वर्ष
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="">सभी वर्ष</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <ExportBar title="Employee Archive" rows={visibleRows} fileName="Employee_Archive" />
          <button type="button" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </header>
      <section style={{ padding: "14px", background: "#F8FAFC", borderRadius: "10px", margin: "12px 0" }}>
        <h3>कर्मचारी खोजें और अभिलेख दर्ज करें</h3>
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedUid(""); }} placeholder="नाम, बेल्ट नं. या पद खोजें" style={{ width: "100%", padding: "9px" }} />
        {filtered.slice(0, 8).map((employee) => (
          <button type="button" key={employee._uid} onClick={() => setSelectedUid(employee._uid)} style={{ margin: "6px", padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: "7px", background: selectedUid === employee._uid ? "#DBEAFE" : "#fff", cursor: "pointer" }}>
            {employee.NAME} · {employee.CADER} · {employee["BELT NO"] || "-"}
          </button>
        ))}
        {selectedEmployee && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>{ARCHIVE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            <button type="button" onClick={archiveSelected}> दर्ज करें</button>
          </div>
        )}
      </section>
      {Object.entries(grouped).map(([groupYear, rows]) => (
        <section key={groupYear} style={{ marginTop: "16px" }}>
          <h3>{groupYear}</h3>
          <div className="table-responsive-box" style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>{["Name", "Father Name", "Post", "Belt No.", "Type", "Date", "Posting"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => (
                <tr key={row._uid || `${row.NAME}-${index}`}>
                  <td>{row.NAME}</td><td>{row["FATHER NAME"] || "-"}</td><td>{row.CADER || "-"}</td><td>{row["BELT NO"] || "-"}</td>
                  <td>{row.EVENT_TYPE || row.REASON || "-"}</td><td>{formatDay(row.EVENT_DATE)}</td><td>{row.POSTING || "-"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ))}
      {archiveRows.length === 0 && <p>अभी कोई वर्ष-वार अभिलेख नहीं है।</p>}
    </div>
  );
}
