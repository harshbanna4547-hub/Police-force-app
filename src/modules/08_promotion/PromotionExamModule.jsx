import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { formatDateDDMMYYYY, formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { getPromotionCandidate } from "./promotionLogic";
import "./promotion.css";

const EXAM_PATHS = {
  "PCC Exam (FC to HC)": { source: "FC", target: "HC" },
  "PCC Exam (HC to ASI)": { source: "HC", target: "ASI" },
  "DPC Promotion (ASI to SI)": { source: "ASI", target: "SI" },
  "DPC Promotion (SI to CI)": { source: "SI", target: "CI" }
};

export default function PromotionExamModule({ records = [], setRecords, allSheets = {}, setAllSheets, language = "hi" }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [examType, setExamType] = useState(Object.keys(EXAM_PATHS)[0]);
  const [minimumService, setMinimumService] = useState("0");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [reviewDate] = useState(() => new Date());
  const english = language === "en";

  const educationOptions = useMemo(() => [...new Set(records.map((record) =>
    String(record.EDUCATION || record.QUALIFICATION || "").trim()
  ).filter(Boolean))].sort(), [records]);

  const sourceRank = EXAM_PATHS[examType].source;
  const targetRank = EXAM_PATHS[examType].target;

  const filteredRecords = useMemo(() => {
    const byGender = filterEmployeesByGender(records, gender);
    if (!search.trim()) return byGender;
    return byGender.filter((r) => matchesEmployeeSearch(r, search, ["NAME", "BELT NO", "CADER", "POSTING", "EDUCATION"]));
  }, [records, gender, search]);

  const candidates = useMemo(() => filteredRecords.flatMap((record) => {
    const joiningDate = parseAnyDate(record["DATE OF JOINING"]);
    if (!joiningDate) return [];
    const eligibility = getPromotionCandidate(record, sourceRank, minimumService, educationFilter, reviewDate);
    if (!eligibility) return [];
    const { serviceYears, education } = eligibility;
    const employeeBelt = String(record["BELT NO"] || "").trim().toUpperCase();
    const punishmentCount = (allSheets["Saja_Record"] || []).filter(
      (row) => String(row["BELT NO"] || "").trim().toUpperCase() === employeeBelt
    ).length;
    return [{
      record,
      belt: record["BELT NO"],
      name: record.NAME,
      cader: record.CADER,
      education: education || "-",
      joiningDate: formatDateDDMMYYYY(joiningDate),
      serviceYears: serviceYears.toFixed(1),
      punishmentCount
    }];
  }), [filteredRecords, allSheets, sourceRank, minimumService, educationFilter, reviewDate]);

  const selectedEmployee = candidates.find((candidate) =>
    String(candidate.belt || "").trim().toUpperCase() === belt
  )?.record;

  const history = (allSheets["Posting_History"] || []).filter((row) =>
    String(row.POSTING_PLACE || "").includes("[Promotion]")
  );

  const exportRows = candidates.map((row) => ({
    "BELT NO": row.belt,
    CADER: row.cader,
    NAME: row.name,
    EDUCATION: row.education,
    "नियुक्ति तिथि": row.joiningDate,
    "सेवा वर्ष": row.serviceYears,
    "सजा रिकॉर्ड समीक्षा": row.punishmentCount
  }));

  const handlePromote = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert(english ? "Select employee from eligibility list." : "पात्रता समीक्षा सूची से कर्मचारी चुनें।");
      return;
    }
    if (!window.confirm(english
      ? `Record promotion order from ${selectedEmployee.CADER} to ${targetRank} for belt ${belt}?`
      : `बेल्ट ${belt} का ${selectedEmployee.CADER} से ${targetRank} पदोन्नति आदेश दर्ज करें?`)) return;
    const beltKey = belt.trim().toUpperCase();
    const nextRecords = records.map((record) =>
      String(record["BELT NO"] || "").trim().toUpperCase() === beltKey
        ? { ...record, CADER: targetRank, "PROMOTION ORDER NO": orderNo, "PROMOTION ORDER DATE": orderDate }
        : record
    );
    setRecords(nextRecords);
    const entry = {
      "BELT NO": selectedEmployee["BELT NO"],
      NAME: selectedEmployee.NAME,
      POSTING_PLACE: `[Promotion] ${examType} -> ${targetRank}`,
      ORDER_NO_DATE: orderNo,
      ORDER_DATE: orderDate,
      REMARK: "Manual eligibility, education and punishment review completed"
    };
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: nextRecords,
      Posting_History: [entry, ...(previous["Posting_History"] || [])]
    }));
    setBelt("");
    setOrderNo("");
    setOrderDate("");
  };

  return (
    <div className="promotion-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={english ? "🎓 Promotion & Exam Eligibility Review" : "🎓 पदोन्नति एवं परीक्षा पात्रता समीक्षा"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName="Promotion_Eligibility_Review"
        language={language}
      />

      <p style={{ color: "#92400E" }}>
        {english
          ? "Service and education filters narrow the list; verify final eligibility manually."
          : "सेवा-अवधि और शिक्षा फ़िल्टर सूची को सीमित करते हैं; विभागीय नियमों के अनुसार अंतिम पात्रता मैनुअल रूप से सत्यापित करें।"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <select value={examType} onChange={(event) => { setExamType(event.target.value); setBelt(""); }} style={{ padding: "8px" }}>
          {Object.keys(EXAM_PATHS).map((type) => <option key={type}>{type}</option>)}
        </select>
        <label style={{ display: "grid", gap: "4px" }}>
          {english ? "Minimum Service Years" : "न्यूनतम सेवा वर्ष"}
          <input type="number" min="0" step="0.5" value={minimumService} onChange={(event) => setMinimumService(event.target.value)} style={{ padding: "8px" }} />
        </label>
        <select value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} style={{ padding: "8px" }}>
          <option value="ALL">{english ? "Education — All" : "शिक्षा — सभी"}</option>
          {educationOptions.map((education) => <option key={education} value={education}>{education}</option>)}
        </select>
      </div>

      <div className="table-responsive-box" style={{ overflowX: "auto", marginBottom: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Post" : "पद",
                english ? "Name" : "नाम",
                english ? "Education" : "शिक्षा",
                english ? "DOJ" : "नियुक्ति तिथि",
                english ? "Service Yrs" : "सेवा वर्ष",
                english ? "Punishments" : "सजा रिकॉर्ड",
                english ? "Select" : "चयन"
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {candidates.map((row) => (
              <tr key={row.record._uid || row.belt} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.belt}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.cader}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row.name} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row.education}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.joiningDate}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.serviceYears}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row.punishmentCount ? `${row.punishmentCount} ${english ? "Review" : "रिकॉर्ड — समीक्षा"}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>
                  <button type="button" onClick={() => setBelt(String(row.belt || "").trim().toUpperCase())}>
                    {english ? "Select" : "चुनें"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handlePromote} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "18px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <div style={{ padding: "8px", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedEmployee ? (
            <>
              <span>{selectedEmployee["BELT NO"]} — </span>
              <HindiText text={selectedEmployee.NAME} />
            </>
          ) : (
            <span style={{ color: "#64748B" }}>{english ? "Select employee above" : "ऊपर सूची से कर्मचारी चुनें"}</span>
          )}
        </div>
        <input required type="text" placeholder={english ? "DOB / Order No." : "DOB / आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <input required type="text" placeholder={english ? "Order Date (DD-MM-YYYY)" : "आदेश दिनांक (DD-MM-YYYY)"} value={orderDate} onChange={(event) => setOrderDate(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" disabled={!selectedEmployee} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ✅ {english ? `Promote to ${targetRank}` : `स्वीकृति के बाद पद अपडेट करें (${targetRank})`}
        </button>
      </form>

      <h3>{english ? "Recorded Promotion Orders" : "दर्ज पदोन्नति आदेश"} ({history.length})</h3>
      <div className="table-responsive-box">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", marginTop: "10px" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Exam / Promotion" : "परीक्षा / पदोन्नति",
                english ? "Order No." : "आदेश नं.",
                english ? "Date" : "दिनांक"
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {history.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row.NAME} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row.POSTING_PLACE}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.ORDER_NO_DATE}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(row.ORDER_DATE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
