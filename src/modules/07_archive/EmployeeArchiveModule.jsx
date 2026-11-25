import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { getBeltNo } from "../../shared/commonFunctions";
import {
  ARCHIVE_TYPES,
  filterArchiveCandidates,
  filterArchivedRows,
  formatArchiveDay
} from "./archiveLogic";
import "./archive.css";

/**
 * [COMPONENT] EmployeeArchiveModule — वर्ष-वार सेवानिवृत्ति / रिलीव / मृत्यु / प्रतिनियुक्ति अभिलेख
 */
export default function EmployeeArchiveModule({
  records = [],
  allSheets = {},
  onArchiveEmployee,
  language = "hi"
}) {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("ALL");
  const [selectedUid, setSelectedUid] = useState("");
  const [eventType, setEventType] = useState(ARCHIVE_TYPES[0]);
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState("");
  const english = language === "en";

  const archiveRows = useMemo(() => allSheets.Employee_Archive || [], [allSheets]);
  const filteredCandidates = useMemo(
    () => filterArchiveCandidates(records, query, gender),
    [records, query, gender]
  );

  const years = useMemo(
    () => [...new Set(archiveRows.map((row) => String(row.YEAR || row.EVENT_DATE || "").slice(0, 4)).filter((y) => /^\d{4}$/.test(y)))].sort().reverse(),
    [archiveRows]
  );

  const visibleRows = useMemo(
    () => filterArchivedRows(archiveRows, year, query, gender),
    [archiveRows, year, query, gender]
  );

  const grouped = useMemo(() => visibleRows.reduce((groups, row) => {
    const key = String(row.YEAR || row.EVENT_DATE || (english ? "Unknown" : "अज्ञात")).slice(0, 4);
    (groups[key] ||= []).push(row);
    return groups;
  }, {}), [visibleRows, english]);

  const selectedEmployee = records.find((employee) => employee._uid === selectedUid);

  const archiveSelected = () => {
    if (!selectedEmployee) return;
    if (!window.confirm(english
      ? `Archive selected employee under ${eventType}?`
      : `चयनित कर्मचारी को ${eventType} अभिलेख में दर्ज करें?`)) return;
    const saved = onArchiveEmployee?.(selectedEmployee, eventType, eventDate);
    if (saved !== false) {
      setSelectedUid("");
      setQuery("");
    }
  };

  const exportRows = useMemo(() => visibleRows.map((row, index) => ({
    "क्र.सं.": index + 1,
    NAME: row.NAME || "",
    "FATHER NAME": row["FATHER NAME"] || "",
    POST: row.CADER || "",
    "BELT NO": getBeltNo(row),
    TYPE: row.EVENT_TYPE || row.REASON || "",
    DATE: formatArchiveDay(row.EVENT_DATE),
    POSTING: row.POSTING || ""
  })), [visibleRows]);

  const yearFilterControl = (
    <label className="archive-year-filter">
      <span>{english ? "Year" : "वर्ष"}</span>
      <select value={year} onChange={(event) => setYear(event.target.value)} className="module-select-control">
        <option value="">{english ? "All Years" : "सभी वर्ष"}</option>
        {years.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );

  return (
    <div className="employee-archive">
      <ModuleHeaderToolbar
        title={english ? "🗂️ Relieve / Retire / Death / Deputation Archive" : "🗂️ सेवानिवृत्ति / रिलीव / मृत्यु / प्रतिनियुक्ति अभिलेख"}
        search={query}
        onSearchChange={(val) => {
          setQuery(val);
          setSelectedUid("");
        }}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName="Employee_Archive"
        language={language}
        extraActions={yearFilterControl}
      />

      {/* === QUICK-SELECT PILLS & ARCHIVE ENTRY FORM === */}
      <section className="archive-entry-panel">
        <h3 className="archive-entry-heading">
          {english ? "Search Employee & Record Archive Entry" : "कर्मचारी खोजें और अभिलेख दर्ज करें"}
        </h3>
        <div className="archive-pill-list">
          {filteredCandidates.slice(0, 8).map((employee) => (
            <button
              type="button"
              key={employee._uid}
              onClick={() => setSelectedUid(employee._uid)}
              className={`archive-pill-btn ${selectedUid === employee._uid ? "is-selected" : ""}`}
            >
              <HindiText text={employee.NAME} />
              <span className="english-cell">
                · {employee.CADER || "-"} · {getBeltNo(employee)}
              </span>
            </button>
          ))}
        </div>
        {selectedEmployee && (
          <div className="archive-action-row">
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
              {ARCHIVE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            <button type="button" onClick={archiveSelected}>
              ✅ {english ? "Record Archive" : "दर्ज करें"}
            </button>
          </div>
        )}
      </section>

      {/* === YEAR-WISE ARCHIVE TABLES === */}
      {Object.entries(grouped).map(([groupYear, rows]) => (
        <section key={groupYear} className="archive-year-section">
          <h3>{groupYear}</h3>
          <div className="table-responsive-box">
            <table className="module-table">
              <thead>
                <tr>
                  {[
                    english ? "Name" : "नाम",
                    english ? "Father Name" : "पिता का नाम",
                    english ? "Post" : "पद",
                    english ? "Belt No." : "बेल्ट नं.",
                    english ? "Type" : "प्रकार",
                    english ? "Date" : "दिनांक",
                    english ? "Posting" : "पदस्थापन"
                  ].map((heading) => <th key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row._uid || `${row.NAME}-${index}`}>
                    <td><HindiText text={row.NAME} /></td>
                    <td><HindiText text={row["FATHER NAME"]} /></td>
                    <td className="english-cell module-cell-center">{row.CADER || "-"}</td>
                    <td className="english-cell module-cell-center">{getBeltNo(row)}</td>
                    <td className="module-cell-center">{row.EVENT_TYPE || row.REASON || "-"}</td>
                    <td className="english-cell module-cell-center">{formatArchiveDay(row.EVENT_DATE)}</td>
                    <td><HindiText text={row.POSTING} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {archiveRows.length === 0 && (
        <p className="module-muted-text">
          {english ? "No year-wise archive records yet." : "अभी कोई वर्ष-वार अभिलेख नहीं है।"}
        </p>
      )}
    </div>
  );
}
