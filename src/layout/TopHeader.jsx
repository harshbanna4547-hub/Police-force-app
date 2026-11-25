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
  onLanguageChange,
  isOneDriveConnected,
  isCloudSyncing,
  cloudSyncStatus,
  onConnectOneDriveDb
}) {
  return (
    <header className="portal-top-header" style={{ position: "sticky", top: 0, zIndex: 900, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--surface, #F4F7FB)", borderBottom: "1px solid var(--border, #E2E8F0)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          aria-label={sidebarOpen ? "साइडबार बंद करें" : "साइडबार खोलें"}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ backgroundColor: "#0B1E3D", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "1.05rem", fontWeight: "bold", cursor: "pointer" }}
        >
          ☰
        </button>

        {activeView !== "HOME" && (
          <button onClick={() => setActiveView("HOME")} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
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
          onClick={onConnectOneDriveDb}
          disabled={isCloudSyncing}
          title={cloudSyncStatus}
          aria-label={isOneDriveConnected ? "OneDrive Live Synced" : "Connect OneDrive DB"}
          style={{ backgroundColor: isOneDriveConnected ? "#DCFCE7" : "#DBEAFE", color: isOneDriveConnected ? "#166534" : "#1D4ED8", border: "1px solid currentColor", padding: "8px 12px", borderRadius: "20px", cursor: isCloudSyncing ? "wait" : "pointer", fontWeight: "bold", fontSize: "0.82rem", opacity: isCloudSyncing ? 0.75 : 1 }}
        >
          {isOneDriveConnected ? "🟢 OneDrive Live Synced" : "☁️ Connect OneDrive DB"}
        </button>
        <button
          type="button"
          onClick={onThemeChange}
          aria-label="Toggle light and dark mode"
          style={{ backgroundColor: "var(--surface-raised, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #CBD5E1)", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
        <button
          type="button"
          onClick={onLanguageChange}
          aria-label="Toggle Hindi and English"
          style={{ backgroundColor: "var(--surface-raised, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #CBD5E1)", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
        >
          🌐 {language === "hi" ? "हिंदी" : "English"}
        </button>
      </div>
    </header>
  );
}
