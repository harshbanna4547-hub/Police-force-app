import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet } from "../../shared/commonFunctions";
import { getLeaveBalance } from "./leaveLogic";
import "./leave.css";

const LEAVE_TYPES = ["PL", "CL", "Medical", "Maternity", "Paternity"];

/**
 * [COMPONENT] LeaveModule — अवकाश प्रविष्टि एवं उपार्जित अवकाश (PL) लेखा प्रबंधन
 */
export default function LeaveModule({ records = [], plLeaveRows, setPlLeaveRows, setAllSheets, language = "hi" }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [belt, setBelt] = useState("");
  const [leaveType, setLeaveType] = useState("PL");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [days, setDays] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [remark, setRemark] = useState("");
  const english = language === "en";

  // [FILTER] Gender & search filter on employee records
  const filteredRecords = useMemo(() => {
    const byGender = filterEmployeesByGender(records, gender);
    if (!search.trim()) return byGender;
    return byGender.filter((r) => matchesEmployeeSearch(r, search, ["NAME", "BELT NO", "CADER", "POSTING"]));
  }, [records, gender, search]);

  const employee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);
  const ledger = useMemo(() => (Array.isArray(plLeaveRows) ? plLeaveRows : []), [plLeaveRows]);
  const plAccount = useMemo(() => filteredRecords.map((record) => {
    const { earned, used, balance } = getLeaveBalance(record, ledger);
    return {
      _uid: record._uid,
      "BELT NO": record["BELT NO"],
      NAME: record.NAME,
      CADER: record.CADER,
      "कुल अर्जित PL": earned,
      "कुल ली गई PL": used,
      "शेष PL (Max 300)": balance
    };
  }), [filteredRecords, ledger]);

  const selectedBalance = plAccount.find((row) => String(row["BELT NO"] || "").trim().toUpperCase() === belt);

  const handleAddLeave = (event) => {
    event.preventDefault();
    const requestedDays = Number(days);
    if (!belt || !employee || !Number.isFinite(requestedDays) || requestedDays <= 0) {
      alert(english ? "Select employee and valid leave days." : "कर्मचारी और वैध अवकाश दिवस चुनें।");
      return;
    }
    if (leaveType === "PL" && requestedDays > (selectedBalance?.["शेष PL (Max 300)"] || 0)) {
      alert(english ? "Requested PL days exceed available PL balance." : "दर्ज PL दिवस उपलब्ध PL शेष से अधिक हैं।");
      return;
    }
    const newEntry = {
      "BELT NO": employee["BELT NO"],
      NAME: employee.NAME,
      LEAVE_TYPE: leaveType,
      LEAVE_YEAR: year,
      FROM_DATE: fromDt,
      TO_DATE: toDt,
      DAYS_TAKEN: requestedDays,
      ORDER_NO_DATE: orderNo,
      REMARK: remark
    };
    setPlLeaveRows((previous) => [newEntry, ...(previous || [])]);
    appendRowToSheet(setAllSheets, "PL_Leave_Account", newEntry);
    setFromDt("");
    setToDt("");
    setDays("");
    setOrderNo("");
    setRemark("");
  };

  const leaveRows = ledger.map((row) => ({
    "BELT NO": row["BELT NO"],
    NAME: row.NAME || "",
    "अवकाश प्रकार": row.LEAVE_TYPE || row.REMARK,
    "वर्ष": row.LEAVE_YEAR,
    "अवधि": `${row.FROM_DATE || ""} - ${row.TO_DATE || ""}`,
    "दिन": row.DAYS_TAKEN ?? row.DAYS,
    "आदेश नं.": row.ORDER_NO_DATE || row.ORDER
  }));

  return (
    <div className="leave-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "🏖️ Leave & Earned PL Account" : "🏖️ अवकाश एवं उपार्जित अवकाश लेखा"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={leaveRows}
        fileName="Leave_Ledger"
        language={language}
      />

      <form onSubmit={handleAddLeave} className="module-form-card">
        <select required value={belt} onChange={(event) => setBelt(event.target.value)}>
          <option value="">{english ? "Select Employee / Belt" : "कर्मचारी / बेल्ट चुनें"}</option>
          {records.map((record) => (
            <option
              key={record._uid || record["BELT NO"]}
              value={String(record["BELT NO"] || "").trim().toUpperCase()}
              className={isDevlysText(record.NAME) ? "devlys-text" : undefined}
            >
              {record["BELT NO"]} — {record.NAME}
            </option>
          ))}
        </select>
        <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)}>
          {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="number" min="2000" max="2200" placeholder={english ? "Year" : "वर्ष"} value={year} onChange={(event) => setYear(event.target.value)} />
        <input type="text" placeholder={english ? "From (DD-MM-YYYY)" : "कब से (DD-MM-YYYY)"} value={fromDt} onChange={(event) => setFromDt(event.target.value)} />
        <input type="text" placeholder={english ? "To (DD-MM-YYYY)" : "कब तक (DD-MM-YYYY)"} value={toDt} onChange={(event) => setToDt(event.target.value)} />
        <input type="number" required min="1" placeholder={english ? "Total Days" : "कुल दिन"} value={days} onChange={(event) => setDays(event.target.value)} />
        <input type="text" placeholder={english ? "Order No." : "स्वीकृति आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} />
        <input type="text" placeholder={english ? "Remark" : "रिमार्क"} value={remark} onChange={(event) => setRemark(event.target.value)} />
        <button type="submit" className="module-btn-success">
          ✅ {english ? "Save Leave" : "स्वीकृति दर्ज करें"}
        </button>
      </form>

      {selectedBalance && (
        <p className="module-cell-accent-cyan">
          <HindiText text={employee.NAME} /> — {english ? "Earned PL" : "अर्जित PL"}: {selectedBalance["कुल अर्जित PL"]}, {english ? "Used" : "ली गई PL"}: {selectedBalance["कुल ली गई PL"]}, {english ? "Balance" : "शेष"}: {selectedBalance["शेष PL (Max 300)"]}
        </p>
      )}

      <h3>{english ? "PL Account" : "PL खाता"} ({plAccount.length})</h3>
      <div className="table-responsive-box leave-account-wrap">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Post" : "पद",
                english ? "Total Earned PL" : "कुल अर्जित PL",
                english ? "Used PL" : "कुल ली गई PL",
                english ? "Balance PL (Max 300)" : "शेष PL (अधिकतम 300)"
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {plAccount.map((row, index) => (
              <tr key={row._uid || `${row["BELT NO"]}-${index}`}>
                <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                <td className="module-cell-center english-cell">{row.CADER}</td>
                <td className="module-cell-center english-cell">{row["कुल अर्जित PL"]}</td>
                <td className="module-cell-center english-cell">{row["कुल ली गई PL"]}</td>
                <td className="module-cell-center module-cell-bold english-cell">{row["शेष PL (Max 300)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>{english ? "Leave Approval Entries" : "अवकाश स्वीकृति / प्रविष्टि आदेश"} ({ledger.length})</h3>
      <div className="table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Type" : "प्रकार",
                english ? "Year" : "वर्ष",
                english ? "Duration" : "अवधि",
                english ? "Days" : "दिन",
                english ? "Order No." : "आदेश नं."
              ].map((heading) => <th key={heading}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {leaveRows.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`}>
                <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                <td className="module-cell-center">{row["अवकाश प्रकार"]}</td>
                <td className="module-cell-center english-cell">{row["वर्ष"]}</td>
                <td className="module-cell-center english-cell">{row["अवधि"]}</td>
                <td className="module-cell-center english-cell">{row["दिन"]}</td>
                <td className="module-cell-center english-cell">{row["आदेश नं."]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
