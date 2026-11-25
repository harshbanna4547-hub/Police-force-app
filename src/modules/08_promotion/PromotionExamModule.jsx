import { useMemo, useState } from "react";
import ExportBar from "../../core/ExportBar";
import { formatDateDDMMYYYY, formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { getPromotionCandidate } from "./promotionLogic";
import "./promotion.css";

const EXAM_PATHS = {
  "PCC Exam (FC to HC)": { source: "FC", target: "HC" },
  "PCC Exam (HC to ASI)": { source: "HC", target: "ASI" },
  "DPC Promotion (ASI to SI)": { source: "ASI", target: "SI" },
  "DPC Promotion (SI to CI)": { source: "SI", target: "CI" }
};

export default function PromotionExamModule({ records, setRecords, allSheets, setAllSheets, devToHindi }) {
  const [examType, setExamType] = useState(Object.keys(EXAM_PATHS)[0]);
  const [minimumService, setMinimumService] = useState("0");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [reviewDate] = useState(() => new Date());
  const educationOptions = useMemo(() => [...new Set(records.map((record) =>
    String(record.EDUCATION || record.QUALIFICATION || "").trim()
  ).filter(Boolean))].sort(), [records]);
  const sourceRank = EXAM_PATHS[examType].source;
  const targetRank = EXAM_PATHS[examType].target;
  const candidates = useMemo(() => records.flatMap((record) => {
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
      education: education || "रिकॉर्ड उपलब्ध नहीं",
      joiningDate: formatDateDDMMYYYY(joiningDate),
      serviceYears: serviceYears.toFixed(1),
      punishmentCount
    }];
  }), [records, allSheets, sourceRank, minimumService, educationFilter, reviewDate]);
  const selectedEmployee = candidates.find((candidate) =>
    String(candidate.belt || "").trim().toUpperCase() === belt
  )?.record;
  const history = (allSheets["Posting_History"] || []).filter((row) =>
    String(row.POSTING_PLACE || "").includes("[Promotion]")
  );
  const exportRows = candidates.map((row) => ({
    "BELT NO": row.belt,
    CADER: row.cader,
    NAME: devToHindi(row.name),
    EDUCATION: row.education,
    "नियुक्ति तिथि": row.joiningDate,
    "सेवा वर्ष": row.serviceYears,
    "सजा रिकॉर्ड समीक्षा": row.punishmentCount
  }));
  const handlePromote = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert("पात्रता समीक्षा सूची से कर्मचारी चुनें।");
      return;
    }
    if (!window.confirm(`${selectedEmployee.NAME} (${belt}) का ${selectedEmployee.CADER} से ${targetRank} पदोन्नति आदेश दर्ज करें? पात्रता एवं सजा रिकॉर्ड की मैनुअल जाँच सुनिश्चित करें।`)) return;
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
    <div className="promotion-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎓 पदोन्नति एवं परीक्षा पात्रता समीक्षा</h2>
        <ExportBar title="पदोन्नति पात्रता समीक्षा" rows={exportRows} fileName="Promotion_Eligibility_Review" />
      </div>
      <p style={{ color: "#92400E" }}>सेवा-अवधि और शिक्षा फ़िल्टर सूची को सीमित करते हैं; विभागीय नियमों के अनुसार अंतिम पात्रता मैनुअल रूप से सत्यापित करें। सजा रिकॉर्ड स्वतः अयोग्यता नहीं बनाता।</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <select value={examType} onChange={(event) => { setExamType(event.target.value); setBelt(""); }} style={{ padding: "8px" }}>
          {Object.keys(EXAM_PATHS).map((type) => <option key={type}>{type}</option>)}
        </select>
        <label style={{ display: "grid", gap: "4px" }}>न्यूनतम सेवा वर्ष (स्थानीय नियम)
          <input type="number" min="0" step="0.5" value={minimumService} onChange={(event) => setMinimumService(event.target.value)} style={{ padding: "8px" }} />
        </label>
        <select value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} style={{ padding: "8px" }}>
          <option value="ALL">शिक्षा — सभी</option>
          {educationOptions.map((education) => <option key={education} value={education}>{education}</option>)}
        </select>
      </div>
      <div className="table-responsive-box" style={{ overflowX: "auto", marginBottom: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "पद", "नाम", "शिक्षा", "नियुक्ति तिथि", "सेवा वर्ष", "सजा रिकॉर्ड", "चयन"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{candidates.map((row) => <tr key={row.record._uid || row.belt} style={{ borderBottom: "1px solid #E2E8F0" }}>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.belt}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.cader}</td>
            <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(row.name)}</td>
            <td style={{ padding: "6px", textAlign: "center" }}>{row.education}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.joiningDate}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.serviceYears}</td>
            <td style={{ padding: "6px", textAlign: "center" }}>{row.punishmentCount ? `${row.punishmentCount} रिकॉर्ड — समीक्षा` : "कोई दर्ज रिकॉर्ड नहीं"}</td>
            <td style={{ padding: "6px", textAlign: "center" }}><button type="button" onClick={() => setBelt(String(row.belt || "").trim().toUpperCase())}>चुनें</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <form onSubmit={handlePromote} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "18px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input readOnly value={selectedEmployee ? `${selectedEmployee["BELT NO"]} — ${devToHindi(selectedEmployee.NAME)}` : ""} placeholder="ऊपर सूची से कर्मचारी चुनें" style={{ padding: "8px" }} />
        <input required type="text" placeholder="DOB / आदेश नं." value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <input required type="text" placeholder="आदेश दिनांक (DD-MM-YYYY)" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" disabled={!selectedEmployee} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ मैनुअल स्वीकृति के बाद पद अपडेट करें ({targetRank})</button>
      </form>
      <h3>दर्ज पदोन्नति आदेश ({history.length})</h3>
      <ExportBar title="दर्ज पदोन्नति आदेश" rows={history} fileName="Promotion_Orders" />
      <div className="table-responsive-box">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", marginTop: "10px" }}>
        <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "नाम", "परीक्षा / पदोन्नति", "आदेश नं.", "दिनांक"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
        <tbody>{history.map((row, index) => <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
          <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
          <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(row.NAME)}</td>
          <td style={{ padding: "6px", textAlign: "center" }}>{row.POSTING_PLACE}</td>
          <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.ORDER_NO_DATE}</td>
          <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(row.ORDER_DATE)}</td>
        </tr>)}</tbody>
          </table>
      </div>
    </div>
  );
}
