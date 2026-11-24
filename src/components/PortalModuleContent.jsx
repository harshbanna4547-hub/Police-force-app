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
    onLoadExcelBlob
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
    POSTING: { records, devToHindi },
    BHARTI: { records, setRecords, devToHindi },
    TRAINING: { allSheets, setAllSheets, devToHindi },
    LEAVE: { plLeaveRows, setPlLeaveRows, devToHindi },
    PL300: { plSummary: reports.plSummary, devToHindi },
    INCREMENT: { allSheets, setAllSheets, devToHindi },
    ACP: { records, devToHindi },
    PUNISHMENT: { allSheets, setAllSheets, devToHindi },
    PROMOTION: { records, setRecords, allSheets, setAllSheets, devToHindi },
    SENIORITY: { seniorityList: reports.seniorityList, devToHindi },
    ROSTER: { reports, devToHindi },
    STORAGE: { activeProfile, records, allSheets, onLoadExcelBlob }
  };
  const ActiveModule = selectedModule.component;

  return <ActiveModule {...propsByModule[activeView]} />;
}
