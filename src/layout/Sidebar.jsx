import "./SidebarNav.css";

/**
 * [COMPONENT] Sidebar — साफ़ व केंद्रित बायां साइडबार
 * 1. Home (Dashboard)
 * 2. Employee Management
 * 3. Storage Vault (Windows Desktop)
 * 4. Services (सरकारी पोर्टल एवं लिंक)
 * 5. About Portal (पोर्टल परिचय + डेवलपमेंट सेवाएं)
 * 6. Bottom Utility Controls (Sunrise/Moonrise, हिंदी/English, Theme Style)
 */
export default function Sidebar({
  className = "",
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules = [],
  activeProfile,
  currentDistrict,
  theme = "light",
  onThemeChange,
  portalTemplate = "aurora",
  onTemplateChange,
  templateOptions = [],
  language = "hi",
  onLanguageChange,
  onOpenDistrictSwitcher
}) {
  const english = language === "en";

  const employeesModule = modules.find((module) => module.id === "EMPLOYEES" && module.enabled !== false);
  const storageModule = modules.find((module) => module.id === "STORAGE" && module.enabled !== false);
  const servicesModule = modules.find((module) => module.id === "SERVICES" && module.enabled !== false);
  const aboutModule = modules.find((module) => module.id === "ABOUT" && module.enabled !== false);

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
        {/* === 1. DISTRICT PROFILE HEADER === */}
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

        {/* === 2. PRIMARY NAVIGATION ITEMS (ULTRA-CLEAN) === */}
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
              👥 {english ? employeesModule.title : (employeesModule.hindiTitle || employeesModule.title)}
            </button>
          )}

          {storageModule && (
            <button
              type="button"
              onClick={() => selectView("STORAGE")}
              className={`sidebar-nav-btn ${activeView === "STORAGE" ? "is-active" : ""}`}
            >
              🖥️ {english ? "Storage Vault (Windows Desktop)" : "स्टोरेज वॉल्ट (Windows Desktop)"}
            </button>
          )}

          {/* === 3. SERVICES: DEDICATED GOVT PORTALS PAGE === */}
          {servicesModule && (
            <button
              type="button"
              onClick={() => selectView("SERVICES")}
              className={`sidebar-nav-btn ${activeView === "SERVICES" ? "is-active" : ""}`}
            >
              🌐 {english ? "Services" : "सरकारी पोर्टल एवं लिंक"}
            </button>
          )}

          {/* === 4. ABOUT PORTAL PAGE (OVERVIEW + DEVELOPMENT SERVICES) === */}
          {aboutModule && (
            <button
              type="button"
              onClick={() => selectView("ABOUT")}
              className={`sidebar-nav-btn ${activeView === "ABOUT" || activeView === "DEV_SERVICES" ? "is-active" : ""}`}
            >
              ℹ️ {english ? "About Portal" : "पोर्टल परिचय (About)"}
            </button>
          )}
        </nav>

        {/* === 5. BOTTOM UTILITY CONTROLS (SUNRISE/MOONRISE, LANGUAGE & THEME STYLE) === */}
        <div className="sidebar-footer-wrap">
          <div className="sidebar-utility-pills" role="group" aria-label={english ? "Theme and language controls" : "थीम एवं भाषा नियंत्रण"}>
            <button
              type="button"
              onClick={onThemeChange}
              aria-pressed={theme === "dark"}
              title={theme === "light"
                ? (english ? "Switch to Moonrise (Dark Mode)" : "मूनराइज (डार्क मोड) चालू करें")
                : (english ? "Switch to Sunrise (Light Mode)" : "सनराइज (लाइट मोड) चालू करें")}
              aria-label={theme === "light"
                ? (english ? "Moonrise — Switch to Dark Mode" : "मूनराइज — डार्क मोड पर जाएं")
                : (english ? "Sunrise — Switch to Light Mode" : "सनराइज — लाइट मोड पर जाएं")}
              className={`sidebar-utility-pill sidebar-sky-toggle ${theme === "dark" ? "is-sunrise-target" : "is-moonrise-target"}`}
            >
              <span className="sidebar-sky-pill-content">
                <span aria-hidden="true">{theme === "light" ? "🌙" : "🌅"}</span>
                <span>{theme === "light" ? "Moonrise" : "Sunrise"}</span>
              </span>
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

          {templateOptions.length > 0 && (
            <div className="sidebar-theme-switcher">
              <label htmlFor="sidebar-theme-select" className="sidebar-theme-label">
                🎨 {english ? "Theme Style:" : "थीम स्टाइल:"}
              </label>
              <select
                id="sidebar-theme-select"
                value={portalTemplate}
                onChange={(event) => onTemplateChange?.(event.target.value)}
                aria-label={english ? "Theme Style" : "थीम स्टाइल"}
                className="sidebar-theme-select"
              >
                {templateOptions.map((tpl) => (
                  <option key={tpl.id} value={tpl.id} className="sidebar-theme-option">
                    {tpl.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <footer className="sidebar-footer-caption">
            Developed by HarshVardhan
          </footer>
        </div>
      </aside>
    </>
  );
}
