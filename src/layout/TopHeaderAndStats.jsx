import TopHeader from "./TopHeader";

/**
 * [COMPONENT] TopHeaderAndStats — शीर्ष नेविगेशन बार (4-KPI बैंड को StrengthModule में स्थानांतरित किया गया है)
 */
export default function TopHeaderAndStats({
  sidebarOpen,
  setSidebarOpen,
  currentDistrict,
  language
}) {
  return (
    <TopHeader
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      currentDistrict={currentDistrict}
      language={language}
    />
  );
}
