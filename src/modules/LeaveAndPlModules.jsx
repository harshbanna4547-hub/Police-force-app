import React, { useState } from "react";

// 6. Leave Module (अवकाश प्रविष्टि खाता)
export function LeaveModule({ plLeaveRows, setPlLeaveRows, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [days, setDays] = useState("");
  const [orderNo, setOrderNo] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    const newRow = { "BELT NO": belt.toUpperCase(), NAME: name, FROM_DATE: fromDt, TO_DATE: toDt, DAYS: Number(days), ORDER_NO_DATE: orderNo };
    setPlLeaveRows((prev) => [...prev, newRow]);
    alert("अवकाश रिकॉर्ड जुड़ गया!");
    setDays("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🏖️ 6. अवकाश प्रविष्टि खाता (Leave Account)</h2>
      <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब से" value={fromDt} onChange={(e) => setFromDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब तक" value={toDt} onChange={(e) => setToDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="number" required placeholder="कुल दिन" value={days} onChange={(e) => setDays(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="DOB / आदेश नं." value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>➕ Add Leave</button>
      </form>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px" }}>BELT NO</th><th style={{ padding: "8px", textAlign: "left" }}>NAME</th><th style={{ padding: "8px" }}>कब से</th><th style={{ padding: "8px" }}>कब तक</th><th style={{ padding: "8px" }}>दिन</th><th style={{ padding: "8px" }}>DOB आदेश</th>
          </tr>
        </thead>
        <tbody>
          {plLeaveRows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["FROM_DATE"]}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["TO_DATE"]}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["DAYS"] || r["DAYS_TAKEN"]}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["ORDER_NO_DATE"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 7. 300 PL Chart Module
export function Pl300ChartModule({ plSummary, devToHindi }) {
  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>📊 7. 300 PL अवकाश चार्ट (300 PL Chart)</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>BELT NO</th><th style={{ padding: "8px", textAlign: "left" }}>NAME</th><th style={{ padding: "8px" }}>CADER</th><th style={{ padding: "8px", textAlign: "left" }}>POSTING</th><th style={{ padding: "8px" }}>कुल अर्जित PL</th><th style={{ padding: "8px" }}>ली गई PL</th><th style={{ padding: "8px" }}>शेष PL (Max 300)</th>
            </tr>
          </thead>
          <tbody>
            {plSummary.slice(0, 150).map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["POSTING"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["कुल अर्जित PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["कुल ली गई PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontWeight: "bold", color: "#15803D" }}>{r["शेष PL (Max 300)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
