import "./TopHeader.css";

/**
 * [COMPONENT] TopHeader — साफ़ व केंद्रित शीर्ष हेडर (मोबाइल पर ☰ बटन, बाईं ओर जिला बैज और बीच में मुख्य शीर्षक)
 */
export default function TopHeader({
  sidebarOpen,
  setSidebarOpen,
  currentDistrict,
  language
}) {
  const english = language === "en";
  const districtLabel = currentDistrict?.id === "CHITTORGARH" || !currentDistrict?.name
    ? (english ? "Chittorgarh Police" : "चित्तौड़गढ़ पुलिस")
    : `${currentDistrict.name} ${english ? "Police" : "पुलिस"}`;

  return (
    <header className="portal-top-header">
      {/* === LEFT: MOBILE SIDEBAR TOGGLE (HIDDEN ON DESKTOP) & DISTRICT BADGE === */}
      <div className="header-left-controls">
        <button
          type="button"
          aria-label={sidebarOpen ? (english ? "Close sidebar" : "साइडबार बंद करें") : (english ? "Open sidebar" : "साइडबार खोलें")}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="header-menu-button mobile-menu-btn"
        >
          ☰
        </button>

        <div className="header-emblem-badge" title={districtLabel}>
          <span className="header-emblem-icon" aria-hidden="true">🛡️</span>
          <span className="header-emblem-text">{districtLabel}</span>
        </div>
      </div>

      {/* === CENTER: PORTAL MAIN TITLE === */}
      <h1 className="portal-main-title">
        {english ? "District Police Force & Establishment Portal" : "जिला पुलिस बल एवं स्थापना पोर्टल"}
      </h1>

      {/* === RIGHT: BALANCING SPACER FOR TRUE HORIZONTAL CENTERING === */}
      <div className="header-right-spacer" aria-hidden="true" />
    </header>
  );
}
