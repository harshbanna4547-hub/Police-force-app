import { useState } from "react";
import EmployeeFooterManager from "./components/EmployeeFooterManager";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./components/SidebarNav";
import TopHeaderAndStats from "./components/TopHeaderAndStats";
import usePortalData from "./hooks/usePortalData";

export default function App() {
  const portalData = usePortalData();
  const [activeView, setActiveView] = useState("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

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
