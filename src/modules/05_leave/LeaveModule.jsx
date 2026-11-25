import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet } from "../../shared/commonFunctions";
import { getLeaveBalance } from "./leaveLogic";
import "./leave.css";

const LEAVE_TYPES = ["PL", "CL", "Medical", "Maternity", "Paternity"];

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
    <div className="leave-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
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

      <form onSubmit={handleAddLeave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">{english ? "Select Employee / Belt" : "कर्मचारी / बेल्ट चुनें"}</option>
          {records.map((record) => (
            <option
              key={record._uid || record["BELT NO"]}
              value={String(record["BELT NO"] || "").trim().toUpperCase()}
              style={isDevlysText(record.NAME) ? { fontFamily: "'DevLys 010', sans-serif", fontSize: "17px" } : undefined}
            >
              {record["BELT NO"]} — {record.NAME}
            </option>
          ))}
        </select>
        <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} style={{ padding: "8px" }}>
          {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="number" min="2000" max="2200" placeholder={english ? "Year" : "वर्ष"} value={year} onChange={(event) => setYear(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "From (DD-MM-YYYY)" : "कब से (DD-MM-YYYY)"} value={fromDt} onChange={(event) => setFromDt(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "To (DD-MM-YYYY)" : "कब तक (DD-MM-YYYY)"} value={toDt} onChange={(event) => setToDt(event.target.value)} style={{ padding: "8px" }} />
        <input type="number" required min="1" placeholder={english ? "Total Days" : "कुल दिन"} value={days} onChange={(event) => setDays(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "Order No." : "स्वीकृति आदेश नं."} value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder={english ? "Remark" : "रिमार्क"} value={remark} onChange={(event) => setRemark(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ✅ {english ? "Save Leave" : "स्वीकृति दर्ज करें"}
        </button>
      </form>

      {selectedBalance && (
        <p style={{ fontWeight: "bold", color: "#0369A1" }}>
          <HindiText text={employee.NAME} /> — {english ? "Earned PL" : "अर्जित PL"}: {selectedBalance["कुल अर्जित PL"]}, {english ? "Used" : "ली गई PL"}: {selectedBalance["कुल ली गई PL"]}, {english ? "Balance" : "शेष"}: {selectedBalance["शेष PL (Max 300)"]}
        </p>
      )}
      <h3>{english ? "PL Account" : "PL खाता"} ({plAccount.length})</h3>
      <div className="table-responsive-box" style={{ overflowX: "auto", marginBottom: "18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Post" : "पद",
                english ? "Total Earned PL" : "कुल अर्जित PL",
                english ? "Used PL" : "कुल ली गई PL",
                english ? "Balance PL (Max 300)" : "शेष PL (अधिकतम 300)"
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {plAccount.map((row, index) => (
              <tr key={row._uid || `${row["BELT NO"]}-${index}`}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row.NAME} /></td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.CADER}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["कुल अर्जित PL"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["कुल ली गई PL"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", fontFamily: "'Times New Roman', Times, serif" }}>{row["शेष PL (Max 300)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{english ? "Leave Approval Entries" : "अवकाश स्वीकृति / प्रविष्टि आदेश"} ({ledger.length})</h3>
      <div className="table-responsive-box" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              {[
                english ? "Belt No." : "बेल्ट नं.",
                english ? "Name" : "नाम",
                english ? "Type" : "प्रकार",
                english ? "Year" : "वर्ष",
                english ? "Duration" : "अवधि",
                english ? "Days" : "दिन",
                english ? "Order No." : "आदेश नं."
              ].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {leaveRows.map((row, index) => (
              <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={row.NAME} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}>{row["अवकाश प्रकार"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["वर्ष"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["अवधि"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["दिन"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["आदेश नं."]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
