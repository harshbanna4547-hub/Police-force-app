import { useEffect, useState } from "react";
import "./App.css";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./layout/SidebarNav";
import TopHeaderAndStats from "./layout/TopHeaderAndStats";
import ModuleCardGrid from "./layout/ModuleCardGrid";
import usePortalData from "./core/usePortalData";
import { MODULES_CONFIG } from "./modules/moduleRegistry.js";
import { createDistrictSelection } from "./core/districtAuth.js";

const DEFAULT_DISTRICT = { id: "CHITTORGARH", name: "Chittorgarh" };
const ACTIVE_DISTRICT_STORAGE_KEY = "police_active_district";

function readActiveDistrict() {
  try {
    const rawDistrict = localStorage.getItem(ACTIVE_DISTRICT_STORAGE_KEY);
    if (!rawDistrict) return DEFAULT_DISTRICT;
    let savedDistrict;
    try {
      savedDistrict = JSON.parse(rawDistrict);
    } catch {
      return createDistrictSelection(rawDistrict);
    }
    if (typeof savedDistrict === "string") return createDistrictSelection(savedDistrict);
    if (savedDistrict?.id && savedDistrict?.name) {
      return { id: String(savedDistrict.id), name: String(savedDistrict.name) };
    }
  } catch (error) {
    console.error("Saved district selection could not be read:", error);
  }
  return DEFAULT_DISTRICT;
}

export default function App() {
  const [currentDistrict, setCurrentDistrict] = useState(readActiveDistrict);
  const [activeView, setActiveView] = useState("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("police_portal_theme") === "dark" ? "dark" : "light";
    } catch (error) {
      console.error("Saved theme preference could not be read:", error);
      return "light";
    }
  });
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("police_portal_language") === "en" ? "en" : "hi";
    } catch (error) {
      console.error("Saved language preference could not be read:", error);
      return "hi";
    }
  });
  const portalData = usePortalData({
    districtId: currentDistrict.id,
    districtName: currentDistrict.name
  });
  const modules = MODULES_CONFIG;

  useEffect(() => {
    const syncSidebarToViewport = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener("resize", syncSidebarToViewport);
    return () => window.removeEventListener("resize", syncSidebarToViewport);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("police_portal_theme", theme);
    } catch (error) {
      console.error("Theme preference could not be saved:", error);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("police_portal_language", language);
    } catch (error) {
      console.error("Language preference could not be saved:", error);
    }
  }, [language]);

  const handleDistrictChange = (district) => {
    if (!district?.id || !district?.name) return;
    const nextDistrict = { id: String(district.id), name: String(district.name).trim() };
    try {
      localStorage.setItem(ACTIVE_DISTRICT_STORAGE_KEY, JSON.stringify(nextDistrict));
    } catch (error) {
      console.error("District selection could not be saved:", error);
    }
    setCurrentDistrict(nextDistrict);
  };

  if (!portalData.isDistrictDataReady) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Segoe UI, sans-serif" }}>जिला डेटा सुरक्षित स्टोरेज से लोड हो रहा है…</main>;
  }

  return (
    <div className="app-shell" data-theme={theme} style={{ display: "flex", minHeight: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#F4F7FB", fontFamily: "Segoe UI, sans-serif" }}>
      <SidebarNav
        portalData={portalData}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        modules={modules}
        currentDistrict={currentDistrict}
        onDistrictChange={handleDistrictChange}
        lanSyncStatus={portalData.lanSyncStatus}
        language={language}
      />
      <div className="app-main-content" style={{ minWidth: 0, flex: 1, width: "100%", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        <TopHeaderAndStats
          portalData={portalData}
          activeView={activeView}
          setActiveView={setActiveView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          theme={theme}
          onThemeChange={() => setTheme((value) => value === "light" ? "dark" : "light")}
          language={language}
          onLanguageChange={() => setLanguage((value) => value === "hi" ? "en" : "hi")}
        />
        <main className="app-main-area" style={{ minWidth: 0, width: "100%", padding: "12px 24px 24px", flex: 1, overflowX: "hidden" }}>
          {activeView === "HOME" ? (
            <ModuleCardGrid modules={modules} onOpenModule={setActiveView} />
          ) : (
            <PortalModuleContent
              activeView={activeView}
              portalData={portalData}
              modules={modules}
            />
          )}
        </main>
      </div>
    </div>
  );
}
