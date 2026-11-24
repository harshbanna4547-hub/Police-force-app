// src/layout/TopHeader.jsx
export default function TopHeader({
  sidebarOpen,
  setSidebarOpen,
  activeView,
  setActiveView,
  activeProfile,
  fileName,
  onDirectExcelConnect,
  onRemoveDistrictData,
  hasData,
  persistenceError,
  lanSyncStatus,
  onExportMasterFile,
  isExportingMaster
}) {
  return (
    <header style={{ padding: "14px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ backgroundColor: "#0B1E3D", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "1.05rem", fontWeight: "bold", cursor: "pointer" }}
        >
          {sidebarOpen ? "◀" : "☰"}
        </button>

        {activeView !== "HOME" && (
          <button onClick={() => setActiveView("HOME")} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
            ⬅ Back
          </button>
        )}

        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", color: "#0F172A" }}>{activeProfile} Police Establishment & Force Management Portal</h1>
          <small style={{ color: fileName ? "#15803D" : "#DC2626", fontWeight: "bold" }}>
            {fileName ? `✔ सक्रिय डेटा: ${fileName}` : `⚠️ ${activeProfile} के लिए कृपया Master Excel अपलोड करें`}
          </small>
          {persistenceError && <small role="alert" style={{ display: "block", color: "#B91C1C" }}>{persistenceError}</small>}
          {lanSyncStatus !== "disabled" && (
            <small role="status" style={{ display: "block", color: lanSyncStatus === "connected" ? "#15803D" : lanSyncStatus === "key-required" || lanSyncStatus === "error" || lanSyncStatus === "conflict" ? "#B45309" : "#A16207" }}>
              {lanSyncStatus === "connected"
                ? "🟢 Connected to GR Server"
                : lanSyncStatus === "checking"
                  ? "🟡 Checking GR Server…"
                  : lanSyncStatus === "key-required"
                    ? "🟡 Local Mode"
                    : lanSyncStatus === "conflict"
                      ? "⚠️ GR Server data conflict; review before continuing"
                      : lanSyncStatus === "error"
                        ? "⚠️ GR Server sync error; local data remains saved"
                        : "🟡 Local Mode (GR Server Offline)"}
            </small>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={onDirectExcelConnect}
          style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
        >
          📂 {fileName ? "Overwrite Excel" : "Upload Master Excel"}
        </button>

        {hasData && (
          <button
            type="button"
            onClick={onExportMasterFile}
            disabled={isExportingMaster}
            style={{ backgroundColor: "#0284C7", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "20px", cursor: isExportingMaster ? "wait" : "pointer", fontWeight: "bold", fontSize: "0.82rem", opacity: isExportingMaster ? 0.75 : 1 }}
          >
            {isExportingMaster ? "⏳ Exporting..." : "📥 Export Master File"}
          </button>
        )}

        {fileName && (
          <button
            onClick={onRemoveDistrictData}
            title="इस जिले का डेटा हटाएं"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", padding: "8px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}
          >
            🗑️ Remove
          </button>
        )}

        <span style={{ backgroundColor: "#fff", border: "1px solid #CBD5E1", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold", fontSize: "0.85rem" }}>
          👮‍♂️ {activeProfile}
        </span>
      </div>
    </header>
  );
}
