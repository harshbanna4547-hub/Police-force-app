import TopHeader from "./TopHeader";
import StatCards from "./StatCards";

export default function TopHeaderAndStats({
  portalData,
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen
}) {
  const {
    activeProfile,
    fileName,
    records,
    attRecords,
    depRecords,
    totalSanc,
    hasUnsavedChanges,
    persistenceError,
    lanSyncStatus,
    isExportingMaster,
    onDirectExcelConnect,
    onSaveToExcel,
    onRemoveDistrictData,
    onExportMasterFile
  } = portalData;

  return (
    <>
      <TopHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        activeProfile={activeProfile}
        fileName={fileName}
        onDirectExcelConnect={onDirectExcelConnect}
        onSaveToExcel={onSaveToExcel}
        onRemoveDistrictData={onRemoveDistrictData}
        hasUnsavedChanges={hasUnsavedChanges}
        persistenceError={persistenceError}
        lanSyncStatus={lanSyncStatus}
        hasData={records.length > 0}
        onExportMasterFile={onExportMasterFile}
        isExportingMaster={isExportingMaster}
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
