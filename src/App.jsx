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
  const modules = MODULES_CONFIG;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F4F7FB", fontFamily: "Segoe UI, sans-serif" }}>
      <SidebarNav
        portalData={portalData}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        modules={modules}
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
            portalData={portalData}
            modules={modules}
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
