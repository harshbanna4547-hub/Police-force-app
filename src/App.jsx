import { useState } from "react";
import EmployeeFooterManager from "./core/EmployeeFooterManager";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./layout/SidebarNav";
import TopHeaderAndStats from "./layout/TopHeaderAndStats";
import ModuleCardGrid from "./layout/ModuleCardGrid";
import usePortalData from "./core/usePortalData";
import { MODULES_CONFIG } from "./modules/moduleRegistry.js";
import { createDistrictSelection } from "./core/districtAuth.js";

const DEFAULT_DISTRICT = { id: "CHITTORGARH", name: "Chittorgarh" };
const ACTIVE_DISTRICT_STORAGE_KEY = "police_active_district";

function readActiveDistrict() {
  try {
    const rawDistrict = localStorage.getItem(ACTIVE_DISTRICT_STORAGE_KEY);
    if (!rawDistrict) return DEFAULT_DISTRICT;
    let savedDistrict;
    try {
      savedDistrict = JSON.parse(rawDistrict);
    } catch {
      return createDistrictSelection(rawDistrict);
    }
    if (typeof savedDistrict === "string") return createDistrictSelection(savedDistrict);
    if (savedDistrict?.id && savedDistrict?.name) {
      return { id: String(savedDistrict.id), name: String(savedDistrict.name) };
    }
  } catch (error) {
    console.error("Saved district selection could not be read:", error);
  }
  return DEFAULT_DISTRICT;
}

export default function App() {
  const [currentDistrict, setCurrentDistrict] = useState(readActiveDistrict);
  const [activeView, setActiveView] = useState("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const portalData = usePortalData({
    districtId: currentDistrict.id,
    districtName: currentDistrict.name
  });
  const modules = MODULES_CONFIG;

  const handleDistrictChange = (district) => {
    if (!district?.id || !district?.name) return;
    const nextDistrict = { id: String(district.id), name: String(district.name).trim() };
    try {
      localStorage.setItem(ACTIVE_DISTRICT_STORAGE_KEY, JSON.stringify(nextDistrict));
    } catch (error) {
      console.error("District selection could not be saved:", error);
    }
    setCurrentDistrict(nextDistrict);
  };

  if (!portalData.isDistrictDataReady) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Segoe UI, sans-serif" }}>जिला डेटा सुरक्षित स्टोरेज से लोड हो रहा है…</main>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F4F7FB", fontFamily: "Segoe UI, sans-serif" }}>
      <SidebarNav
        portalData={portalData}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        modules={modules}
        currentDistrict={currentDistrict}
        onDistrictChange={handleDistrictChange}
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
          {activeView === "HOME" ? (
            <ModuleCardGrid modules={modules} onOpenModule={setActiveView} />
          ) : (
            <PortalModuleContent
              activeView={activeView}
              portalData={portalData}
              modules={modules}
            />
          )}
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
