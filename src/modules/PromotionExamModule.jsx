import React, { useState } from "react";

export default function PromotionExamModule({ records, setRecords, allSheets, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [examType, setExamType] = useState("PCC Exam (FC to HC)");
  const [newRank, setNewRank] = useState("HC");
  const [orderNo, setOrderNo] = useState("");

  const promoRows = (allSheets["Posting_History"] || []).filter((r) => String(r["POSTING_PLACE"] || "").includes("PCC") || String(r["POSTING_PLACE"] || "").includes("DPC"));

  const handlePromote = (e) => {
    e.preventDefault();
    const bUp = belt.trim().toUpperCase();
    // Master रिकॉर्ड में पद (CADER) अपडेट करें
    setRecords((prev) =>
      prev.map((r) => (String(r["BELT NO"] || "").trim().toUpperCase() === bUp ? { ...r, CADER: newRank } : r))
    );
    const entry = {
      "BELT NO": bUp,
      NAME: name.trim(),
      POSTING_PLACE: `[${examType}] -> ${newRank}`,
      ORDER_NO_DATE: orderNo,
      REMARK: "Promotion / PCC"
    };
    setAllSheets((prev) => ({ ...prev, Posting_History: [entry, ...(prev["Posting_History"] || [])] }));
    alert(`पदोन्नति रिकॉर्ड सेव हो गया और पद '${newRank}' अपडेट कर दिया गया!`);
    setOrderNo("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎓 11. पदोन्नति एवं विभागीय परीक्षा (PCC Exam / DPC)</h2>
      <form onSubmit={handlePromote} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "14px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="कर्मचारी का नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <select value={examType} onChange={(e) => setExamType(e.target.value)} style={{ padding: "8px" }}>
          <option>PCC Exam (FC to HC)</option>
          <option>PCC Exam (HC to ASI)</option>
          <option>DPC Promotion (ASI to SI)</option>
          <option>DPC Promotion (SI to CI)</option>
        </select>
        <select value={newRank} onChange={(e) => setNewRank(e.target.value)} style={{ padding: "8px" }}>
          <option value="HC">नया पद: HC</option>
          <option value="ASI">नया पद: ASI</option>
          <option value="SI">नया पद: SI</option>
          <option value="CI">नया पद: CI</option>
        </select>
        <input type="text" required placeholder="DOB / आदेश नं." value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          ✅ Save Promotion
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px" }}>BELT NO</th>
            <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
            <th style={{ padding: "8px" }}>परीक्षा / पदोन्नति विवरण</th>
            <th style={{ padding: "8px" }}>आदेश नं.</th>
          </tr>
        </thead>
        <tbody>
          {promoRows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#15803D" }}>{r["POSTING_PLACE"]}</td>
              <td style={{ padding: "6px", textAlign: "center" }}>{r["ORDER_NO_DATE"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
