import { devToHindi } from "../utils/devlysConverter";

export default function PortalModuleContent({
  activeView,
  portalData,
  modules
}) {
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
    plLeaveRows,
    setPlLeaveRows,
    sanctioned,
    setSanctioned,
    unitRankSanc,
    setUnitRankSanc,
    onSaveSanctioned,
    onSaveUnitRankSanc,
    reports,
    setEditingEmployee,
    onLoadExcelBlob,
    fileName,
    hasData,
    hasUnsavedChanges,
    onDirectExcelConnect,
    onSaveToExcel,
    onExportMasterFile,
    isExportingMaster,
    onRemoveDistrictData
  } = portalData;

  if (activeView === "HOME") {
    return <p style={{ margin: "8px 0", color: "#64748B" }}>मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
  }

  const selectedModule = modules.find((module) => module.id === activeView && module.enabled);
  if (!selectedModule) {
    return <p style={{ margin: "8px 0", color: "#64748B" }}>मॉड्यूल खोलने के लिए बाईं ओर साइडबार से चुनें।</p>;
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
      devToHindi,
      onEditEmployee: setEditingEmployee
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
      devToHindi
    },
    BHARTI: { records, setRecords, allSheets, setAllSheets, devToHindi },
    TRAINING: { records, allSheets, setAllSheets, devToHindi },
    LEAVE: { records, plLeaveRows, setPlLeaveRows, allSheets, setAllSheets, devToHindi },
    INCREMENT: { records, allSheets, setAllSheets, devToHindi },
    ACP: { records, allSheets, setAllSheets, devToHindi },
    PUNISHMENT: { records, allSheets, setAllSheets, devToHindi },
    PROMOTION: { records, setRecords, allSheets, setAllSheets, devToHindi },
    SENIORITY: { seniorityList: reports.seniorityList, devToHindi },
    ROSTER: { records, reports, plSummary: reports.plSummary, allSheets, setAllSheets, devToHindi },
    REPORTS: { records, devToHindi },
    STORAGE: { activeProfile, records, allSheets, onLoadExcelBlob, fileName, hasData: records.length > 0, hasUnsavedChanges, onDirectExcelConnect, onSaveToExcel, onExportMasterFile, isExportingMaster, onRemoveDistrictData }
  };
  const ActiveModule = selectedModule.component;

  return <ActiveModule {...propsByModule[activeView]} />;
}
