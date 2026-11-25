import { useState } from "react";
import "./SidebarNav.css";

const DIRECT_SIDEBAR_IDS = new Set(["EMPLOYEES", "STORAGE", "DEV_SERVICES"]);

/**
 * [COMPONENT] Sidebar — फिक्स्ड बायां साइडबार (Home, Employee Management, Storage Vault एवं मॉड्यूल सूची)
 */
export default function Sidebar({
  className = "",
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  activeProfile,
  currentDistrict,
  language,
  onOpenDistrictSwitcher
}) {
  const [modulesOpen, setModulesOpen] = useState(false);
  const english = language === "en";
  const employeesModule = modules.find((module) => module.id === "EMPLOYEES" && module.enabled !== false);
  const storageModule = modules.find((module) => module.id === "STORAGE" && module.enabled !== false);
  const visibleModules = modules.filter(
    (module) => module.enabled !== false && !DIRECT_SIDEBAR_IDS.has(module.id)
  );

  // [ACTION] Select view and auto-close drawer on small screens
  const selectView = (view) => {
    setActiveView(view);
    if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="sidebar-overlay"
        />
      )}
      <aside
        className={`portal-sidebar ${className} ${sidebarOpen ? "is-open" : "is-closed"}`}
        aria-hidden={!sidebarOpen}
      >
        {/* === PROFILE & DISTRICT HEADER === */}
        <section className="sidebar-profile-section">
          <div className="sidebar-profile-card">
            <strong className="sidebar-profile-title">👮‍♂️ {activeProfile}</strong>
            <span className="sidebar-profile-district">
              📍 {currentDistrict?.name || activeProfile}
            </span>
            <button
              type="button"
              onClick={onOpenDistrictSwitcher}
              className="sidebar-switch-btn"
            >
              🔄 {english ? "Switch District" : "जिला बदलें"}
            </button>
          </div>
        </section>

        {/* === PRIMARY NAVIGATION LINKS === */}
        <nav aria-label={english ? "Main navigation" : "मुख्य नेविगेशन"} className="sidebar-nav-list">
          <button
            type="button"
            onClick={() => selectView("HOME")}
            className={`sidebar-nav-btn ${activeView === "HOME" ? "is-active" : ""}`}
          >
            🏠 {english ? "Home (Dashboard)" : "होम (डैशबोर्ड)"}
          </button>

          {employeesModule && (
            <button
              type="button"
              onClick={() => selectView("EMPLOYEES")}
              className={`sidebar-nav-btn ${activeView === "EMPLOYEES" ? "is-active" : ""}`}
            >
              {employeesModule.icon} {english ? employeesModule.title : (employeesModule.hindiTitle || employeesModule.title)}
            </button>
          )}

          {storageModule && (
            <button
              type="button"
              onClick={() => selectView("STORAGE")}
              className={`sidebar-nav-btn ${activeView === "STORAGE" ? "is-active" : ""}`}
            >
              {storageModule.icon} {english ? storageModule.title : (storageModule.hindiTitle || storageModule.title)}
            </button>
          )}

          <button
            type="button"
            aria-expanded={modulesOpen}
            aria-controls="sidebar-modules-list"
            onClick={() => setModulesOpen((open) => !open)}
            className="sidebar-nav-btn sidebar-modules-toggle"
          >
            📂 {english ? "Modules" : "मॉड्यूल"} {modulesOpen ? "▴" : "▾"}
          </button>

          {modulesOpen && (
            <div id="sidebar-modules-list">
              {visibleModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  title={english ? module.title : (module.hindiTitle || module.title)}
                  onClick={() => selectView(module.id)}
                  className={`sidebar-sub-btn ${activeView === module.id ? "is-active" : ""}`}
                >
                  {module.icon} {english ? module.title : (module.hindiTitle || module.title)}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* === FOOTER & DEV SERVICES === */}
        <div className="sidebar-footer-wrap">
          <button
            type="button"
            onClick={() => selectView("DEV_SERVICES")}
            className={`sidebar-dev-btn ${activeView === "DEV_SERVICES" ? "is-active" : ""}`}
          >
            🛠️ {english ? "Development Services" : "डेवलपमेंट सेवाएँ"}
          </button>
          <footer className="sidebar-footer-caption">
            {english ? "District Police Portal" : "जिला पुलिस पोर्टल"}
          </footer>
        </div>
      </aside>
    </>
  );
}
