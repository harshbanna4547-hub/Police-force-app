import { useState } from "react";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  activeProfile,
  currentDistrict,
  language,
  cloudSyncState,
  cloudSyncStatus,
  isCloudSyncing,
  isOnline,
  onReauthenticateOneDrive,
  onOpenDistrictSwitcher
}) {
  const [modulesOpen, setModulesOpen] = useState(false);
  const visibleModules = modules.filter((module) => module.enabled !== false);
  const syncIndicatorState = !isOnline || cloudSyncState === "offline"
    ? "offline"
    : isCloudSyncing || cloudSyncState === "syncing"
      ? "syncing"
      : cloudSyncState;
  const syncIndicator = {
    synced: { label: "Online • Synced", color: "#166534", background: "#DCFCE7", border: "#86EFAC" },
    syncing: { label: "Syncing...", color: "#1D4ED8", background: "#DBEAFE", border: "#93C5FD" },
    offline: { label: "Offline (Local Saved)", color: "#991B1B", background: "#FEE2E2", border: "#FCA5A5" },
    "auth-required": { label: "Sign-in Required", color: "#92400E", background: "#FEF3C7", border: "#FCD34D" },
    "setup-required": { label: "Setup Required", color: "#475569", background: "#F1F5F9", border: "#CBD5E1" },
    error: { label: "Sync Issue", color: "#991B1B", background: "#FEE2E2", border: "#FCA5A5" }
  }[syncIndicatorState] || {
    label: "Sync Issue",
    color: "#991B1B",
    background: "#FEE2E2",
    border: "#FCA5A5"
  };
  const canReauthenticate = syncIndicatorState === "auth-required" && isOnline;
  const selectView = (view) => {
    setActiveView(view);
    if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
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

            <footer style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#CBD5E1", fontSize: "0.75rem", display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                aria-label={syncIndicator.label}
                title={cloudSyncStatus}
                disabled={!canReauthenticate || isCloudSyncing}
                onClick={canReauthenticate ? onReauthenticateOneDrive : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: `1px solid ${syncIndicator.border}`,
                  borderRadius: "999px",
                  background: syncIndicator.background,
                  color: syncIndicator.color,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: canReauthenticate ? "pointer" : "default",
                  opacity: isCloudSyncing ? 0.75 : 1
                }}
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8.82a16 16 0 0 1 20 0" />
                  <path d="M5 12.86a10 10 0 0 1 14 0" />
                  <path d="M8.5 16.4a5 5 0 0 1 7 0" />
                  <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
                  {syncIndicatorState === "offline" && <path d="m3 3 18 18" />}
                </svg>
                <span aria-live="polite">{syncIndicator.label}</span>
              </button>
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
