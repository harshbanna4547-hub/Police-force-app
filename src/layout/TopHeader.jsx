// src/layout/TopHeader.jsx
export default function TopHeader({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  fileName,
  theme,
  onThemeChange,
  language,
  onLanguageChange
}) {
  return (
    <header className="portal-top-header" style={{ position: "sticky", top: 0, zIndex: 900, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--surface, #F4F7FB)", borderBottom: "1px solid var(--border, #E2E8F0)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          aria-label={sidebarOpen ? "साइडबार बंद करें" : "साइडबार खोलें"}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="header-menu-button"
          style={{ backgroundColor: "#0B1E3D", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "1.05rem", fontWeight: "bold", cursor: "pointer" }}
        >
          ☰
        </button>

        {activeView !== "HOME" && (
          <button className="header-back-button" onClick={() => setActiveView("HOME")} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
            ⬅ Back
          </button>
        )}

        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", color: "var(--text, #0F172A)" }}>{language === "hi" ? "जिला पुलिस बल एवं स्थापना प्रबंधन पोर्टल" : "District Police Force & Establishment Portal"}</h1>
          <small style={{ color: fileName ? "#15803D" : "#DC2626", fontWeight: "bold" }}>
            {fileName ? `✔ ${language === "hi" ? "सक्रिय डेटा" : "Active data"}: ${fileName}` : `⚠️ ${language === "hi" ? "Master Excel अपलोड करें" : "Upload Master Excel"}`}
          </small>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={onThemeChange}
          className="header-action-button"
          aria-label="Toggle light and dark mode"
          style={{ backgroundColor: "var(--surface-raised, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #CBD5E1)", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
        >
          <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>{" "}
          <span className="header-action-label">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>
        <button
          type="button"
          onClick={onLanguageChange}
          className="header-action-button"
          aria-label="Toggle Hindi and English"
          style={{ backgroundColor: "var(--surface-raised, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #CBD5E1)", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
        >
          <span aria-hidden="true">अ/A</span>{" "}
          <span className="header-action-label">{language === "hi" ? "हिंदी" : "English"}</span>
        </button>
      </div>
    </header>
  );
}
