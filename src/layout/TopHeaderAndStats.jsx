import TopHeader from "./TopHeader";
import StatCards from "./StatCards";

export default function TopHeaderAndStats({
  portalData,
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen,
  theme,
  onThemeChange,
  language,
  onLanguageChange
}) {
  const {
    fileName,
    records,
    attRecords,
    depRecords,
    totalSanc,
    isOneDriveConnected,
    isCloudSyncing,
    cloudSyncStatus,
    onConnectOneDriveDb
  } = portalData;

  return (
    <>
      <TopHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        fileName={fileName}
        theme={theme}
        onThemeChange={onThemeChange}
        language={language}
        onLanguageChange={onLanguageChange}
        isOneDriveConnected={isOneDriveConnected}
        isCloudSyncing={isCloudSyncing}
        cloudSyncStatus={cloudSyncStatus}
        onConnectOneDriveDb={onConnectOneDriveDb}
      />
      <StatCards
        totalSanc={totalSanc}
        activeCount={records.length}
        attCount={attRecords.length}
        depCount={depRecords.length}
        activeView={activeView}
        setActiveView={setActiveView}
      />
    </>
  );
}
