import { useMemo, useState } from "react";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import EmployeeFooterManager from "../../core/EmployeeFooterManager";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import SmartEmployeeTable from "../../components/shared/SmartEmployeeTable";
import { filterEmployeesList, getEmployeeExportRows } from "./employeeLogic";
import "./employee.css";

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
  onArchiveEmployee,
  language = "hi"
}) {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("ALL");
  const english = language === "en";

  const employees = useMemo(
    () => filterEmployeesList(records, query, gender),
    [records, query, gender]
  );

  const exportRows = useMemo(
    () => getEmployeeExportRows(employees),
    [employees]
  );

  const handleAction = (action, selected) => {
    if (action === "UPDATE") onEditEmployee?.(selected, "personal");
    if (action === "TRANSFER") onEditEmployee?.(selected, "posting");
    if (action === "RELIEVE") {
      const reason = window.prompt(english
        ? "Enter reason for Relieve / Retire / Death / Deputation:"
        : "Relieve / Retire / Death / Deputation का कारण लिखें:");
      if (reason) onArchiveEmployee?.(selected, reason);
    }
    if (action === "SERVICE_SLIP") openEmployeeServiceSlip(selected);
  };

  return (
    <section className="employee-management">
      <ModuleHeaderToolbar
        title={english ? "👮 Employee Management" : "👮 कर्मचारी प्रबंधन"}
        search={query}
        onSearchChange={setQuery}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName="Employee_Master_List"
        language={language}
      />

      <p className="employee-management-hint">
        {english
          ? "Click or right-click a row (or tap name on mobile) for Update, Transfer, Relieve, or Service Slip."
          : "कर्मचारी पंक्ति पर क्लिक या राइट-क्लिक करके Update, Transfer, Relieve या Service Slip चुनें।"}
      </p>

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
        language={language}
      />

      <SmartEmployeeTable
        employees={employees}
        onAction={handleAction}
        caption={english ? "Employee Master List" : "कर्मचारी मुख्य सूची"}
        language={language}
      />
    </section>
  );
}
