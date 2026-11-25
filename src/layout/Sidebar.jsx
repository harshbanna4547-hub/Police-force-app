import { useState } from "react";
import "./SidebarNav.css";

const DIRECT_SIDEBAR_IDS = new Set(["EMPLOYEES", "STORAGE", "REPORTS", "DEV_SERVICES"]);

/**
 * [COMPONENT] Sidebar — फिक्स्ड बायां साइडबार (Home, Employee Management, Storage Vault, Reports एवं मॉड्यूल सूची)
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
  theme = "light",
  onThemeChange,
  language,
  onLanguageChange,
  onOpenDistrictSwitcher
}) {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const english = language === "en";
  const employeesModule = modules.find((module) => module.id === "EMPLOYEES" && module.enabled !== false);
  const storageModule = modules.find((module) => module.id === "STORAGE" && module.enabled !== false);
  const reportsModule = modules.find((module) => module.id === "REPORTS" && module.enabled !== false);
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

          {reportsModule && (
            <button
              type="button"
              onClick={() => selectView("REPORTS")}
              className={`sidebar-nav-btn ${activeView === "REPORTS" ? "is-active" : ""}`}
            >
              {reportsModule.icon} {english ? reportsModule.title : (reportsModule.hindiTitle || reportsModule.title)}
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

        {/* === FOOTER: COMPACT THEME & LANGUAGE PILLS + DEV SERVICES === */}
        <div className="sidebar-footer-wrap">
          <div className="sidebar-utility-pills" role="group" aria-label={english ? "Theme and language controls" : "थीम एवं भाषा नियंत्रण"}>
            <button
              type="button"
              onClick={onThemeChange}
              className="sidebar-utility-pill"
              aria-label={english ? "Toggle light and dark mode" : "लाइट और डार्क मोड बदलें"}
            >
              <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>
            <button
              type="button"
              onClick={onLanguageChange}
              className="sidebar-utility-pill"
              aria-label={english ? "Switch language" : "भाषा बदलें"}
            >
              <span aria-hidden="true">🌐</span>
              <span>{language === "hi" ? "हिंदी" : "English"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => selectView("DEV_SERVICES")}
            className={`sidebar-dev-btn ${activeView === "DEV_SERVICES" ? "is-active" : ""}`}
          >
            🛠️ {english ? "Development Services" : "डेवलपमेंट सेवाएँ"}
          </button>

          {/* === ABOUT AUTHOR SECTION (लेखक / विकासकर्ता परिचय) === */}
          <button
            type="button"
            aria-expanded={aboutOpen}
            aria-controls="sidebar-about-panel"
            onClick={() => setAboutOpen((open) => !open)}
            className="sidebar-about-toggle"
          >
            <span>ℹ️ {english ? "About Developer" : "परिचय (About)"}</span>
            <span>{aboutOpen ? "▴" : "▾"}</span>
          </button>

          {aboutOpen && (
            <section id="sidebar-about-panel" className="sidebar-about-card" aria-label={english ? "Author details" : "विकासकर्ता विवरण"}>
              <div className="sidebar-about-name">Harshvardhan Singh Rathore</div>
              <div className="sidebar-about-row">
                <strong>{english ? "Role:" : "पद:"}</strong>{" "}
                {english ? "Govt. Employee — Junior Assistant" : "सरकारी कर्मचारी — कनिष्ठ सहायक"}
              </div>
              <div className="sidebar-about-row">
                <strong>{english ? "Posting:" : "पदस्थापन:"}</strong>{" "}
                {english ? "SP Office (Force Branch), Chittorgarh" : "पुलिस अधीक्षक कार्यालय (फोर्स शाखा), चित्तौड़गढ़"}
              </div>
              <div className="sidebar-about-row">
                <strong>{english ? "Work Deal:" : "कार्य दायित्व:"}</strong>{" "}
                {english
                  ? "Training, Exam Permission, Seniority, Roster & Promotion Exams"
                  : "प्रशिक्षण, परीक्षा अनुमति, वरिष्ठता, रोस्टर एवं पदोन्नति परीक्षा कार्य"}
              </div>
              <div className="sidebar-about-row">
                <strong>{english ? "Email:" : "ई-मेल:"}</strong>{" "}
                <a href="mailto:harshbanna4547@gmail.com" className="sidebar-about-mail">
                  harshbanna4547@gmail.com
                </a>
              </div>
            </section>
          )}

          <footer className="sidebar-footer-caption">
            Developed by HarshVardhan
          </footer>
        </div>
      </aside>
    </>
  );
}
