import { useState } from "react";
import EmployeeFooterManager from "./core/EmployeeFooterManager";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./layout/SidebarNav";
import TopHeaderAndStats from "./layout/TopHeaderAndStats";
import usePortalData from "./core/usePortalData";
import { MODULES_CONFIG } from "./modules/moduleRegistry";

export default function App() {
  const portalData = usePortalData();
  const [activeView, setActiveView] = useState("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [enabledModuleIds, setEnabledModuleIds] = useState(() =>
    Object.fromEntries(MODULES_CONFIG.map((module) => [module.id, module.enabled]))
  );
  const modules = MODULES_CONFIG.map((module) => ({
    ...module,
    enabled: Boolean(enabledModuleIds[module.id])
  }));
  const onToggleModule = (moduleId, enabled) => {
    setEnabledModuleIds((current) => ({ ...current, [moduleId]: enabled }));
    if (!enabled && activeView === moduleId) setActiveView("HOME");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F4F7FB", fontFamily: "Segoe UI, sans-serif" }}>
      <SidebarNav
        portalData={portalData}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        <TopHeaderAndStats
          portalData={portalData}
          activeView={activeView}
          setActiveView={setActiveView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main style={{ padding: "12px 24px 24px", flex: 1 }}>
          <PortalModuleContent
            activeView={activeView}
            setActiveView={setActiveView}
            portalData={portalData}
            modules={modules}
            onToggleModule={onToggleModule}
          />
        </main>
        <EmployeeFooterManager
          records={portalData.records}
          activeProfile={portalData.activeProfile}
          editingEmployee={portalData.editingEmployee}
          setEditingEmployee={portalData.setEditingEmployee}
          onUpdateEmployee={portalData.updateEmployeeRecord}
          onSaveSmartEmployee={portalData.addNewEmployee}
          onRemoveEmployee={portalData.removeEmployee}
          onExportMasterFile={portalData.onExportMasterFile}
          isExportingMaster={portalData.isExportingMaster}
        />
      </div>
    </div>
  );
}
