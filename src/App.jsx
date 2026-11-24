import { useState } from "react";
import EmployeeFooterManager from "./core/EmployeeFooterManager";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./layout/SidebarNav";
import TopHeaderAndStats from "./layout/TopHeaderAndStats";
import usePortalData from "./core/usePortalData";
import { MODULES_CONFIG } from "./modules/moduleRegistry.js";
import { DistrictPoliceLoginScreen } from "./core/AuthAndCloudSync";
import { useDistrictAuth } from "./core/districtAuth";

export default function App() {
  const auth = useDistrictAuth();
  const portalData = usePortalData({
    districtId: auth.profile?.district_id || "",
    districtName: auth.profile?.district_name || "",
    authUserId: auth.user?.id || ""
  });
  const [activeView, setActiveView] = useState("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const modules = MODULES_CONFIG;
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setActiveView("HOME");
    } catch (error) {
      console.error("District logout failed:", error);
      alert(`लॉगआउट असफल हुआ: ${error.message}`);
    }
  };

  if (auth.loading) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Segoe UI, sans-serif" }}>लॉगिन स्थिति जाँची जा रही है…</main>;
  }
  if (!auth.profile) {
    return (
      <DistrictPoliceLoginScreen
        loading={auth.loading}
        configured={auth.configured}
        error={auth.error}
        onSignIn={auth.signIn}
      />
    );
  }
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
        authUser={auth.user}
        authProfile={auth.profile}
        cloudConfigured={auth.configured}
        onLogout={handleLogout}
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
