import "./ModuleCardGrid.css";

/**
 * [COMPONENT] ModuleCardGrid — डैशबोर्ड पर सभी मॉड्यूल कार्ड बिना क्रमांक (1, 2, 3) के प्रदर्शित करता है
 */
export default function ModuleCardGrid({ modules, onOpenModule, language = "hi" }) {
  const english = language === "en";
  const enabledModules = modules.filter((module) => module.enabled !== false);

  return (
    <section aria-label={english ? "All Modules" : "सभी मॉड्यूल"} className="module-grid-section">
      <div className="module-grid-heading-wrap">
        <h2 className="module-grid-heading">
          {english ? "All Modules" : "सभी मॉड्यूल"}
        </h2>
        <p className="module-grid-subheading">
          {english ? "Select a card to open the corresponding module." : "किसी कार्ड को चुनकर संबंधित मॉड्यूल खोलें।"}
        </p>
      </div>

      <div className="module-card-grid">
        {enabledModules.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className={`module-card-btn card-accent-${module.id}`}
          >
            <div className="module-card-icon-row">
              <span aria-hidden="true" className="module-card-icon">{module.icon}</span>
            </div>
            <strong className="module-card-title">
              {english ? module.title : (module.hindiTitle || module.title)}
            </strong>
            <span className="module-card-desc">
              {english ? (module.englishDescription || module.description) : module.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
