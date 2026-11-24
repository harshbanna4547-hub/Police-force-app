import React, { useState } from "react";

export default function LeaveModule({ plLeaveRows, setPlLeaveRows, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState("2026");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [days, setDays] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [remark, setRemark] = useState("");

  const handleAddLeave = (e) => {
    e.preventDefault();
    if (!belt.trim() || !days) return alert("कृपया बेल्ट नं. और अवकाश के दिन भरें!");
    const newEntry = {
      "BELT NO": belt.trim().toUpperCase(),
      NAME: name.trim(),
      LEAVE_YEAR: year,
      FROM_DATE: fromDt,
      TO_DATE: toDt,
      DAYS_TAKEN: Number(days),
      ORDER_NO_DATE: orderNo,
      REMARK: remark
    };
    setPlLeaveRows((prev) => [newEntry, ...prev]);
    alert("अवकाश (Leave) रिकॉर्ड सफलतापूर्वक जुड़ गया!");
    setFromDt(""); setToDt(""); setDays(""); setOrderNo(""); setRemark("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🏖️ 6. अवकाश प्रविष्टि एवं खाता (Leave Account)</h2>
      <form onSubmit={handleAddLeave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="कर्मचारी का नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="वर्ष (2026)" value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब से (DD-MM-YYYY)" value={fromDt} onChange={(e) => setFromDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब तक (DD-MM-YYYY)" value={toDt} onChange={(e) => setToDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="number" required placeholder="कुल दिन (Days)" value={days} onChange={(e) => setDays(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="DOB / आदेश नं." value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="रिमार्क (PL/CL/EL)" value={remark} onChange={(e) => setRemark(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ➕ Save Leave
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>BELT NO</th>
              <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
              <th style={{ padding: "8px" }}>वर्ष</th>
              <th style={{ padding: "8px" }}>कब से - कब तक</th>
              <th style={{ padding: "8px" }}>दिन</th>
              <th style={{ padding: "8px" }}>DOB आदेश नं.</th>
              <th style={{ padding: "8px" }}>रिमार्क</th>
            </tr>
          </thead>
          <tbody>
            {plLeaveRows.slice(0, 100).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["LEAVE_YEAR"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["FROM_DATE"]} - {r["TO_DATE"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#B91C1C" }}>{r["DAYS_TAKEN"] || r["DAYS"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["ORDER_NO_DATE"] || r["ORDER"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{devToHindi(r["REMARK"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
