export default function ModuleCardGrid({ modules, onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledModules = modules.filter((module) => module.enabled !== false);

  return (
    <section aria-label={english ? "All Modules" : "सभी मॉड्यूल"} style={{ padding: "8px 0 24px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ margin: "0 0 4px", color: "var(--text, #0B1E3D)", fontSize: "1.25rem" }}>
          {english ? "All Modules" : "सभी मॉड्यूल"}
        </h2>
        <p style={{ margin: 0, color: "var(--muted, #64748B)", fontSize: "0.9rem" }}>
          {english ? "Select a card to open the corresponding module." : "किसी कार्ड को चुनकर संबंधित मॉड्यूल खोलें।"}
        </p>
      </div>
      <div className="module-card-grid" style={{ display: "grid", gap: "14px" }}>
        {enabledModules.map((module) => (
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
              border: "1px solid var(--border, #E2E8F0)",
              borderTop: `4px solid ${module.color || "#1D63DC"}`,
              borderRadius: "12px",
              background: "var(--surface-raised, #fff)",
              color: "var(--text, #0F172A)",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              cursor: "pointer"
            }}
          >
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px" }}>
              <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>{module.icon}</span>
            </div>
            <strong style={{ color: "var(--text, #0B1E3D)", fontSize: "1.02rem" }}>
              {english ? module.title : (module.hindiTitle || module.title)}
            </strong>
            <span style={{ color: "var(--muted, #64748B)", fontSize: "0.82rem", lineHeight: 1.4 }}>
              {english ? (module.englishDescription || module.description) : module.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
