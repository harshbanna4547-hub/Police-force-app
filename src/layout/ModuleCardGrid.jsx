export default function ModuleCardGrid({ modules, onOpenModule }) {
  const enabledModules = modules.filter((module) => module.enabled !== false);

  return (
    <section aria-label="सभी मॉड्यूल" style={{ padding: "8px 0 24px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ margin: "0 0 4px", color: "#0B1E3D", fontSize: "1.25rem" }}>सभी मॉड्यूल</h2>
        <p style={{ margin: 0, color: "#64748B", fontSize: "0.9rem" }}>किसी कार्ड को चुनकर संबंधित मॉड्यूल खोलें।</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" }}>
        {enabledModules.map((module, index) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            style={{
              minHeight: "156px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "10px",
              border: "1px solid #E2E8F0",
              borderTop: `4px solid ${module.color || "#1D63DC"}`,
              borderRadius: "12px",
              background: "#fff",
              color: "#0F172A",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              cursor: "pointer"
            }}
          >
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px" }}>
              <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>{module.icon}</span>
              <span style={{ color: "#64748B", fontFamily: "'Times New Roman', Times, serif", fontSize: "0.8rem" }}>
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <strong style={{ color: "#0B1E3D", fontSize: "1.02rem" }}>{module.hindiTitle || module.title}</strong>
            <span style={{ color: "#475569", fontFamily: "'Times New Roman', Times, serif", fontSize: "0.88rem" }}>{module.title}</span>
            <span style={{ color: "#64748B", fontSize: "0.82rem", lineHeight: 1.4 }}>{module.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
