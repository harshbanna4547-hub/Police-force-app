import { useState } from "react";
import EmployeeEditModal from "../core/EmployeeEditModal";

/**
 * [COMPONENT] PortalModuleContent — सक्रिय मॉड्यूल को रेंडर करता है एवं वैश्विक संपादन मोडल जोड़ता है
 */
export default function PortalModuleContent({
  activeView,
  setActiveView,
  portalData,
  districtId,
  currentDistrict,
  modules,
  language = "hi"
}) {
  const [editInitialTab, setEditInitialTab] = useState("personal");
  const {
    activeProfile,
    allSheets,
    setAllSheets,
    records,
    setRecords,
    attRecords,
    setAttRecords,
    depRecords,
    setDepRecords,
    totalSanc,
    plLeaveRows,
    setPlLeaveRows,
    sanctioned,
    setSanctioned,
    unitRankSanc,
    setUnitRankSanc,
    onSaveSanctioned,
    onSaveUnitRankSanc,
    reports,
    editingEmployee,
    setEditingEmployee,
    updateEmployeeRecord,
    addNewEmployee,
    onLoadExcelBlob,
    fileName,
    hasUnsavedChanges,
    onSaveToExcel,
    onExportMasterFile,
    isExportingMaster,
    onRemoveDistrictData,
    removeEmployee
  } = portalData;

  const openEmployeeEditor = (employee, tab = "personal") => {
    setEditInitialTab(tab);
    setEditingEmployee(employee);
  };

  if (activeView === "HOME") {
    return <p className="module-muted-text">मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
  }

  const selectedModule = modules.find((module) => module.id === activeView && module.enabled);
  if (!selectedModule) {
    return <p className="module-muted-text">मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
  }

  const propsByModule = {
    STRENGTH: {
      records,
      sanctioned,
      setSanctioned,
      unitRankSanc,
      setUnitRankSanc,
      onSaveSanctioned,
      onSaveUnitRankSanc,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      totalSanc,
      attCount: attRecords.length,
      depCount: depRecords.length,
      setActiveView,
      currentDistrict: currentDistrict || { id: districtId, name: activeProfile },
      language
    },
    TRANSFER: {
      records,
      setRecords,
      allSheets,
      setAllSheets,
      attRecords,
      setAttRecords,
      depRecords,
      setDepRecords,
      language
    },
    BHARTI: { records, setRecords, allSheets, setAllSheets, language },
    TRAINING: { records, allSheets, setAllSheets, activeProfile, language },
    LEAVE: { records, plLeaveRows, setPlLeaveRows, allSheets, setAllSheets, activeProfile, language },
    INCREMENT: { records, allSheets, setAllSheets, language },
    ACP: { records, allSheets, setAllSheets, language },
    PUNISHMENT: { records, allSheets, setAllSheets, language },
    PROMOTION: { records, setRecords, allSheets, setAllSheets, language },
    SENIORITY: { seniorityList: reports.seniorityList, records, language },
    ROSTER: { records, reports, plSummary: reports.plSummary, allSheets, setAllSheets, language },
    REPORTS: { records, language },
    STORAGE: {
      activeProfile,
      records,
      allSheets,
      onLoadExcelBlob,
      onRestoreBackup: portalData.onRestoreBackup,
      fileName,
      hasData: records.length > 0,
      hasUnsavedChanges,
      onSaveToExcel,
      onExportMasterFile,
      isExportingMaster,
      onRemoveDistrictData,
      language
    },
    POSTING: {
      records,
      sanctioned,
      unitRankSanc,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      language
    },
    EMPLOYEES: {
      records,
      activeProfile,
      editingEmployee,
      setEditingEmployee: openEmployeeEditor,
      onUpdateEmployee: updateEmployeeRecord,
      onSaveSmartEmployee: addNewEmployee,
      onRemoveEmployee: removeEmployee,
      onDirectExcelConnect: portalData.onDirectExcelConnect,
      fileName,
      onEditEmployee: openEmployeeEditor,
      onArchiveEmployee: removeEmployee,
      language
    },
    ARCHIVE: { records, allSheets, onArchiveEmployee: removeEmployee, language },
    DEV_SERVICES: { districtId, portalData, language }
  };
  const ActiveModule = selectedModule.component;

  return (
    <>
      <ActiveModule {...propsByModule[activeView]} />
      {editingEmployee && (
        <EmployeeEditModal
          key={`${editingEmployee._uid || editingEmployee.NAME}-${editInitialTab}`}
          employee={editingEmployee}
          initialTab={editInitialTab}
          onSave={updateEmployeeRecord}
          onClose={() => setEditingEmployee(null)}
        />
      )}
    </>
  );
}
