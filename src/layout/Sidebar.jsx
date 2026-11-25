import { useState } from "react";
import { OFFICE_SERVER_TOKEN_KEY, saveOfficeServerConfig } from "../core/lanSyncClient.js";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  activeProfile,
  currentDistrict,
  language,
  cloudSyncStatus,
  onOpenDistrictSwitcher
}) {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [officeKey, setOfficeKey] = useState("");
  const [officeKeyStatus, setOfficeKeyStatus] = useState("");
  const [officeKeyConfigured, setOfficeKeyConfigured] = useState(() => {
    try {
      return Boolean(window.localStorage.getItem(OFFICE_SERVER_TOKEN_KEY));
    } catch (error) {
      console.error("Office Access Key status could not be read:", error);
      return false;
    }
  });
  const visibleModules = modules.filter((module) => module.enabled !== false);
  const selectView = (view) => {
    setActiveView(view);
    if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
  };
  const saveOfficeKey = (event) => {
    event.preventDefault();
    try {
      saveOfficeServerConfig(officeKey);
      setOfficeKey("");
      setOfficeKeyConfigured(true);
      setOfficeKeyStatus("Access Key इस डिवाइस पर सुरक्षित हो गई।");
      window.dispatchEvent(new Event("police-vault-updated"));
    } catch (error) {
      setOfficeKeyStatus(error.message);
    }
  };

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
        className={`portal-sidebar ${sidebarOpen ? "is-open" : "is-closed"}`}
        style={{
          width: sidebarOpen ? "280px" : "0px",
          minWidth: sidebarOpen ? "280px" : "0px",
          height: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          backgroundColor: "#0B1E3D",
          color: "white",
          transition: "all 0.3s ease",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 999,
          flexShrink: 0
        }}
      >
        {sidebarOpen && (
          <>
            <section style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>👮‍♂️ {activeProfile}</strong>
                <span style={{ display: "block", marginTop: "5px", color: "#BFDBFE", fontSize: "0.8rem" }}>
                  📍 {currentDistrict?.name || activeProfile}
                </span>
                <button
                  type="button"
                  onClick={onOpenDistrictSwitcher}
                  style={{ marginTop: "9px", padding: "6px 10px", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "7px", background: "transparent", color: "white", fontSize: "0.78rem", cursor: "pointer" }}
                >
                  🔄 Switch User
                </button>
              </div>
            </section>

            <nav aria-label="मुख्य नेविगेशन" style={{ flex: 1, padding: "12px 10px" }}>
              <button
                type="button"
                onClick={() => selectView("HOME")}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  marginBottom: "8px",
                  border: "none",
                  borderRadius: "8px",
                  textAlign: "left",
                  background: activeView === "HOME" ? "#1D63DC" : "transparent",
                  color: "white",
                  fontWeight: activeView === "HOME" ? "bold" : "normal",
                  cursor: "pointer"
                }}
              >
                🏠 {language === "en" ? "Home (Dashboard)" : "होम (डैशबोर्ड)"}
              </button>

              <button
                type="button"
                aria-expanded={modulesOpen}
                aria-controls="sidebar-modules-list"
                onClick={() => setModulesOpen((open) => !open)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  marginBottom: "8px",
                  border: "none",
                  borderRadius: "8px",
                  textAlign: "left",
                  background: "transparent",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                📂 {language === "en" ? "Modules" : "मॉड्यूल"} {modulesOpen ? "▴" : "▾"}
              </button>
              {modulesOpen && (
                <div id="sidebar-modules-list">
                  {visibleModules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      title={module.title}
                      onClick={() => selectView(module.id)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        marginBottom: "4px",
                        border: "none",
                        borderRadius: "8px",
                        textAlign: "left",
                        background: activeView === module.id ? "rgba(255,255,255,0.18)" : "transparent",
                        color: "white",
                        fontWeight: activeView === module.id ? "bold" : "normal",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {module.icon} {language === "en" ? module.title : (module.hindiTitle || module.title)}
                    </button>
                  ))}
                </div>
              )}
            </nav>

            <footer style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#CBD5E1", fontSize: "0.75rem" }}>
              <p style={{ margin: "0 0 9px", textAlign: "center" }}>{cloudSyncStatus}</p>
              <details>
                <summary style={{ cursor: "pointer", textAlign: "center" }}>
                  {officeKeyConfigured ? "Office Access Key बदलें" : "OneDrive sync कनेक्ट करें"}
                </summary>
                <form onSubmit={saveOfficeKey} style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                  <label htmlFor="office-access-key">सर्वर संचालक से मिली Access Key एक बार दर्ज करें। Microsoft Sign-In आवश्यक नहीं है।</label>
                  <input
                    id="office-access-key"
                    type="password"
                    autoComplete="new-password"
                    value={officeKey}
                    onChange={(event) => setOfficeKey(event.target.value)}
                    required
                    minLength={32}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px", borderRadius: "6px", border: "1px solid #94A3B8" }}
                  />
                  <button type="submit" style={{ padding: "8px", border: "0", borderRadius: "6px", background: "#1D63DC", color: "white", cursor: "pointer" }}>
                    Access Key सेव करें
                  </button>
                  {officeKeyStatus && <span role="status">{officeKeyStatus}</span>}
                </form>
              </details>
              <p style={{ margin: "10px 0 0", textAlign: "center" }}>District Police Portal</p>
            </footer>
          </>
        )}
      </aside>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
