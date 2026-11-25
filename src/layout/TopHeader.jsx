import "./TopHeader.css";

/**
 * [COMPONENT] TopHeader — गोल शीर्ष नेविगेशन बार (जिले का बैज, केंद्रित शीर्षक, थीम व भाषा स्विच)
 */
export default function TopHeader({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  currentDistrict,
  theme,
  onThemeChange,
  language,
  onLanguageChange
}) {
  const english = language === "en";
  const districtLabel = currentDistrict?.id === "CHITTORGARH" || !currentDistrict?.name
    ? (english ? "Chittorgarh Police" : "चित्तौड़गढ़ पुलिस")
    : `${currentDistrict.name} ${english ? "Police" : "पुलिस"}`;

  return (
    <header className="portal-top-header">
      {/* === LEFT: SIDEBAR TOGGLE, DISTRICT EMBLEM & BACK BUTTON === */}
      <div className="header-left-controls">
        <button
          type="button"
          aria-label={sidebarOpen ? (english ? "Close sidebar" : "साइडबार बंद करें") : (english ? "Open sidebar" : "साइडबार खोलें")}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="header-menu-button"
        >
          ☰
        </button>

        <div className="header-emblem-badge" title={districtLabel}>
          <span className="header-emblem-icon" aria-hidden="true">🛡️</span>
          <span className="header-emblem-text">{districtLabel}</span>
        </div>

        {activeView !== "HOME" && (
          <button
            type="button"
            className="header-back-button"
            onClick={() => setActiveView("HOME")}
          >
            ⬅ <span className="header-back-label">{english ? "Dashboard" : "डैशबोर्ड"}</span>
          </button>
        )}
      </div>

      {/* === CENTER: PORTAL MAIN TITLE === */}
      <h1 className="portal-main-title">
        {english ? "District Police Force & Establishment Portal" : "जिला पुलिस बल एवं स्थापना पोर्टल"}
      </h1>

      {/* === RIGHT: PILL THEME & LANGUAGE TOGGLES === */}
      <div className="header-right-controls">
        <button
          type="button"
          onClick={onThemeChange}
          className="header-action-button"
          aria-label="Toggle light and dark mode"
        >
          <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
          <span className="header-action-label">{theme === "light" ? "Dark" : "Light"}</span>
        </button>
        <button
          type="button"
          onClick={onLanguageChange}
          className="header-action-button header-lang-button"
          aria-label="Toggle Hindi and English"
        >
          <span aria-hidden="true">🌐</span>
          <span className="header-action-label">{language === "hi" ? "हिंदी" : "English"}</span>
        </button>
      </div>
    </header>
  );
}
