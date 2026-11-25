import { useState, useMemo } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { printTemplateDocument } from "../../shared/printTemplateEngine";
import reportsTemplate from "./reportsTemplate.html?raw";
import "./reports.css";

export default function ReportsModule({ records = [], language = "hi" }) {
  const [psFilter, setPsFilter] = useState("");
  const [gender, setGender] = useState("ALL");
  const [tenureFilter, setTenureFilter] = useState("ALL"); // ALL | 5YR | 8YR | NODOB
  const english = language === "en";

  const filtered = useMemo(() => {
    const today = new Date();
    return filterEmployeesByGender(records, gender)
      .filter((r) => !psFilter.trim() || matchesEmployeeSearch(r, psFilter, ["POSTING", "NAME", "BELT NO", "CADER"]))
      .filter((r) => {
        const dobNo = String(r["POSTING DOB NO"] || "").trim();
        const wDob = String(r["WITHOUR DOB"] || r["WITHOUT DOB"] || "").trim();
        if (tenureFilter === "NODOB") return !dobNo || wDob !== "";

        const pDt = parseAnyDate(dobNo);
        const yrs = pDt ? (today - pDt) / (1000 * 60 * 60 * 24 * 365.25) : 0;
        if (tenureFilter === "5YR") return yrs >= 5 && yrs < 8;
        if (tenureFilter === "8YR") return yrs >= 8;
        return true;
      });
  }, [records, gender, psFilter, tenureFilter]);

  const reportRows = filtered.map((record, index) => ({
    "क्र.": index + 1,
    POSTING: record.POSTING || "",
    CADER: record.CADER || "",
    "BELT NO": record["BELT NO"] || "",
    NAME: record.NAME || "",
    "POSTING DOB NO": record["POSTING DOB NO"] || "",
    "WITHOUT DOB": record["WITHOUR DOB"] || record["WITHOUT DOB"] || ""
  }));

  const printReport = () => printTemplateDocument(reportsTemplate, {
    departmentTitle: "कार्यालय पुलिस अधीक्षक",
    title: "पदस्थापन एवं कार्यकाल सूची",
    rows: reportRows,
    orderNo: "",
    orderDate: ""
  });

  const extraActions = (
    <div className="reports-toolbar-actions">
      <select value={tenureFilter} onChange={(e) => setTenureFilter(e.target.value)} className="module-select-control">
        <option value="ALL">{english ? "All Postings" : "सभी पदस्थापित (All)"}</option>
        <option value="5YR">{english ? "5+ Years Completed" : "5 वर्ष या अधिक पूर्ण"}</option>
        <option value="8YR">{english ? "8+ Years Completed" : "8 वर्ष या अधिक पूर्ण"}</option>
        <option value="NODOB">{english ? "Without DOB Order" : "बिना DOB आदेश (Without DOB)"}</option>
      </select>
      <button type="button" className="module-print-button" onClick={printReport}>
        🖨️ {english ? "Gazetted Format Print" : "राजपत्रित प्रारूप प्रिंट"}
      </button>
    </div>
  );

  return (
    <div className="reports-module module-panel">
      <ModuleHeaderToolbar
        title={english ? `📍 Posting & Tenure Report (${filtered.length})` : `📍 पदस्थापन एवं कार्यकाल सूची (${filtered.length})`}
        search={psFilter}
        onSearchChange={setPsFilter}
        gender={gender}
        onGenderChange={setGender}
        rows={reportRows}
        fileName="Posting_Tenure_Report"
        language={language}
        extraActions={extraActions}
      />

      {/* [TABLE] Posting & Tenure Records (पदस्थापन एवं कार्यकाल तालिका) */}
      <div className="module-table-wrap table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              <th>{english ? "S.N." : "क्र."}</th>
              <th className="module-cell-left">{english ? "Posting (PS / Branch)" : "POSTING (थाना/शाखा)"}</th>
              <th>{english ? "Post" : "पद"}</th>
              <th>{english ? "Belt No." : "बेल्ट नं."}</th>
              <th className="module-cell-left">{english ? "Name" : "नाम"}</th>
              <th>{english ? "Posting DOB" : "POSTING DOB NO"}</th>
              <th>{english ? "Without DOB" : "WITHOUT DOB"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={r._uid || i}>
                <td className="module-cell-center module-cell-tnr">{i + 1}</td>
                <td className="module-cell-bold"><HindiText text={r["POSTING"]} /></td>
                <td className="module-cell-center module-cell-tnr">{r["CADER"]}</td>
                <td className="module-cell-center module-cell-tnr">{r["BELT NO"]}</td>
                <td><HindiText text={r["NAME"]} /></td>
                <td className="module-cell-center module-cell-tnr">{formatDateOnly(r["POSTING DOB NO"])}</td>
                <td><HindiText text={r["WITHOUR DOB"] || r["WITHOUT DOB"]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
