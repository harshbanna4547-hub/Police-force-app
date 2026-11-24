import React, { useState } from "react";

export default function IncrementModule({ allSheets, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [incDate, setIncDate] = useState("01-07-2026");
  const [payLevel, setPayLevel] = useState("L-5");
  const [orderNo, setOrderNo] = useState("");

  const rows = (allSheets["Posting_History"] || []).filter((r) => String(r["POSTING_PLACE"] || "").includes("[Increment]"));

  const handleSave = (e) => {
    e.preventDefault();
    const entry = {
      "BELT NO": belt.trim().toUpperCase(),
      NAME: name.trim(),
      POSTING_PLACE: `[Increment] Pay Level: ${payLevel}`,
      FROM_DATE: incDate,
      ORDER_NO_DATE: orderNo,
      REMARK: "Annual Increment"
    };
    setAllSheets((prev) => ({ ...prev, Posting_History: [entry, ...(prev["Posting_History"] || [])] }));
    alert("वार्षिक वेतन वृद्धि (01-July) रिकॉर्ड सुरक्षित हो गया!");
    setOrderNo("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>📈 8. वार्षिक वेतन वृद्धि (Annual Increment - 01 July)</h2>
      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="कर्मचारी का नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="दिनांक (01-07-2026)" value={incDate} onChange={(e) => setIncDate(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="Pay Level (L-5, L-8)" value={payLevel} onChange={(e) => setPayLevel(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="DOB / आदेश नं." value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ✅ Save Increment
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px" }}>BELT NO</th>
            <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
            <th style={{ padding: "8px" }}>विवरण</th>
            <th style={{ padding: "8px" }}>दिनांक</th>
            <th style={{ padding: "8px" }}>आदेश नं.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["POSTING_PLACE"]}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["FROM_DATE"]}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["ORDER_NO_DATE"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
