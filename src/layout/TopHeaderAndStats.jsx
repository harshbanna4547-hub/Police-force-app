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
    activeProfile,
    fileName,
    records,
    attRecords,
    depRecords,
    totalSanc,
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
        theme={theme}
        onThemeChange={onThemeChange}
        language={language}
        onLanguageChange={onLanguageChange}
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
