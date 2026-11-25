import TopHeader from "./TopHeader";
import StatCards from "./StatCards";

/**
 * [COMPONENT] TopHeaderAndStats — शीर्ष नेविगेशन बार एवं केवल होम डैशबोर्ड पर KPI सारांश बैंड
 */
export default function TopHeaderAndStats({
  portalData,
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen,
  currentDistrict,
  language
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
        currentDistrict={currentDistrict}
        language={language}
      />
      {activeView === "HOME" && (
        <StatCards
          totalSanc={totalSanc}
          activeCount={records.length}
          attCount={attRecords.length}
          depCount={depRecords.length}
          setActiveView={setActiveView}
          currentDistrict={currentDistrict}
          language={language}
        />
      )}
    </>
  );
}
