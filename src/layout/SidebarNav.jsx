import { useState } from "react";
import Sidebar from "./Sidebar";
import { DistrictSwitcherModal } from "../core/AuthAndCloudSync";

export default function SidebarNav({
  portalData,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  currentDistrict,
  onDistrictChange,
  lanSyncStatus
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleDistrictChange = (district) => {
    onDistrictChange(district);
    setSwitcherOpen(false);
    setActiveView("HOME");
  };

  return (
    <>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        modules={modules}
        activeProfile={portalData.activeProfile}
        currentDistrict={currentDistrict}
        lanSyncStatus={lanSyncStatus}
        onOpenDistrictSwitcher={() => setSwitcherOpen(true)}
      />
      {switcherOpen && (
        <DistrictSwitcherModal
          currentDistrict={currentDistrict}
          onClose={() => setSwitcherOpen(false)}
          onSelect={handleDistrictChange}
        />
      )}
    </>
  );
}
