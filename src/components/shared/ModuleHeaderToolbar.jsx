import ExportBar from "../../core/ExportBar";
import { useModuleNavigation } from "./ModuleNavigationContext";
import "./ModuleHeaderToolbar.css";

/**
 * Strips leading emoji / symbol prefixes so breadcrumb labels read cleanly.
 */
function stripLeadingIcon(text) {
  return String(text || "")
    .replace(/^(?:[\p{Extended_Pictographic}\u2600-\u27BF\u2190-\u21FF]|\uFE0F|\u200D|\s)+/u, "")
    .trim();
}

/**
 * [COMPONENT] ModuleHeaderToolbar — मॉड्यूल शीर्ष नियंत्रण पट्टी एवं नेविगेशन ब्रेडक्रम्ब
 * Row 1: Module Title + Slim Search Bar + Extra Actions + 4 Icon-Only Action Buttons
 * Row 2: Full-width Clickable Breadcrumb Path (Home >> Module >> Section)
 */
export default function ModuleHeaderToolbar({
  title,
  sectionLabel = "",
  onHome,
  onModuleRoot,
  search = "",
  onSearchChange,
  rows = [],
  fileName = "Report",
  language = "hi",
  extraActions = null,
  searchPlaceholder
}) {
  const english = language === "en";
  const navContext = useModuleNavigation();

  const homeLabel = english ? "Home" : "होम";
  const cleanTitle = stripLeadingIcon(title);
  const rootLabel = stripLeadingIcon(navContext.moduleTitle) || cleanTitle;
  const leafLabel = stripLeadingIcon(sectionLabel) || (
    cleanTitle && cleanTitle.toLowerCase() !== rootLabel.toLowerCase() ? cleanTitle : ""
  );

  const handleHomeClick = onHome || navContext.onHome;
  const handleModuleRootClick = onModuleRoot || navContext.onModuleRoot;

  return (
    <div className="module-toolbar-wrapper module-no-print">
      {/* === 1. TOP ACTION TOOLBAR (TITLE + SEARCH + ICON EXPORT/PRINT) === */}
      <header className="module-header-toolbar">
        <h2 className="module-toolbar-title">{title}</h2>

        <div className="module-toolbar-controls">
          {onSearchChange && (
            <label className="module-toolbar-search">
              <span className="visually-hidden">{english ? "Search" : "खोजें"}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder || (english ? "🔍 Search..." : "🔍 खोजें...")}
              />
            </label>
          )}
          {extraActions}
          <ExportBar
            title={title}
            rows={rows}
            fileName={fileName}
            actions={["excel", "word", "pdf", "print"]}
            language={language}
          />
        </div>
      </header>

      {/* === 2. FULL-WIDTH CLICKABLE BREADCRUMB PATH (BELOW TOOLBAR, ZERO CLIPPING) === */}
      <nav
        className="module-toolbar-breadcrumb"
        aria-label={english ? "Module breadcrumb" : "मॉड्यूल नेविगेशन पथ"}
      >
        <button
          type="button"
          onClick={handleHomeClick}
          className="module-crumb-link"
          title={english ? "Go to Dashboard" : "डैशबोर्ड पर जाएं"}
        >
          {homeLabel}
        </button>

        {rootLabel && (
          <>
            <span className="module-crumb-sep" aria-hidden="true">&gt;&gt;</span>
            {leafLabel ? (
              <button
                type="button"
                onClick={handleModuleRootClick}
                className="module-crumb-link"
                title={english ? `Open ${rootLabel} root` : `${rootLabel} मुख्य पृष्ठ खोलें`}
              >
                {rootLabel}
              </button>
            ) : (
              <span className="module-crumb-current" aria-current="page">
                {rootLabel}
              </span>
            )}
          </>
        )}

        {leafLabel && (
          <>
            <span className="module-crumb-sep" aria-hidden="true">&gt;&gt;</span>
            <span className="module-crumb-current" aria-current="page">
              {leafLabel}
            </span>
          </>
        )}
      </nav>
    </div>
  );
}
