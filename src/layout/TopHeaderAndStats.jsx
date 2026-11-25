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
    records,
    attRecords,
    depRecords,
    totalSanc
  } = portalData;

  return (
    <>
      <TopHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        theme={theme}
        onThemeChange={onThemeChange}
        language={language}
        onLanguageChange={onLanguageChange}
      />
      {activeView === "HOME" && (
        <StatCards
          totalSanc={totalSanc}
          activeCount={records.length}
          attCount={attRecords.length}
          depCount={depRecords.length}
          setActiveView={setActiveView}
          language={language}
        />
      )}
    </>
  );
}
