import Sidebar from "./Sidebar";

export default function SidebarNav({
  portalData,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView
}) {
  return (
    <Sidebar
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeView={activeView}
      setActiveView={setActiveView}
      activeProfile={portalData.activeProfile}
      onDownloadReports={portalData.downloadReports}
    />
  );
}
