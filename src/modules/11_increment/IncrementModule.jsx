import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, calculateServiceYears, formatDateDDMMYYYY, formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { getNextIncrementDate, isIncrementEligible } from "./incrementLogic";
import "./increment.css";

export default function IncrementModule({ records = [], allSheets = {}, setAllSheets, language = "hi" }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [payLevel, setPayLevel] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [targetDate] = useState(() => getNextIncrementDate());
  const incDate = formatDateDDMMYYYY(targetDate);
  const english = language === "en";
  const history = allSheets["Posting_History"] || [];

  const filteredRecords = useMemo(() => {
    const byGender = filterEmployeesByGender(records, gender);
    if (!search.trim()) return byGender;
    return byGender.filter((r) => matchesEmployeeSearch(r, search, ["NAME", "BELT NO", "CADER", "POSTING"]));
  }, [records, gender, search]);

  const candidates = useMemo(() => filteredRecords.flatMap((record) => {
    const joiningDate = parseAnyDate(record["DATE OF JOINING"]);
    if (!joiningDate || !isIncrementEligible(record, targetDate)) return [];
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
      serviceYears: calculateServiceYears(joiningDate, targetDate).toFixed(1),
      lwpReview: lwpRows.length,
      punishmentReview: punishmentRows.length
    }];
  }), [filteredRecords, allSheets, targetDate]);

  const rows = history.filter((row) => String(row["POSTING_PLACE"] || "").includes("[Increment]"));
  const exportRows = candidates.map(({ belt: employeeBelt, name, cader, posting, serviceYears, lwpReview, punishmentReview }) => ({
    "BELT NO": employeeBelt,
    CADER: cader,
    NAME: name,
    POSTING: posting,
    "सेवा वर्ष": serviceYears,
    "LWP रिकॉर्ड समीक्षा": lwpReview,
    "सजा रिकॉर्ड समीक्षा": punishmentReview
  }));
  const selectedEmployee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);

  const handleSave = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert(english ? "Select employee from the list." : "कृपया सूची से कर्मचारी चुनें।");
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
    appendRowToSheet(setAllSheets, "Posting_History", entry);
    setOrderNo("");
  };

  return (
    <div className="increment-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={english ? `📈 Annual Increment — 1 July (${incDate})` : `📈 वार्षिक वेतन वृद्धि — 1 जुलाई (${incDate})`}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName="Annual_Increment_Review"
        language={language}
      />

      <p style={{ color: "#92400E" }}>
        {english
          ? "LWP and punishment records are shown for review; final decision rests with the competent authority."
          : "LWP और सजा रिकॉर्ड समीक्षा के लिए दिखाए जाते हैं; वे स्वतः वेतन वृद्धि नहीं रोकते। अंतिम निर्णय सक्षम अधिकारी द्वारा करें।"}
      </p>

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
          {candidates.map(({ record }) => (
            <option
              key={record._uid || record["BELT NO"]}
              value={String(record["BELT NO"] || "").trim().toUpperCase()}
              style={isDevlysText(record.NAME) ? { fontFamily: "'DevLys 010', sans-serif", fontSize: "17px" } : undefined}
            >
              {record["BELT NO"]} — {record.NAME}
            </option>
          ))}
        </select>
        <input type="text" placeholder={english ? "Pay Level / Matrix" : "Pay Level / वेतन मैट्रिक्स"} value={payLevel} onChange={(event) => setPayLevel(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder={english ? "Order No." : "आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ✅ {english ? "Record Increment Order" : "वृद्धि आदेश दर्ज करें"}
        </button>
      </form>

      <h3>{english ? `1 July Increment Eligibility Review (${candidates.length})` : `1 जुलाई के लिए कर्मचारी एवं सेवा रिकॉर्ड समीक्षा (${candidates.length})`}</h3>
      <div className="table-responsive-box" style={{ overflowX: "auto", marginBottom: "18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Post" : "पद",
                english ? "Name" : "नाम",
                english ? "Current Posting" : "वर्तमान थाना / कार्यालय",
                english ? "Service Yrs" : "सेवा वर्ष",
                english ? "LWP Record" : "LWP रिकॉर्ड",
                english ? "Punishment Record" : "सजा रिकॉर्ड"
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {candidates.map(({ record, belt: employeeBelt, name, cader, posting, serviceYears, lwpReview, punishmentReview }) => (
              <tr key={record._uid || employeeBelt} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{employeeBelt}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{cader}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={name} /></td>
                <td style={{ padding: "6px" }}><HindiText text={posting} /></td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{serviceYears}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{lwpReview ? `${lwpReview}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{punishmentReview ? `${punishmentReview}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>{english ? "Recorded Increment Orders" : "दर्ज वृद्धि आदेश"} ({rows.length})</h3>
      <div className="table-responsive-box" style={{ overflowX: "auto", marginTop: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Details" : "विवरण",
                english ? "Date" : "दिनांक",
                english ? "Order No." : "आदेश नं."
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row.NAME} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row["POSTING_PLACE"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(row["FROM_DATE"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(row["ORDER_NO_DATE"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
