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

/**
 * [COMPONENT] PromotionExamModule — PCC एवं DPC पदोन्नति परीक्षा पात्रता समीक्षा
 */
export default function PromotionExamModule({
  records = [],
  setRecords,
  allSheets = {},
  setAllSheets,
  initialTab = "PCC",
  singleTabMode = false,
  language = "hi"
}) {
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");
  const [examType, setExamType] = useState(() =>
    initialTab === "DPC" ? "DPC Promotion (ASI to SI)" : Object.keys(EXAM_PATHS)[0]
  );
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

  const visibleExamPaths = singleTabMode
    ? Object.keys(EXAM_PATHS).filter((type) =>
      initialTab === "DPC" ? type.startsWith("DPC") : type.startsWith("PCC")
    )
    : Object.keys(EXAM_PATHS);

  const promotionSectionLabel = examType.startsWith("DPC")
    ? (english ? "DPC Promotion Review" : "DPC पदोन्नति समीक्षा")
    : (english ? "PCC Exam Eligibility" : "PCC परीक्षा पात्रता");

  return (
    <div className="promotion-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "🎓 Promotion & Exam Eligibility Review" : "🎓 पदोन्नति एवं परीक्षा पात्रता समीक्षा"}
        sectionLabel={promotionSectionLabel}
        search={search}
        onSearchChange={setSearch}
        rows={exportRows}
        fileName="Promotion_Eligibility_Review"
        language={language}
      />

      <p className="module-notice-warn">
        {english
          ? "Service and education filters narrow the list; verify final eligibility manually."
          : "सेवा-अवधि और शिक्षा फ़िल्टर सूची को सीमित करते हैं; विभागीय नियमों के अनुसार अंतिम पात्रता मैनुअल रूप से सत्यापित करें।"}
      </p>

      <div className="promotion-filter-grid">
        <select value={examType} onChange={(event) => { setExamType(event.target.value); setBelt(""); }} className="module-select-control">
          {visibleExamPaths.map((type) => <option key={type}>{type}</option>)}
        </select>
        <label className="promotion-service-label">
          <span>{english ? "Minimum Service Years" : "न्यूनतम सेवा वर्ष"}</span>
          <input type="number" min="0" step="0.5" value={minimumService} onChange={(event) => setMinimumService(event.target.value)} className="module-select-control" />
        </label>
        <select value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} className="module-select-control">
          <option value="ALL">{english ? "Education — All" : "शिक्षा — सभी"}</option>
          {educationOptions.map((education) => <option key={education} value={education}>{education}</option>)}
        </select>
      </div>

      <div className="table-responsive-box promotion-table-wrap">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Post" : "पद",
                english ? "Name" : "नाम",
                english ? "Education" : "शिक्षा",
                english ? "DOJ" : "नियुक्ति तिथि",
                english ? "Service Yrs" : "सेवा वर्ष",
                english ? "Punishments" : "सजा रिकॉर्ड",
                english ? "Select" : "चयन"
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {candidates.map((row) => (
              <tr key={row.record._uid || row.belt}>
                <td className="module-cell-center english-cell">{row.belt}</td>
                <td className="module-cell-center english-cell">{row.cader}</td>
                <td className="module-cell-bold"><HindiText text={row.name} /></td>
                <td className="module-cell-center"><HindiText text={row.education} field="EDUCATION" /></td>
                <td className="module-cell-center english-cell">{row.joiningDate}</td>
                <td className="module-cell-center english-cell">{row.serviceYears}</td>
                <td className="module-cell-center">{row.punishmentCount ? `${row.punishmentCount} ${english ? "Review" : "रिकॉर्ड — समीक्षा"}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
                <td className="module-cell-center">
                  <button type="button" className="module-btn-small" onClick={() => setBelt(String(row.belt || "").trim().toUpperCase())}>
                    {english ? "Select" : "चुनें"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handlePromote} className="module-form-card">
        <div className="promotion-selected-box">
          {selectedEmployee ? (
            <>
              <span className="english-cell">{selectedEmployee["BELT NO"]} — </span>
              <HindiText text={selectedEmployee.NAME} />
            </>
          ) : (
            <span className="module-muted-text">{english ? "Select employee above" : "ऊपर सूची से कर्मचारी चुनें"}</span>
          )}
        </div>
        <input required type="text" placeholder={english ? "DOB / Order No." : "DOB / आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} />
        <input required type="text" placeholder={english ? "Order Date (DD-MM-YYYY)" : "आदेश दिनांक (DD-MM-YYYY)"} value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
        <button type="submit" disabled={!selectedEmployee} className="module-btn-success">
          ✅ {english ? `Promote to ${targetRank}` : `स्वीकृति के बाद पद अपडेट करें (${targetRank})`}
        </button>
      </form>

      <h3>{english ? "Recorded Promotion Orders" : "दर्ज पदोन्नति आदेश"} ({history.length})</h3>
      <div className="table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Exam / Promotion" : "परीक्षा / पदोन्नति",
                english ? "Order No." : "आदेश नं.",
                english ? "Date" : "दिनांक"
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {history.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`}>
                <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                <td className="module-cell-center">{row.POSTING_PLACE}</td>
                <td className="module-cell-center english-cell">{row.ORDER_NO_DATE}</td>
                <td className="module-cell-center english-cell">{formatDateOnly(row.ORDER_DATE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
