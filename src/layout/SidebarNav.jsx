import Sidebar from "./Sidebar";

export default function SidebarNav({
  portalData,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules
}) {
  return (
    <Sidebar
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeView={activeView}
      setActiveView={setActiveView}
      modules={modules}
      activeProfile={portalData.activeProfile}
      onDownloadReports={portalData.downloadReports}
    />
  );
}
