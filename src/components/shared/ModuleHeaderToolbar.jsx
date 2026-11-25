import ExportBar from "../../core/ExportBar";
import "./ModuleHeaderToolbar.css";

export default function ModuleHeaderToolbar({
  title,
  search = "",
  onSearchChange,
  gender = "ALL",
  onGenderChange,
  rows = [],
  fileName = "Report",
  language = "hi",
  extraActions = null,
  searchPlaceholder
}) {
  const english = language === "en";

  return (
    <header className="module-header-toolbar module-no-print">
      <h2 className="module-toolbar-title">{title}</h2>
      <div className="module-toolbar-controls">
        {onSearchChange && (
          <label className="module-toolbar-search">
            <span className="visually-hidden">{english ? "Search" : "खोजें"}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder || (english ? "🔍 Search name, belt, post, unit..." : "🔍 नाम, बेल्ट, पद या इकाई खोजें...")}
            />
          </label>
        )}
        {onGenderChange && (
          <label className="module-toolbar-gender">
            <span>{english ? "Gender" : "लिंग"}</span>
            <select
              aria-label={english ? "Gender filter" : "लिंग फ़िल्टर"}
              value={gender}
              onChange={(event) => onGenderChange(event.target.value)}
            >
              <option value="ALL">{english ? "All" : "सभी"}</option>
              <option value="MALE">{english ? "Male" : "पुरुष"}</option>
              <option value="FEMALE">{english ? "Female" : "महिला"}</option>
            </select>
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
  );
}
