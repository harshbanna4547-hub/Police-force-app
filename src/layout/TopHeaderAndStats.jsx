import TopHeader from "./TopHeader";

/**
 * [COMPONENT] TopHeaderAndStats — शीर्ष नेविगेशन बार
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
