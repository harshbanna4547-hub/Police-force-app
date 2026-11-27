import ExportBar from "../../core/ExportBar";
import "./ModuleHeaderToolbar.css";

/**
 * [COMPONENT] ModuleHeaderToolbar — मॉड्यूल शीर्ष नियंत्रण पट्टी
 * Single Row: Module Title + Slim Search Bar + Extra Actions + Icon Export Buttons
 * Breadcrumb strip removed — navigation handled by Back buttons inside each module.
 */
export default function ModuleHeaderToolbar({
  title,
  // eslint-disable-next-line no-unused-vars
  sectionLabel: _sectionLabel,
  // eslint-disable-next-line no-unused-vars
  onHome: _onHome,
  // eslint-disable-next-line no-unused-vars
  onModuleRoot: _onModuleRoot,
  search = "",
  onSearchChange,
  rows = [],
  fileName = "Report",
  language = "hi",
  extraActions = null,
  searchPlaceholder
}) {
  const english = language === "en";

  return (
    <div className="module-toolbar-wrapper module-no-print">
      {/* === TOP ACTION TOOLBAR (TITLE + SEARCH + ICON EXPORT/PRINT) === */}
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
    </div>
  );
}
