import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, calculateServiceYears, formatDateDDMMYYYY, formatDateOnly, parseAnyDate } from "../../shared/commonFunctions";
import { getNextIncrementDate, isIncrementEligible } from "./incrementLogic";
import "./increment.css";

/**
 * [COMPONENT] IncrementModule — 1 जुलाई वार्षिक वेतन वृद्धि पात्रता समीक्षा एवं आदेश
 */
export default function IncrementModule({
  records = [],
  allSheets = {},
  setAllSheets,
  initialTab = "ANNUAL",
  language = "hi"
}) {
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");
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

  const incrementSectionLabel = initialTab === "WITHHELD"
    ? (english ? "Withheld / Deferred" : "रोकी / स्थगित जांच")
    : (english ? `1 July (${incDate})` : `1 जुलाई (${incDate})`);

  return (
    <div className="increment-module module-panel">
      <ModuleHeaderToolbar
        title={english ? `📈 Annual Increment — 1 July (${incDate})` : `📈 वार्षिक वेतन वृद्धि — 1 जुलाई (${incDate})`}
        sectionLabel={incrementSectionLabel}
        search={search}
        onSearchChange={setSearch}
        rows={exportRows}
        fileName="Annual_Increment_Review"
        language={language}
      />

      <p className="module-notice-warn">
        {english
          ? "LWP and punishment records are shown for review; final decision rests with the competent authority."
          : "LWP और सजा रिकॉर्ड समीक्षा के लिए दिखाए जाते हैं; वे स्वतः वेतन वृद्धि नहीं रोकते। अंतिम निर्णय सक्षम अधिकारी द्वारा करें।"}
      </p>

      <form onSubmit={handleSave} className="module-form-card">
        <select required value={belt} onChange={(event) => setBelt(event.target.value)}>
          <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
          {candidates.map(({ record }) => (
            <option
              key={record._uid || record["BELT NO"]}
              value={String(record["BELT NO"] || "").trim().toUpperCase()}
              className={isDevlysText(record.NAME) ? "devlys-text" : undefined}
            >
              {record["BELT NO"]} — {record.NAME}
            </option>
          ))}
        </select>
        <input type="text" placeholder={english ? "Pay Level / Matrix" : "Pay Level / वेतन मैट्रिक्स"} value={payLevel} onChange={(event) => setPayLevel(event.target.value)} />
        <input type="text" required placeholder={english ? "Order No." : "आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} />
        <button type="submit" className="module-btn-success">
          ✅ {english ? "Record Increment Order" : "वृद्धि आदेश दर्ज करें"}
        </button>
      </form>

      <h3>{english ? `1 July Increment Eligibility Review (${candidates.length})` : `1 जुलाई के लिए कर्मचारी एवं सेवा रिकॉर्ड समीक्षा (${candidates.length})`}</h3>
      <div className="table-responsive-box increment-table-wrap">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Post" : "पद",
                english ? "Name" : "नाम",
                english ? "Current Posting" : "वर्तमान थाना / कार्यालय",
                english ? "Service Yrs" : "सेवा वर्ष",
                english ? "LWP Record" : "LWP रिकॉर्ड",
                english ? "Punishment Record" : "सजा रिकॉर्ड"
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {candidates.map(({ record, belt: employeeBelt, name, cader, posting, serviceYears, lwpReview, punishmentReview }) => (
              <tr key={record._uid || employeeBelt}>
                <td className="module-cell-center english-cell">{employeeBelt}</td>
                <td className="module-cell-center english-cell">{cader}</td>
                <td className="module-cell-bold"><HindiText text={name} /></td>
                <td><HindiText text={posting} /></td>
                <td className="module-cell-center english-cell">{serviceYears}</td>
                <td className="module-cell-center">{lwpReview ? `${lwpReview}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
                <td className="module-cell-center">{punishmentReview ? `${punishmentReview}` : (english ? "None" : "कोई दर्ज रिकॉर्ड नहीं")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>{english ? "Recorded Increment Orders" : "दर्ज वृद्धि आदेश"} ({rows.length})</h3>
      <div className="table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Details" : "विवरण",
                english ? "Date" : "दिनांक",
                english ? "Order No." : "आदेश नं."
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`}>
                <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                <td className="module-cell-center">{row["POSTING_PLACE"]}</td>
                <td className="module-cell-center english-cell">{formatDateOnly(row["FROM_DATE"])}</td>
                <td className="module-cell-center english-cell">{formatDateOnly(row["ORDER_NO_DATE"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
