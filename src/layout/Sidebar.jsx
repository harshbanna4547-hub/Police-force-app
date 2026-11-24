export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  modules,
  activeProfile,
  onDownloadReports
}) {
  const handleNav = (viewKey) => {
    setActiveView(viewKey);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && window.innerWidth <= 768 && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", zIndex: 999 }} />
      )}
      <aside
        style={{
          width: sidebarOpen ? "235px" : "0px",
          overflow: "hidden",
          transition: "width 0.25s ease",
          backgroundColor: "#0B1E3D",
          color: "#CBD5E1",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          whiteSpace: "nowrap"
        }}
      >
        <div style={{ padding: "18px 14px", textAlign: "center", borderBottom: "1px solid #1E293B" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "8px", fontSize: "1.6rem" }}>
            <span>🦁</span><span>🛡️</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "#FACC15", fontWeight: "bold" }}>सत्यमेव जयते • राजस्थान पुलिस</div>
          <h2 style={{ margin: "6px 0 2px", color: "#fff", fontSize: "1.1rem" }}>{activeProfile} Police</h2>
          <div style={{ fontSize: "0.62rem", color: "#94A3B8" }}>SERVICE • SECURITY • TRUST</div>
        </div>

        <nav style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, minHeight: 0, overflowY: "auto" }}>
          <button
            onClick={() => handleNav("HOME")}
            aria-current={activeView === "HOME" ? "page" : undefined}
            style={{ textAlign: "left", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", backgroundColor: activeView === "HOME" ? "#1D63DC" : "transparent", color: "#fff" }}
          >
            🏠 Dashboard
          </button>
          {modules.filter((module) => module.enabled).map((module) => (
            <button
              key={module.id}
              type="button"
              title={`${module.hindiTitle} (${module.title})`}
              onClick={() => handleNav(module.id)}
              aria-current={activeView === module.id ? "page" : undefined}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: activeView === module.id ? "bold" : "500",
                backgroundColor: activeView === module.id ? "#1D63DC" : "transparent",
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {module.icon} {module.hindiTitle}
            </button>
          ))}
          <button onClick={onDownloadReports} style={{ textAlign: "left", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", backgroundColor: "transparent", color: "#4ADE80" }}>
            📥 Download All 8 Reports
          </button>
        </nav>

        <div style={{ padding: "12px", fontSize: "0.72rem", color: "#64748B", textAlign: "center", borderTop: "1px solid #1E293B" }}>
          © 2026 Made by Harsh<br />{activeProfile} Police
        </div>
      </aside>
    </>
  );
}
