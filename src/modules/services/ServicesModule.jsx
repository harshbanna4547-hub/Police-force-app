import { useMemo, useState } from "react";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { GOVT_PORTALS, SERVICE_PORTAL_CATEGORIES } from "../../data/moduleResources";
import "./services.css";

/**
 * [COMPONENT] ServicesModule — वर्गीकृत आधिकारिक सरकारी एवं पुलिस पोर्टल निर्देशिका
 * Categories:
 * 1. Police & Crime Portals
 * 2. HR, Finance & Service Portals
 * 3. Training & Learning
 */
export default function ServicesModule({ language = "hi" }) {
  const [search, setSearch] = useState("");
  const english = language === "en";
  const query = search.trim().toLowerCase();

  const visibleCategories = useMemo(
    () =>
      SERVICE_PORTAL_CATEGORIES.map((category) => {
        const portals = category.portalIds
          .map((id) => GOVT_PORTALS[id])
          .filter(Boolean)
          .filter((portal) => {
            if (!query) return true;
            return [
              portal.title,
              portal.hiTitle,
              portal.badge,
              portal.summary,
              portal.hiSummary,
              portal.url
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);
          });
        return { ...category, portals };
      }).filter((category) => category.portals.length > 0),
    [query]
  );

  const exportRows = useMemo(
    () =>
      visibleCategories.flatMap((category) =>
        category.portals.map((portal) => ({
          [english ? "Category" : "श्रेणी"]: english ? category.title : category.hiTitle,
          [english ? "Portal" : "पोर्टल"]: english ? portal.title : portal.hiTitle,
          [english ? "Type" : "प्रकार"]: portal.badge,
          [english ? "URL" : "वेबसाइट लिंक"]: portal.url,
          [english ? "Description" : "विवरण"]: english ? portal.summary : (portal.hiSummary || portal.summary)
        }))
      ),
    [visibleCategories, english]
  );

  return (
    <section
      className="services-module module-panel"
      aria-label={english ? "Government & Police Official Portals" : "आधिकारिक सरकारी एवं पुलिस पोर्टल"}
    >
      {/* === TOP UNIFIED TOOLBAR & BREADCRUMB === */}
      <ModuleHeaderToolbar
        title={english ? "🌐 Government & Police Official Portals" : "🌐 सरकारी एवं पुलिस आधिकारिक पोर्टल"}
        search={search}
        onSearchChange={setSearch}
        rows={exportRows}
        fileName="Govt_Official_Portals"
        language={language}
        searchPlaceholder={english ? "🔍 Search portals..." : "🔍 पोर्टल खोजें..."}
      />

      {/* === CATEGORIZED PORTAL SECTIONS === */}
      {visibleCategories.length === 0 ? (
        <div className="services-empty-state">
          {english
            ? "No official portals matched your search."
            : "खोज के अनुसार कोई आधिकारिक पोर्टल नहीं मिला।"}
        </div>
      ) : (
        <div className="services-category-stack">
          {visibleCategories.map((category) => (
            <section
              key={category.id}
              className="services-category-section"
              aria-labelledby={`services-cat-${category.id}`}
            >
              <header className="services-category-header">
                <span className="services-category-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <h3 id={`services-cat-${category.id}`} className="services-category-title">
                  {english ? category.title : category.hiTitle}
                </h3>
                <span className="services-category-count">{category.portals.length}</span>
              </header>

              <div className="services-portal-grid">
                {category.portals.map((portal) => (
                  <a
                    key={portal.id}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="services-portal-card"
                  >
                    <div className="services-card-top">
                      <span className="services-card-icon-wrap" aria-hidden="true">
                        <span className="material-symbols-outlined g-icon">{portal.icon}</span>
                      </span>
                      <span className="services-card-badge">{portal.badge}</span>
                    </div>

                    <strong className="services-card-title">
                      {english ? portal.title : portal.hiTitle}
                    </strong>

                    <span className="services-card-desc">
                      {english ? portal.summary : (portal.hiSummary || portal.summary)}
                    </span>

                    <span className="services-card-url">
                      <span className="material-symbols-outlined g-icon-sm" aria-hidden="true">
                        open_in_new
                      </span>
                      <span>{portal.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
