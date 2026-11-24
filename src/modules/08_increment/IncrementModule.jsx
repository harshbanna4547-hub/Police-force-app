import { useMemo, useState } from "react";
import ExportBar from "../../core/ExportBar";
import { calculateServiceYears, formatDateDDMMYYYY, parseAnyDate } from "../../shared/commonFunctions";

export default function IncrementModule({ records = [], allSheets = {}, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [payLevel, setPayLevel] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [targetDate] = useState(() => {
    const today = new Date();
    const nextIncrementDate = new Date(today.getFullYear(), 6, 1);
    if (nextIncrementDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      nextIncrementDate.setFullYear(nextIncrementDate.getFullYear() + 1);
    }
    return nextIncrementDate;
  });
  const incDate = formatDateDDMMYYYY(targetDate);
  const history = allSheets["Posting_History"] || [];
  const candidates = useMemo(() => records.flatMap((record) => {
    const joiningDate = parseAnyDate(record["DATE OF JOINING"]);
    if (!joiningDate || joiningDate > targetDate) return [];
    const employeeBelt = String(record["BELT NO"] || "").trim().toUpperCase();
    const lwpRows = (allSheets["PL_Leave_Account"] || []).filter((row) =>
      String(row["BELT NO"] || "").trim().toUpperCase() === employeeBelt &&
      String(row["LEAVE_TYPE"] || row.REMARK || "").toUpperCase().includes("LWP")
    );
    const punishmentRows = (allSheets["Saja_Record"] || []).filter((row) =>
      String(row["BELT NO"] || "").trim().toUpperCase() === employeeBelt
    );
    return [{
      record,
      belt: record["BELT NO"],
      name: record.NAME,
      cader: record.CADER,
      posting: record.POSTING,
      lwpReview: lwpRows.length,
      punishmentReview: punishmentRows.length
    }];
  }), [records, allSheets, targetDate]);
  const rows = history.filter((row) => String(row["POSTING_PLACE"] || "").includes("[Increment]"));
  const exportRows = candidates.map(({ belt: employeeBelt, name, cader, posting, lwpReview, punishmentReview }) => ({
    "BELT NO": employeeBelt,
    CADER: cader,
    NAME: devToHindi(name),
    POSTING: devToHindi(posting),
    "LWP रिकॉर्ड समीक्षा": lwpReview,
    "सजा रिकॉर्ड समीक्षा": punishmentReview
  }));
  const selectedEmployee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);

  const handleSave = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert("कृपया सूची से कर्मचारी चुनें।");
      return;
    }
    const entry = {
      "BELT NO": selectedEmployee["BELT NO"],
      NAME: selectedEmployee.NAME,
      POSTING_PLACE: `[Increment] Pay Level: ${payLevel || "रिकॉर्ड में दर्ज करें"}`,
      FROM_DATE: incDate,
      ORDER_NO_DATE: orderNo,
      REMARK: "Annual Increment; LWP/Punishment review required"
    };
    setAllSheets((previous) => ({
      ...previous,
      Posting_History: [entry, ...(previous["Posting_History"] || [])]
    }));
    setOrderNo("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>📈 वार्षिक वेतन वृद्धि — 1 जुलाई ({incDate})</h2>
        <ExportBar title="वेतन वृद्धि पात्रता समीक्षा" rows={exportRows} fileName="Annual_Increment_Review" />
      </div>
      <p style={{ color: "#92400E" }}>LWP और सजा रिकॉर्ड समीक्षा के लिए दिखाए जाते हैं; वे स्वतः वेतन वृद्धि नहीं रोकते। अंतिम निर्णय सक्षम अधिकारी द्वारा करें।</p>
      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">कर्मचारी चुनें</option>
          {candidates.map(({ record }) => <option key={record._uid || record["BELT NO"]} value={String(record["BELT NO"] || "").trim().toUpperCase()}>{record["BELT NO"]} — {devToHindi(record.NAME)}</option>)}
        </select>
        <input type="text" placeholder="Pay Level / वेतन मैट्रिक्स" value={payLevel} onChange={(event) => setPayLevel(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="आदेश नं." value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ वृद्धि आदेश दर्ज करें</button>
      </form>

      <h3>1 जुलाई के लिए कर्मचारी एवं सेवा रिकॉर्ड समीक्षा ({candidates.length})</h3>
      <div style={{ overflowX: "auto", marginBottom: "18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "पद", "नाम", "वर्तमान थाना / कार्यालय", "LWP रिकॉर्ड", "सजा रिकॉर्ड"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{candidates.map(({ record, belt: employeeBelt, name, cader, posting, lwpReview, punishmentReview }) => <tr key={record._uid || employeeBelt} style={{ borderBottom: "1px solid #E2E8F0" }}>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{employeeBelt}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{cader}</td>
            <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(name)}</td>
            <td style={{ padding: "6px" }}>{devToHindi(posting)}</td>
            <td style={{ padding: "6px", textAlign: "center" }}>{lwpReview ? `${lwpReview} दर्ज` : "कोई दर्ज रिकॉर्ड नहीं"}</td>
            <td style={{ padding: "6px", textAlign: "center" }}>{punishmentReview ? `${punishmentReview} दर्ज` : "कोई दर्ज रिकॉर्ड नहीं"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <h3>दर्ज वृद्धि आदेश ({rows.length})</h3>
      <ExportBar title="दर्ज वेतन वृद्धि आदेश" rows={rows} fileName="Increment_Orders" />
      <div style={{ overflowX: "auto", marginTop: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "नाम", "विवरण", "दिनांक", "आदेश नं."].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
            <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(row.NAME)}</td>
            <td style={{ padding: "6px", textAlign: "center" }}>{row["POSTING_PLACE"]}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["FROM_DATE"]}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["ORDER_NO_DATE"]}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
