import "./DashboardBento.css";

/**
 * [COMPONENT] DashboardBento — आधुनिक Bento-Grid मॉड्यूल कार्ड (बिना क्रमांक के 100% द्विभाषी)
 */
export default function DashboardBento({ modules, onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledModules = modules.filter((module) => module.enabled !== false);

  return (
    <section aria-label={english ? "All Operational Modules" : "सभी विभागीय मॉड्यूल"} className="bento-dashboard-section">
      {/* === SECTION HEADER === */}
      <div className="bento-section-header">
        <div>
          <h2 className="bento-section-title">
            {english ? "Operational Modules" : "विभागीय कार्य मॉड्यूल"}
          </h2>
          <p className="bento-section-subtitle">
            {english
              ? "Choose any workspace below to inspect force records, orders, or reports."
              : "संबंधित बल विवरण, आदेश या रिपोर्ट खोलने के लिए नीचे से मॉड्यूल चुनें।"}
          </p>
        </div>
      </div>

      {/* === BENTO CARD GRID (NUMBERING REMOVED) === */}
      <div className="bento-card-grid">
        {enabledModules.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className={`bento-module-card bento-accent-${module.id}`}
          >
            <div className="bento-card-top">
              <span className="bento-icon-badge" aria-hidden="true">
                {module.icon}
              </span>
            </div>

            <div className="bento-card-body">
              <strong className="bento-card-title">
                {english ? module.title : (module.hindiTitle || module.title)}
              </strong>
              <span className="bento-card-subtitle">
                {english ? (module.englishDescription || module.description) : module.description}
              </span>
            </div>

            <div className="bento-card-footer">
              <span className="bento-open-pill">
                {english ? "Open Module →" : "मॉड्यूल खोलें →"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
