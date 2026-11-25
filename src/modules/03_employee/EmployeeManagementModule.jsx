import { useMemo, useState } from "react";
import EmployeeActionRow from "../../core/EmployeeActionRow";
import { devToHindi } from "../../utils/devlysConverter";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import EmployeeFooterManager from "../../core/EmployeeFooterManager";

export default function EmployeeManagementModule({
  records = [],
  activeProfile,
  editingEmployee,
  setEditingEmployee,
  onUpdateEmployee,
  onSaveSmartEmployee,
  onRemoveEmployee,
  onDirectExcelConnect,
  fileName,
  onEditEmployee,
  onArchiveEmployee
}) {
  const [query, setQuery] = useState("");
  const employees = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((employee) => !normalized || [
      devToHindi(employee.NAME),
      devToHindi(employee["FATHER NAME"]),
      employee.CADER,
      employee["BELT NO"],
      employee.POSTING
    ].some((value) => String(value || "").toLocaleLowerCase().includes(normalized)));
  }, [records, query]);
  return (
    <section className="employee-management" style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "14px", padding: "18px" }}>
      <h2>कर्मचारी प्रबंधन (Employee Management)</h2>
      <p>कर्मचारी पंक्ति पर क्लिक या राइट-क्लिक करके Update, Transfer, Relieve या Service Slip चुनें।</p>
      <EmployeeFooterManager
        records={records}
        activeProfile={activeProfile}
        editingEmployee={editingEmployee}
        setEditingEmployee={setEditingEmployee}
        onUpdateEmployee={onUpdateEmployee}
        onSaveSmartEmployee={onSaveSmartEmployee}
        onRemoveEmployee={onRemoveEmployee}
        onDirectExcelConnect={onDirectExcelConnect}
        fileName={fileName}
      />
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="नाम, बेल्ट नं., पद या पदस्थापन खोजें" style={{ width: "100%", padding: "10px", marginBottom: "12px" }} />
      <div className="table-responsive-box" style={{ maxHeight: "68vh", overflow: "auto" }}>
        <table className="employee-responsive-table" style={{ minWidth: "1100px", whiteSpace: "nowrap" }}>
          <thead><tr>{["S.N.", "Name", "Father Name", "Post", "Belt No.", "Posting DOB", "Posting Place", "Without DOB", "Education", "Date of Birth", "DOJ", "DOC", "Mobile Number"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{employees.map((employee, index) => (
            <EmployeeActionRow
              key={employee._uid || index}
              employee={employee}
              responsiveDetails
              onAction={(action, selected) => {
                if (action === "UPDATE" || action === "TRANSFER") onEditEmployee?.(selected);
                if (action === "RELIEVE") {
                  const reason = window.prompt("Relieve / Retire / Death / Deputation का कारण लिखें:");
                  if (reason) onArchiveEmployee?.(selected, reason);
                }
                if (action === "SERVICE_SLIP") openEmployeeServiceSlip(selected);
              }}
            >
              <td>{index + 1}</td>
              <td>{devToHindi(employee.NAME)}</td>
              <td>{devToHindi(employee["FATHER NAME"])}</td>
              <td>{employee.CADER || "-"}</td>
              <td>{employee["BELT NO"] || "-"}</td>
              <td>{employee["POSTING DOB NO"] || "-"}</td>
              <td>{devToHindi(employee.POSTING) || "-"}</td>
              <td>{employee["WITHOUT DOB"] || "-"}</td>
              <td>{employee.EDUCATION || "-"}</td>
              <td>{employee["DATE OF BIRTH"] || "-"}</td>
              <td>{employee["DATE OF JOINING"] || "-"}</td>
              <td>{employee.DOC || employee["DATE OF CONFIRMATION"] || "-"}</td>
              <td>{employee["MOBILE NO 1"] || employee["MOBILE NO"] || employee.MOBILE || "-"}</td>
            </EmployeeActionRow>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
