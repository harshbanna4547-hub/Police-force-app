import "./TopHeader.css";

/**
 * [COMPONENT] TopHeader — पोर्टल का मुख्य शीर्ष हेडर (मेनू बटन, केंद्रित शीर्षक, थीम व भाषा स्विच)
 */
export default function TopHeader({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  theme,
  onThemeChange,
  language,
  onLanguageChange
}) {
  const english = language === "en";

  return (
    <header className="portal-top-header">
      {/* === LEFT: SIDEBAR TOGGLE & BACK BUTTON === */}
      <div className="header-left-controls">
        <button
          type="button"
          aria-label={sidebarOpen ? (english ? "Close sidebar" : "साइडबार बंद करें") : (english ? "Open sidebar" : "साइडबार खोलें")}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="header-menu-button"
        >
          ☰
        </button>

        {activeView !== "HOME" && (
          <button
            type="button"
            className="header-back-button"
            onClick={() => setActiveView("HOME")}
          >
            ⬅ {english ? "Back" : "वापस"}
          </button>
        )}
      </div>

      {/* === CENTER: PORTAL MAIN TITLE === */}
      <h1 className="portal-main-title">
        {english ? "District Police Force & Establishment Portal" : "जिला पुलिस बल एवं स्थापना पोर्टल"}
      </h1>

      {/* === RIGHT: THEME & LANGUAGE SWITCHERS === */}
      <div className="header-right-controls">
        <button
          type="button"
          onClick={onThemeChange}
          className="header-action-button"
          aria-label="Toggle light and dark mode"
        >
          <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>{" "}
          <span className="header-action-label">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>
        <button
          type="button"
          onClick={onLanguageChange}
          className="header-action-button"
          aria-label="Toggle Hindi and English"
        >
          <span aria-hidden="true">अ/A</span>{" "}
          <span className="header-action-label">{language === "hi" ? "हिंदी" : "English"}</span>
        </button>
      </div>
    </header>
  );
}
