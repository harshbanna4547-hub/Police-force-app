export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  activeProfile,
  onOpenDistrictSwitcher
}) {
  const visibleModules = modules.filter((module) => module.enabled !== false);

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
        style={{
          width: sidebarOpen ? "280px" : "0px",
          minWidth: sidebarOpen ? "280px" : "0px",
          height: "100vh",
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
                onClick={() => setActiveView("HOME")}
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
                🏠 Home (Dashboard)
              </button>

              {visibleModules.map((module, index) => (
                <button
                  key={module.id}
                  type="button"
                  title={module.title}
                  onClick={() => setActiveView(module.id)}
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
                  <span style={{ display: "inline-block", width: "26px", color: "#93C5FD", fontFamily: "'Times New Roman', Times, serif" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {module.icon} {module.hindiTitle || module.title}
                </button>
              ))}
            </nav>

            <footer style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#CBD5E1", fontSize: "0.75rem", textAlign: "center" }}>
              District Police Portal
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
