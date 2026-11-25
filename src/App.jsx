import { useEffect, useRef, useState } from "react";
import "./App.css";
import PortalModuleContent from "./components/PortalModuleContent";
import SidebarNav from "./layout/SidebarNav";
import TopHeaderAndStats from "./layout/TopHeaderAndStats";
import DashboardBento from "./layout/DashboardBento";
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
  const viewHistoryRef = useRef(["HOME"]);
  const [moduleInitialTab, setModuleInitialTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [portalTemplate, setPortalTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem("police_portal_template");
      if (["novara", "finora", "aurora", "wizardz", "twinkle", "xenon"].includes(saved)) return saved;
      return localStorage.getItem("police_portal_theme") === "dark" ? "twinkle" : "aurora";
    } catch {
      return "aurora";
    }
  });
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
    document.documentElement.dataset.template = portalTemplate;
    try {
      localStorage.setItem("police_portal_theme", theme);
      localStorage.setItem("police_portal_template", portalTemplate);
    } catch (error) {
      console.error("Theme preference could not be saved:", error);
    }
  }, [theme, portalTemplate]);

  const handleTemplateSelect = (tplId) => {
    setPortalTemplate(tplId);
    setTheme(tplId === "twinkle" ? "dark" : "light");
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      setPortalTemplate("twinkle");
    } else if (portalTemplate === "twinkle") {
      setPortalTemplate("aurora");
    }
  };

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

  const navigateToView = (targetView, initialTab = null) => {
    const nextView = targetView || "HOME";
    setModuleInitialTab(initialTab || null);
    setActiveView(nextView);
    if (nextView === "HOME") {
      viewHistoryRef.current = ["HOME"];
    } else if (viewHistoryRef.current[viewHistoryRef.current.length - 1] !== nextView) {
      viewHistoryRef.current = [...viewHistoryRef.current, nextView];
    }
  };

  const handleGoBack = () => {
    setModuleInitialTab(null);
    const prev = viewHistoryRef.current;
    if (prev.length <= 1) {
      viewHistoryRef.current = ["HOME"];
      setActiveView("HOME");
      return;
    }
    const next = prev.slice(0, -1);
    viewHistoryRef.current = next;
    setActiveView(next[next.length - 1] || "HOME");
  };

  const handleGoHome = () => navigateToView("HOME", null);

  if (!portalData.isDistrictDataReady) {
    return <main className="app-loading-screen">जिला डेटा सुरक्षित स्टोरेज से लोड हो रहा है…</main>;
  }

  return (
    <div
      className={`app-shell ${sidebarOpen ? "is-sidebar-open" : "is-sidebar-closed"}`}
      data-theme={theme}
      data-template={portalTemplate}
    >
      <div className="portal-ambient-canvas" aria-hidden="true">
        <span className="ambient-orb ambient-orb-one" />
        <span className="ambient-orb ambient-orb-two" />
      </div>
      <SidebarNav
        portalData={portalData}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={navigateToView}
        modules={modules}
        currentDistrict={currentDistrict}
        onDistrictChange={handleDistrictChange}
        theme={theme}
        onThemeChange={handleThemeToggle}
        language={language}
        onLanguageChange={() => setLanguage((value) => value === "hi" ? "en" : "hi")}
      />
      <div className={`app-main-content ${sidebarOpen ? "has-sidebar" : "is-expanded"}`}>
        <TopHeaderAndStats
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          currentDistrict={currentDistrict}
          language={language}
          portalTemplate={portalTemplate}
          onTemplateChange={handleTemplateSelect}
        />
        <main className="app-main-area">
          {activeView === "HOME" ? (
            <DashboardBento
              modules={modules.filter((module) => !["EMPLOYEES", "STORAGE", "REPORTS", "DEV_SERVICES"].includes(module.id))}
              currentDistrict={currentDistrict}
              theme={theme}
              onOpenModule={navigateToView}
              language={language}
            />
          ) : (
            <PortalModuleContent
              activeView={activeView}
              setActiveView={navigateToView}
              initialTab={moduleInitialTab}
              onBack={handleGoBack}
              onHome={handleGoHome}
              portalData={portalData}
              districtId={currentDistrict.id}
              currentDistrict={currentDistrict}
              modules={modules}
              language={language}
            />
          )}
        </main>
      </div>
    </div>
  );
}
