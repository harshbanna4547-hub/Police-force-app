import Sidebar from "./Sidebar";

export default function SidebarNav({
  portalData,
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  authUser,
  authProfile,
  onLogout,
  cloudConfigured
}) {
  return (
    <Sidebar
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeView={activeView}
      setActiveView={setActiveView}
      modules={modules}
      activeProfile={portalData.activeProfile}
      authUser={authUser}
      authProfile={authProfile}
      cloudConfigured={cloudConfigured}
      syncStatus={portalData.cloudSyncStatus}
      syncing={portalData.isCloudSyncing}
      onCloudSync={portalData.onCloudSync}
      onLogout={onLogout}
      onDownloadReports={portalData.downloadReports}
    />
  );
}
