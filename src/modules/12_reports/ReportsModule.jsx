import { useState, useMemo } from "react";
import ExportBar from "../../core/ExportBar";
import { formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { printTemplateDocument } from "../../shared/printTemplateEngine";
import { filterPostingReport } from "./reportsLogic";
import reportsTemplate from "./reportsTemplate.html?raw";
import "./reports.css";

export default function ReportsModule({ records, devToHindi }) {
  const [psFilter, setPsFilter] = useState("");
  const [tenureFilter, setTenureFilter] = useState("ALL"); // ALL | 5YR | 8YR | NODOB

  const filtered = useMemo(() => {
    const today = new Date();
    return filterPostingReport(records, psFilter, devToHindi).filter((r) => {

      const dobNo = String(r["POSTING DOB NO"] || "").trim();
      const wDob = String(r["WITHOUR DOB"] || "").trim();
      if (tenureFilter === "NODOB") return !dobNo || wDob !== "";

      const pDt = parseAnyDate(dobNo);
      const yrs = pDt ? (today - pDt) / (1000 * 60 * 60 * 24 * 365.25) : 0;
      if (tenureFilter === "5YR") return yrs >= 5 && yrs < 8;
      if (tenureFilter === "8YR") return yrs >= 8;
      return true;
    });
  }, [records, psFilter, tenureFilter, devToHindi]);
  const reportRows = filtered.map((record, index) => ({
    "क्र.": index + 1,
    "POSTING": devToHindi(record.POSTING),
    "CADER": record.CADER,
    "BELT NO": record["BELT NO"],
    "NAME": devToHindi(record.NAME),
    "POSTING DOB NO": record["POSTING DOB NO"],
    "WITHOUT DOB": devToHindi(record["WITHOUR DOB"])
  }));
  const printReport = () => printTemplateDocument(reportsTemplate, {
    departmentTitle: "कार्यालय पुलिस अधीक्षक",
    title: "पदस्थापन एवं कार्यकाल सूची",
    rows: reportRows,
    orderNo: "",
    orderDate: ""
  });

  return (
    <div className="reports-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>📍 पदस्थापन एवं कार्यकाल सूची — {filtered.length}</h2>
        <div className="module-no-print" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ExportBar title="पदस्थापन एवं कार्यकाल सूची" rows={reportRows} fileName="Posting_Tenure_Report" />
          <button type="button" className="module-print-button" onClick={printReport}>🖨️ राजपत्रित प्रारूप प्रिंट</button>
        </div>
      </div>
      <div className="module-filter-bar">
        <input type="text" placeholder="थाना / शाखा या नाम से खोजें..." value={psFilter} onChange={(e) => setPsFilter(e.target.value)} style={{ flex: 1, minWidth: "200px", padding: "8px", borderRadius: "6px", border: "1px solid #94A3B8" }} />
        <select value={tenureFilter} onChange={(e) => setTenureFilter(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #94A3B8" }}>
          <option value="ALL">सभी पदस्थापित (All)</option>
          <option value="5YR">5 वर्ष या अधिक पूर्ण</option>
          <option value="8YR">8 वर्ष या अधिक पूर्ण</option>
          <option value="NODOB">बिना DOB आदेश (Without DOB)</option>
        </select>
      </div>

      <div className="module-table-wrap">
        <table className="module-table">
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>क्र.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>POSTING (थाना/शाखा)</th>
              <th style={{ padding: "8px" }}>पद</th>
              <th style={{ padding: "8px" }}>बेल्ट नं.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>नाम</th>
              <th style={{ padding: "8px" }}>POSTING DOB NO</th>
              <th style={{ padding: "8px" }}>WITHOUT DOB</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{i + 1}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["POSTING"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{formatDateOnly(r["POSTING DOB NO"])}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["WITHOUR DOB"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
