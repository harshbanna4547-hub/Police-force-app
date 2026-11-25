import { useMemo, useState } from "react";
import EmployeeEditModal from "./EmployeeEditModal";
import NewEmployeeSmartForm from "./NewEmployeeSmartForm";
import { devToHindi } from "../utils/devlysConverter";

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

export default function EmployeeFooterManager({
  records,
  activeProfile,
  editingEmployee,
  setEditingEmployee,
  onUpdateEmployee,
  onSaveSmartEmployee,
  onRemoveEmployee,
  onDirectExcelConnect,
  fileName
}) {
  const [isSmartFormOpen, setIsSmartFormOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState(null);
  const [search, setSearch] = useState("");
  const [postFilter, setPostFilter] = useState("ALL");
  const [employeeToRemove, setEmployeeToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState(REMOVE_REASONS[0]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return records.filter((employee) => {
      if (!matchesPostFilter(employee, postFilter)) return false;
      if (!query) return true;
      const name = devToHindi(employee.NAME).toLocaleLowerCase();
      const belt = String(getBeltNumber(employee)).toLocaleLowerCase();
      return name.includes(query) || belt.includes(query);
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
    const employeeName = devToHindi(employeeToRemove.NAME) || "चयनित कर्मचारी";
    if (!window.confirm(`क्या आप ${employeeName} को "${removeReason}" कारण से मुख्य रिकॉर्ड से हटाना चाहते हैं?`)) return;
    if (!onRemoveEmployee(employeeToRemove, removeReason)) return;
    setPickerMode(null);
    setEmployeeToRemove(null);
    alert(`✔ ${employeeName} को मुख्य कर्मचारी सूची से हटा दिया गया। कारण: ${removeReason}`);
  };

  return (
    <>
        <footer className="employee-quick-management" style={{ margin: "0 0 18px", padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(115deg, #0B1E3D, #173D73)", boxShadow: "0 8px 22px rgba(11,30,61,0.18)", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <strong style={{ display: "block", fontSize: "0.98rem" }}>👮 Employee Quick Management</strong>
              <span style={{ display: "block", marginTop: "3px", color: "#BFDBFE", fontSize: "0.8rem" }}>{records.length} कर्मचारी • तेज़ी से प्रबंधन करें</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button
                type="button"
                onClick={onDirectExcelConnect}
                style={{ border: 0, borderRadius: "8px", padding: "9px 12px", background: "#0EA5E9", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
              >
                📂 {fileName ? "Replace Master Sheet" : "Upload Master Sheet"}
              </button>
              <button
                type="button"
                onClick={() => setIsSmartFormOpen(true)}
                style={{ border: 0, borderRadius: "8px", padding: "9px 12px", background: "#16A34A", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
              >
                ➕ Add New Employee
              </button>
              <button type="button" onClick={() => openPicker("REMOVE")} style={{ border: 0, borderRadius: "8px", padding: "9px 12px", background: "#DC2626", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                🗑️ Remove Employee
              </button>
              <button type="button" onClick={() => openPicker("SEARCH")} style={{ border: 0, borderRadius: "8px", padding: "9px 12px", background: "#2563EB", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                🔍 Quick Search &amp; Edit
              </button>
            </div>
          </div>
        </footer>

      {pickerMode && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerMode(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <section style={{ width: "100%", maxWidth: "620px", maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: "12px", padding: "18px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, color: "#0B1E3D", fontSize: "1.1rem" }}>
                {pickerMode === "REMOVE" ? "🗑️ कर्मचारी हटाएं" : "🔍 कर्मचारी खोजें और संपादित करें"}
              </h2>
              <button type="button" onClick={() => setPickerMode(null)} aria-label="बंद करें" style={{ border: 0, background: "transparent", fontSize: "1.35rem", cursor: "pointer", color: "#475569" }}>✕</button>
            </div>
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setEmployeeToRemove(null); }}
              placeholder="नाम या बेल्ट नं. से खोजें..."
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "0.95rem", marginBottom: "10px" }}
            />
            <div role="group" aria-label="पद के अनुसार फ़िल्टर" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {POST_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  aria-pressed={postFilter === filter}
                  onClick={() => { setPostFilter(filter); setEmployeeToRemove(null); }}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${postFilter === filter ? "#1D63DC" : "#CBD5E1"}`,
                    borderRadius: "16px",
                    background: postFilter === filter ? "#1D63DC" : "#fff",
                    color: postFilter === filter ? "#fff" : "#334155",
                    fontSize: "0.78rem",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
            {pickerMode === "REMOVE" && (
              <label style={{ display: "block", marginBottom: "10px", color: "#334155", fontWeight: "bold", fontSize: "0.88rem" }}>
                हटाने का कारण
                <select value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} style={{ display: "block", width: "100%", marginTop: "5px", padding: "9px", border: "1px solid #CBD5E1", borderRadius: "7px", background: "#fff" }}>
                  {REMOVE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </label>
            )}
            <div style={{ maxHeight: "42vh", overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: "8px" }}>
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
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "9px 11px", border: 0, borderBottom: "1px solid #E2E8F0", background: selected ? "#DBEAFE" : "#fff", cursor: "pointer" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", minWidth: 0 }}>
                      <strong style={{ padding: "3px 7px", borderRadius: "5px", background: "#E0E7FF", color: "#3730A3", fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                        {cader || "—"}
                      </strong>
                      {showBelt && (
                        <strong style={{ padding: "3px 7px", borderRadius: "5px", background: "#FEF3C7", color: "#92400E", fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                          {belt}
                        </strong>
                      )}
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: "#0F172A" }}>{devToHindi(employee.NAME) || "(नाम नहीं)"}</strong>
                        <small style={{ display: "block", color: "#64748B" }}>पदस्थापन: {devToHindi(employee.POSTING) || "-"}</small>
                      </span>
                    </span>
                    <span style={{ color: selected ? "#1D4ED8" : "#15803D", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {pickerMode === "SEARCH" ? "✏️ चुनें" : selected ? "✓ चुना गया" : "चुनें"}
                    </span>
                  </button>
                );
              }) : <p style={{ margin: 0, padding: "16px", color: "#64748B", textAlign: "center" }}>कोई कर्मचारी नहीं मिला।</p>}
            </div>
            {pickerMode === "REMOVE" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                <button type="button" onClick={() => setPickerMode(null)} style={{ padding: "8px 14px", border: "1px solid #CBD5E1", borderRadius: "7px", background: "#fff", cursor: "pointer" }}>रद्द करें</button>
                <button type="button" onClick={handleRemoveEmployee} disabled={!employeeToRemove} style={{ padding: "8px 14px", border: 0, borderRadius: "7px", background: employeeToRemove ? "#DC2626" : "#94A3B8", color: "#fff", fontWeight: "bold", cursor: employeeToRemove ? "pointer" : "not-allowed" }}>🗑️ हटाने की पुष्टि करें</button>
              </div>
            )}
          </section>
        </div>
      )}

      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          onSave={onUpdateEmployee}
          onClose={() => setEditingEmployee(null)}
        />
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
