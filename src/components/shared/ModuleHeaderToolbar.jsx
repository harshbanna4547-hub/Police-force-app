import ExportBar from "../../core/ExportBar";
import "./ModuleHeaderToolbar.css";

export default function ModuleHeaderToolbar({
  title,
  search,
  onSearchChange,
  gender,
  onGenderChange,
  rows,
  fileName,
  language = "hi"
}) {
  const english = language === "en";

  return (
    <header className="module-header-toolbar">
      <h2>{title}</h2>
      <label className="module-toolbar-search">
        <span className="visually-hidden">{english ? "Search" : "खोजें"}</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={english ? "🔍 Search this module" : "🔍 मॉड्यूल में खोजें"}
        />
      </label>
      <label className="module-toolbar-gender">
        <span>{english ? "Gender" : "लिंग"}</span>
        <select value={gender} onChange={(event) => onGenderChange(event.target.value)}>
          <option value="ALL">{english ? "All" : "सभी"}</option>
          <option value="MALE">{english ? "Male" : "पुरुष"}</option>
          <option value="FEMALE">{english ? "Female" : "महिला"}</option>
        </select>
      </label>
      <ExportBar
        title={title}
        rows={rows}
        fileName={fileName}
        actions={["excel", "word", "pdf", "print"]}
      />
    </header>
  );
}
