import { devToHindi } from "../utils/devlysConverter";
import ModuleCardGrid from "../layout/ModuleCardGrid";

export default function PortalModuleContent({
  activeView,
  setActiveView,
  portalData,
  modules,
  onToggleModule
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
    reports,
    setEditingEmployee,
    onLoadExcelBlob
  } = portalData;

  if (activeView === "HOME") {
    return (
      <ModuleCardGrid
        modules={modules}
        setActiveView={setActiveView}
        onToggleModule={onToggleModule}
      />
    );
  }

  const selectedModule = modules.find((module) => module.id === activeView && module.enabled);
  if (!selectedModule) {
    return (
      <ModuleCardGrid
        modules={modules}
        setActiveView={setActiveView}
        onToggleModule={onToggleModule}
      />
    );
  }

  const propsByModule = {
    STRENGTH: { records, sanctioned, setSanctioned, devToHindi, onEditEmployee: setEditingEmployee },
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
