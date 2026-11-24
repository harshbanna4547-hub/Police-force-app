import { useMemo, useState } from "react";
import ExportBar from "../core/ExportBar";
import { calculateEarnedPL } from "../utils/reportEngine";

const LEAVE_TYPES = ["PL", "CL", "Medical", "Maternity", "Paternity"];

export default function LeaveModule({ records = [], plLeaveRows, setPlLeaveRows, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [leaveType, setLeaveType] = useState("PL");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [days, setDays] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [remark, setRemark] = useState("");

  const employee = records.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === belt);
  const ledger = useMemo(() => (Array.isArray(plLeaveRows) ? plLeaveRows : []), [plLeaveRows]);
  const plAccount = useMemo(() => records.map((record) => {
    const employeeBelt = String(record["BELT NO"] || "").trim().toUpperCase();
    const used = ledger.reduce((sum, row) => {
      if (String(row["BELT NO"] || "").trim().toUpperCase() !== employeeBelt) return sum;
      const type = String(row["LEAVE_TYPE"] || "").trim().toUpperCase();
      if (type && type !== "PL") return sum;
      return sum + (Number(row["DAYS_TAKEN"] ?? row["DAYS"] ?? 0) || 0);
    }, 0);
    const earned = calculateEarnedPL(record["DATE OF JOINING"]);
    return {
      "BELT NO": record["BELT NO"],
      "NAME": record.NAME,
      "CADER": record.CADER,
      "कुल अर्जित PL": earned,
      "कुल ली गई PL": used,
      "शेष PL (Max 300)": Math.max(0, Math.min(300, earned - used))
    };
  }), [records, ledger]);
  const selectedBalance = plAccount.find((row) => String(row["BELT NO"] || "").trim().toUpperCase() === belt);

  const handleAddLeave = (event) => {
    event.preventDefault();
    const requestedDays = Number(days);
    if (!belt || !employee || !Number.isFinite(requestedDays) || requestedDays <= 0) {
      alert("कर्मचारी और वैध अवकाश दिवस चुनें।");
      return;
    }
    if (leaveType === "PL" && requestedDays > (selectedBalance?.["शेष PL (Max 300)"] || 0)) {
      alert("दर्ज PL दिवस उपलब्ध PL शेष से अधिक हैं।");
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
    setAllSheets((previous) => ({
      ...previous,
      PL_Leave_Account: [newEntry, ...ledger]
    }));
    setFromDt("");
    setToDt("");
    setDays("");
    setOrderNo("");
    setRemark("");
  };

  const leaveRows = ledger.map((row) => ({
    "BELT NO": row["BELT NO"],
    "NAME": devToHindi(row.NAME || row["NAME"]),
    "अवकाश प्रकार": row.LEAVE_TYPE || row.REMARK,
    "वर्ष": row.LEAVE_YEAR,
    "अवधि": `${row.FROM_DATE || ""} - ${row.TO_DATE || ""}`,
    "दिन": row.DAYS_TAKEN ?? row.DAYS,
    "आदेश नं.": row.ORDER_NO_DATE || row.ORDER
  }));

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🏖️ अवकाश एवं उपार्जित अवकाश लेखा</h2>
        <ExportBar title="अवकाश लेखा" rows={leaveRows} fileName="Leave_Ledger" />
      </div>
      <form onSubmit={handleAddLeave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <select required value={belt} onChange={(event) => setBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">कर्मचारी / बेल्ट चुनें</option>
          {records.map((record) => <option key={record._uid || record["BELT NO"]} value={String(record["BELT NO"] || "").trim().toUpperCase()}>{record["BELT NO"]} — {devToHindi(record.NAME)}</option>)}
        </select>
        <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} style={{ padding: "8px" }}>
          {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="number" min="2000" max="2200" placeholder="वर्ष" value={year} onChange={(event) => setYear(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब से (DD-MM-YYYY)" value={fromDt} onChange={(event) => setFromDt(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब तक (DD-MM-YYYY)" value={toDt} onChange={(event) => setToDt(event.target.value)} style={{ padding: "8px" }} />
        <input type="number" required min="1" placeholder="कुल दिन" value={days} onChange={(event) => setDays(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="स्वीकृति आदेश नं." value={orderNo} onChange={(event) => setOrderNo(event.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="रिमार्क" value={remark} onChange={(event) => setRemark(event.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ स्वीकृति दर्ज करें</button>
      </form>

      {selectedBalance && (
        <p style={{ fontWeight: "bold", color: "#0369A1" }}>
          {devToHindi(employee.NAME)} — अर्जित PL: {selectedBalance["कुल अर्जित PL"]}, ली गई PL: {selectedBalance["कुल ली गई PL"]}, शेष: {selectedBalance["शेष PL (Max 300)"]}
        </p>
      )}
      <h3>PL खाता ({plAccount.length})</h3>
      <div style={{ overflowX: "auto", marginBottom: "18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "नाम", "पद", "कुल अर्जित PL", "कुल ली गई PL", "शेष PL (अधिकतम 300)"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{plAccount.map((row, index) => (
            <tr key={records[index]?._uid || row["BELT NO"]}>
              <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
              <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(row.NAME)}</td>
              <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.CADER}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{row["कुल अर्जित PL"]}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{row["कुल ली गई PL"]}</td>
              <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold" }}>{row["शेष PL (Max 300)"]}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <h3>अवकाश स्वीकृति / प्रविष्टि आदेश ({ledger.length})</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "नाम", "प्रकार", "वर्ष", "अवधि", "दिन", "आदेश नं."].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{leaveRows.map((row, index) => <tr key={`${row["BELT NO"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
            {Object.values(row).map((value, cellIndex) => <td key={cellIndex} style={{ padding: "6px", textAlign: cellIndex === 1 ? "left" : "center", fontFamily: cellIndex === 0 || cellIndex > 2 ? "'Times New Roman', Times, serif" : undefined }}>{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
