import { useState } from "react";

const DIRECT_SIDEBAR_IDS = new Set(["EMPLOYEES", "STORAGE", "DEV_SERVICES"]);

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

  const selectView = (view) => {
    setActiveView(view);
    if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
  };

  const navButtonStyle = (isActive) => ({
    width: "100%",
    padding: "11px 12px",
    marginBottom: "6px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    background: isActive ? "#1D63DC" : "transparent",
    color: "white",
    fontWeight: isActive ? "bold" : "normal",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  });

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, display: "none" }}
          className="sidebar-overlay"
        />
      )}
      <aside
        className={`portal-sidebar ${className} ${sidebarOpen ? "is-open" : "is-closed"}`}
        aria-hidden={!sidebarOpen}
        style={{
          backgroundColor: "#0B1E3D",
          color: "white",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0
        }}
      >
        <section style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: "0.95rem" }}>👮‍♂️ {activeProfile}</strong>
            <span style={{ display: "block", marginTop: "5px", color: "#BFDBFE", fontSize: "0.8rem" }}>
              📍 {currentDistrict?.name || activeProfile}
            </span>
            <button
              type="button"
              onClick={onOpenDistrictSwitcher}
              style={{
                marginTop: "9px",
                padding: "6px 10px",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: "7px",
                background: "transparent",
                color: "white",
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              🔄 {english ? "Switch District" : "जिला बदलें"}
            </button>
          </div>
        </section>

        <nav aria-label={english ? "Main navigation" : "मुख्य नेविगेशन"} style={{ flex: 1, padding: "12px 10px" }}>
          <button
            type="button"
            onClick={() => selectView("HOME")}
            style={navButtonStyle(activeView === "HOME")}
          >
            🏠 {english ? "Home (Dashboard)" : "होम (डैशबोर्ड)"}
          </button>

          {employeesModule && (
            <button
              type="button"
              onClick={() => selectView("EMPLOYEES")}
              style={navButtonStyle(activeView === "EMPLOYEES")}
            >
              {employeesModule.icon} {english ? employeesModule.title : (employeesModule.hindiTitle || employeesModule.title)}
            </button>
          )}

          {storageModule && (
            <button
              type="button"
              onClick={() => selectView("STORAGE")}
              style={navButtonStyle(activeView === "STORAGE")}
            >
              {storageModule.icon} {english ? storageModule.title : (storageModule.hindiTitle || storageModule.title)}
            </button>
          )}

          <button
            type="button"
            aria-expanded={modulesOpen}
            aria-controls="sidebar-modules-list"
            onClick={() => setModulesOpen((open) => !open)}
            style={{
              ...navButtonStyle(false),
              fontWeight: "bold",
              marginTop: "4px"
            }}
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
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    marginBottom: "4px",
                    border: "none",
                    borderRadius: "8px",
                    textAlign: "left",
                    background: activeView === module.id ? "rgba(255,255,255,0.18)" : "transparent",
                    color: "white",
                    fontWeight: activeView === module.id ? "bold" : "normal",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {module.icon} {english ? module.title : (module.hindiTitle || module.title)}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button
            type="button"
            onClick={() => selectView("DEV_SERVICES")}
            style={{
              width: "calc(100% - 20px)",
              padding: "11px 12px",
              margin: "8px 10px",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              textAlign: "left",
              background: activeView === "DEV_SERVICES" ? "#1D63DC" : "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: activeView === "DEV_SERVICES" ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            🛠️ {english ? "Development Services" : "डेवलपमेंट सेवाएँ"}
          </button>
          <footer style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#CBD5E1", fontSize: "0.78rem", textAlign: "center" }}>
            {english ? "District Police Portal" : "जिला पुलिस पोर्टल"}
          </footer>
        </div>
      </aside>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
