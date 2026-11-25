import { ALL_GOVT_PORTALS, GOVT_PORTALS, MODULE_ARTICLES } from "../../data/moduleResources";
import { ModuleArtworkSvg, PoliceCrestSvg } from "./PortalVectorArt";
import "./ModuleResourceCompanion.css";

/**
 * [COMPONENT] ModuleResourceCompanion — Official Govt Portals Dock, Vector Art & Rules Articles
 * Supports variant="dashboard" (Portal Hub on Home) & variant="module" (Context Article & Links inside every Module).
 */
export default function ModuleResourceCompanion({
  variant = "module",
  moduleId = "STRENGTH",
  language = "hi"
}) {
  const english = language === "en";

  if (variant === "dashboard") {
    return (
      <section
        aria-label={english ? "Official Government Portals & Establishment Hub" : "आधिकारिक सरकारी पोर्टल एवं स्थापना केंद्र"}
        className="companion-dashboard-hub"
      >
        <div className="companion-hub-hero">
          <div className="companion-hub-hero-copy">
            <span className="companion-eyebrow">
              <span className="material-symbols-outlined g-icon" aria-hidden="true">verified_user</span>
              {english ? "RAJASTHAN POLICE · E-GOVERNANCE GATEWAY" : "राजस्थान पुलिस · ई-गवर्नेंस एवं सरकारी पोर्टल"}
            </span>
            <h3 className="companion-hub-title">
              {english ? "Integrated Government Portals & Service Rules" : "समेकित सरकारी वेबसाइट्स एवं सेवा नियम केंद्र"}
            </h3>
            <p className="companion-hub-desc">
              {english
                ? "Direct access to Rajasthan SSO, RajKaj, IFMS 3.0, Finance Department RSR Rules, SIPF, and iGOT Karmayogi right from your establishment workspace."
                : "राजस्थान एसएसओ, राज-काज, IFMS 3.0, वित्त विभाग (RSR), SIPF एवं iGOT कर्मयोगी पोर्टल के त्वरित लिंक — सभी विभागीय कार्यों के लिए एक स्थान पर।"}
            </p>
          </div>
          <div className="companion-hub-art">
            <PoliceCrestSvg className="portal-crest-svg" />
            <div className="companion-photo-trio">
              <img src="/assets/arras/starter-botanical.png" alt="Botanical Calm" className="companion-thumb-photo" />
              <img src="/assets/arras/starter-architecture.png" alt="Architectural Harmony" className="companion-thumb-photo" />
              <img src="/assets/arras/starter-coast.png" alt="Coastal Horizon" className="companion-thumb-photo" />
            </div>
          </div>
        </div>

        <div className="companion-portal-grid">
          {ALL_GOVT_PORTALS.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="companion-portal-card"
            >
              <div className="companion-portal-top">
                <span className="companion-portal-icon-wrap">
                  <span className="material-symbols-outlined g-icon" aria-hidden="true">
                    {portal.icon}
                  </span>
                </span>
                <span className="companion-portal-badge">{portal.badge}</span>
              </div>
              <strong className="companion-portal-title">
                {english ? portal.title : portal.hiTitle}
              </strong>
              <span className="companion-portal-summary">{portal.summary}</span>
              <span className="companion-portal-open">
                <span className="material-symbols-outlined g-icon" aria-hidden="true">open_in_new</span>
                {portal.url.replace("https://", "")}
              </span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  const article = MODULE_ARTICLES[moduleId];
  if (!article) return null;
  const linkedPortals = article.portals.map((id) => GOVT_PORTALS[id]).filter(Boolean);

  return (
    <aside
      aria-label={english ? "Module Establishment Brief & Official Links" : "विभागीय नियम लेख एवं आधिकारिक लिंक"}
      className="companion-module-card"
    >
      <div className="companion-module-body">
        <div className="companion-module-meta">
          <span className="companion-eyebrow">
            <span className="material-symbols-outlined g-icon" aria-hidden="true">article</span>
            {article.tag}
          </span>
          <h3 className="companion-module-title">
            {english ? article.enTitle : article.hiTitle}
          </h3>
          <p className="companion-module-text">
            {english ? article.enArticle : article.hiArticle}
          </p>
        </div>

        <div className="companion-module-links">
          {linkedPortals.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="companion-link-pill"
              title={portal.summary}
            >
              <span className="material-symbols-outlined g-icon" aria-hidden="true">
                {portal.icon}
              </span>
              <span>{english ? portal.title : portal.hiTitle}</span>
              <span className="material-symbols-outlined g-icon-sm" aria-hidden="true">open_in_new</span>
            </a>
          ))}
        </div>
      </div>

      <div className="companion-module-art">
        <img
          src={
            article.artType === "waves"
              ? "/assets/arras/starter-coast.png"
              : article.artType === "stones"
                ? "/assets/arras/starter-architecture.png"
                : "/assets/arras/starter-botanical.png"
          }
          alt={article.tag}
          className="companion-module-photo"
        />
        <ModuleArtworkSvg artType={article.artType} className="companion-art-svg" />
      </div>
    </aside>
  );
}
