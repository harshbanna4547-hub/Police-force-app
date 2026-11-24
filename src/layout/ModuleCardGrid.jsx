import { useState } from "react";

const cardStyle = (color, enabled) => ({
  background: "#fff",
  border: `1px solid ${enabled ? "#E2E8F0" : "#CBD5E1"}`,
  borderTop: `4px solid ${enabled ? color : "#94A3B8"}`,
  borderRadius: "16px",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  opacity: enabled ? 1 : 0.72,
  minHeight: "220px"
});

const buttonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "9px 12px",
  fontWeight: 700,
  cursor: "pointer"
};

export default function ModuleCardGrid({ modules, setActiveView, onToggleModule }) {
  const [manageOpen, setManageOpen] = useState(false);
  const activeCount = modules.filter((module) => module.enabled).length;

  const toggleButton = (module) => (
    <button
      type="button"
      aria-pressed={module.enabled}
      onClick={() => onToggleModule(module.id, !module.enabled)}
      style={{
        ...buttonStyle,
        color: module.enabled ? "#166534" : "#334155",
        background: module.enabled ? "#DCFCE7" : "#E2E8F0"
      }}
    >
      {module.enabled ? "सक्रिय · हटाएँ" : "निष्क्रिय · जोड़ें"}
    </button>
  );

  return (
    <section aria-label="सभी मॉड्यूल">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0F172A" }}>🏠 All Modules</h2>
          <small style={{ color: "#64748B" }}>{activeCount} सक्रिय मॉड्यूल</small>
        </div>
        <button type="button" onClick={() => setManageOpen(true)} style={{ ...buttonStyle, background: "#0B1E3D", color: "#fff" }}>
          ⚙️ Manage Modules (Add/Remove)
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
        {modules.map((module) => (
          <article key={module.id} style={cardStyle(module.color, module.enabled)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span aria-hidden="true" style={{ fontSize: "2rem" }}>{module.icon}</span>
              <div>
                <h3 style={{ margin: 0, color: "#0F172A", fontSize: "1.05rem" }}>{module.hindiTitle}</h3>
                <small style={{ color: "#475569" }}>{module.title}</small>
              </div>
            </div>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5, flex: 1 }}>{module.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!module.enabled}
                onClick={() => setActiveView(module.id)}
                style={{ ...buttonStyle, color: "#fff", background: module.enabled ? module.color : "#94A3B8", cursor: module.enabled ? "pointer" : "not-allowed" }}
              >
                {module.enabled ? "मॉड्यूल खोलें →" : "बंद"}
              </button>
              {toggleButton(module)}
            </div>
          </article>
        ))}
      </div>

      {manageOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setManageOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", padding: "16px" }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="manage-modules-title" style={{ width: "100%", maxWidth: "680px", maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div>
                <h2 id="manage-modules-title" style={{ margin: 0, color: "#0F172A" }}>⚙️ Manage Modules</h2>
                <small style={{ color: "#64748B" }}>मॉड्यूल जोड़ें या हटाएँ</small>
              </div>
              <button type="button" aria-label="बंद करें" onClick={() => setManageOpen(false)} style={{ ...buttonStyle, background: "#E2E8F0", color: "#0F172A" }}>✕</button>
            </header>
            <div style={{ display: "grid", gap: "8px" }}>
              {modules.map((module) => (
                <div key={module.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px", border: "1px solid #E2E8F0", borderRadius: "10px" }}>
                  <div>
                    <strong style={{ color: "#0F172A" }}>{module.icon} {module.hindiTitle}</strong>
                    <small style={{ display: "block", color: "#64748B" }}>{module.title}</small>
                  </div>
                  {toggleButton(module)}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
