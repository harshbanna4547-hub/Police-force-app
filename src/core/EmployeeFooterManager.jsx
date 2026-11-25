import { useMemo, useState } from "react";
import NewEmployeeSmartForm from "./NewEmployeeSmartForm";
import HindiText from "./HindiText";
import { matchesEmployeeSearch } from "../forceLogic";
import "./EmployeeFooterManager.css";

const REMOVE_REASONS = [
  "Retirement",
  "Transfer Out District",
  "Death",
  "Resignation",
  "Duplicate Entry"
];

const POST_FILTERS = ["ALL", "SP", "ASP", "DySP", "CI", "SI", "ASI", "HC", "FC"];

function getCader(employee) {
  return String(employee.CADER || "").trim();
}

function isBeltRank(cader) {
  const rank = cader.toUpperCase();
  return rank === "HC" || rank.startsWith("FC") || rank.includes("CONST");
}

function matchesPostFilter(employee, filter) {
  if (filter === "ALL") return true;
  const cader = getCader(employee).toUpperCase();
  if (filter === "FC") return cader.startsWith("FC") || cader.includes("CONST");
  return cader === filter.toUpperCase();
}

function getBeltNumber(employee) {
  const value = employee["BELT NO"] || employee["BELT NO."] || employee.BELT_NO ||
    employee["Belt No"] || employee.BELT;
  if (value !== undefined && value !== null && !/^[-_]+$/.test(String(value).trim())) {
    return String(value).trim();
  }
  return String(employee.NAME || "").match(/\d{2,}/)?.[0] || "-";
}

/**
 * [COMPONENT] EmployeeFooterManager — कर्मचारी जोड़ने, हटाने व त्वरित खोज की प्रबंधन पट्टी
 */
export default function EmployeeFooterManager({
  records,
  activeProfile,
  setEditingEmployee,
  onSaveSmartEmployee,
  onRemoveEmployee,
  onDirectExcelConnect,
  fileName,
  language = "hi"
}) {
  const [isSmartFormOpen, setIsSmartFormOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState(null);
  const [search, setSearch] = useState("");
  const [postFilter, setPostFilter] = useState("ALL");
  const [employeeToRemove, setEmployeeToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState(REMOVE_REASONS[0]);
  const english = language === "en";

  // [FILTER] Search and post filter for quick picker modal
  const searchResults = useMemo(() => {
    const query = search.trim();
    return records.filter((employee) => {
      if (!matchesPostFilter(employee, postFilter)) return false;
      if (!query) return true;
      return matchesEmployeeSearch(employee, query, ["NAME", "BELT NO", "CADER", "POSTING"]);
    }).slice(0, 30);
  }, [records, search, postFilter]);

  const openPicker = (mode) => {
    setSearch("");
    setPostFilter("ALL");
    setEmployeeToRemove(null);
    setRemoveReason(REMOVE_REASONS[0]);
    setPickerMode(mode);
  };

  const handleRemoveEmployee = () => {
    if (!employeeToRemove) return;
    if (!window.confirm(english
      ? `Remove selected employee from active records due to "${removeReason}"?`
      : `क्या आप चयनित कर्मचारी को "${removeReason}" कारण से मुख्य रिकॉर्ड से हटाना चाहते हैं?`)) return;
    if (!onRemoveEmployee(employeeToRemove, removeReason)) return;
    setPickerMode(null);
    setEmployeeToRemove(null);
    alert(english
      ? `✔ Employee moved to Archive. Reason: ${removeReason}`
      : `✔ कर्मचारी को मुख्य सूची से हटाकर अभिलेख में दर्ज कर दिया गया। कारण: ${removeReason}`);
  };

  return (
    <>
      <div className="employee-quick-management">
        <div className="quick-mgmt-row">
          <div>
            <strong className="quick-mgmt-title">
              👮 {english ? "Employee Quick Management" : "कर्मचारी त्वरित प्रबंधन"}
            </strong>
            <span className="quick-mgmt-subtitle">
              {records.length} {english ? "employees • Quick actions" : "कर्मचारी • तेज़ी से प्रबंधन करें"}
            </span>
          </div>
          <div className="quick-mgmt-actions">
            <button type="button" onClick={onDirectExcelConnect} className="quick-btn quick-btn-sky">
              📂 {fileName ? (english ? "Replace Master Sheet" : "Master Sheet बदलें") : (english ? "Upload Master Sheet" : "Master Sheet अपलोड करें")}
            </button>
            <button type="button" onClick={() => setIsSmartFormOpen(true)} className="quick-btn quick-btn-green">
              ➕ {english ? "Add New Employee" : "नया कर्मचारी जोड़ें"}
            </button>
            <button type="button" onClick={() => openPicker("REMOVE")} className="quick-btn quick-btn-red">
              🗑️ {english ? "Remove Employee" : "कर्मचारी हटाएं"}
            </button>
            <button type="button" onClick={() => openPicker("SEARCH")} className="quick-btn quick-btn-blue">
              🔍 {english ? "Quick Search & Edit" : "खोजें एवं संपादित करें"}
            </button>
          </div>
        </div>
      </div>

      {pickerMode && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerMode(null); }}
          className="picker-backdrop"
        >
          <section className="picker-dialog">
            <div className="picker-header">
              <h2 className="picker-title">
                {pickerMode === "REMOVE"
                  ? (english ? "🗑️ Remove Employee" : "🗑️ कर्मचारी हटाएं")
                  : (english ? "🔍 Search & Edit Employee" : "🔍 कर्मचारी खोजें और संपादित करें")}
              </h2>
              <button type="button" onClick={() => setPickerMode(null)} aria-label="Close" className="picker-close">✕</button>
            </div>
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setEmployeeToRemove(null); }}
              placeholder={english ? "Search by name or belt no..." : "नाम या बेल्ट नं. से खोजें..."}
              className="picker-search"
            />
            <div role="group" aria-label="Filter by post" className="picker-filter-row">
              {POST_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  aria-pressed={postFilter === filter}
                  onClick={() => { setPostFilter(filter); setEmployeeToRemove(null); }}
                  className={`picker-filter-chip ${postFilter === filter ? "is-active" : ""}`}
                >
                  {filter}
                </button>
              ))}
            </div>
            {pickerMode === "REMOVE" && (
              <label className="picker-reason-label">
                {english ? "Reason" : "हटाने का कारण"}
                <select value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} className="picker-reason-select">
                  {REMOVE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </label>
            )}
            <div className="picker-results-box">
              {searchResults.length ? searchResults.map((employee, index) => {
                const belt = getBeltNumber(employee);
                const cader = getCader(employee);
                const showBelt = isBeltRank(cader) && belt !== "-";
                const selected = employeeToRemove?._uid
                  ? employeeToRemove._uid === employee._uid
                  : employeeToRemove === employee;
                return (
                  <button
                    type="button"
                    key={employee._uid || `${employee.NAME}-${belt}-${index}`}
                    onClick={() => {
                      if (pickerMode === "SEARCH") {
                        setPickerMode(null);
                        setEditingEmployee(employee);
                      } else {
                        setEmployeeToRemove(employee);
                      }
                    }}
                    className={`picker-result-row ${selected ? "is-selected" : ""}`}
                  >
                    <span className="picker-result-meta">
                      <strong className="picker-badge-cader">{cader || "—"}</strong>
                      {showBelt && <strong className="picker-badge-belt">{belt}</strong>}
                      <span className="picker-name-wrap">
                        <strong className="picker-name-text"><HindiText text={employee.NAME} /></strong>
                        <small className="picker-posting-text">
                          {english ? "Posting" : "पदस्थापन"}: <HindiText text={employee.POSTING} />
                        </small>
                      </span>
                    </span>
                    <span className={`picker-action-tag ${selected ? "is-selected" : ""}`}>
                      {pickerMode === "SEARCH" ? (english ? "✏️ Select" : "✏️ चुनें") : selected ? (english ? "✓ Selected" : "✓ चुना गया") : (english ? "Select" : "चुनें")}
                    </span>
                  </button>
                );
              }) : <p className="picker-empty">{english ? "No employee found." : "कोई कर्मचारी नहीं मिला।"}</p>}
            </div>
            {pickerMode === "REMOVE" && (
              <div className="picker-footer">
                <button type="button" onClick={() => setPickerMode(null)} className="picker-cancel-btn">{english ? "Cancel" : "रद्द करें"}</button>
                <button type="button" onClick={handleRemoveEmployee} disabled={!employeeToRemove} className="picker-confirm-btn">🗑️ {english ? "Confirm Remove" : "हटाने की पुष्टि करें"}</button>
              </div>
            )}
          </section>
        </div>
      )}

      {isSmartFormOpen && (
        <NewEmployeeSmartForm
          records={records}
          activeProfile={activeProfile}
          onSaveAll={onSaveSmartEmployee}
          onClose={() => setIsSmartFormOpen(false)}
        />
      )}
    </>
  );
}
