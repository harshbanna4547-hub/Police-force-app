import React, { useState, useMemo } from "react";

export default function BhartiModule({ records, setRecords, devToHindi }) {
  const [subTab, setSubTab] = useState("FORM"); // FORM | RT_LIST
  const [form, setForm] = useState({
    CADER: "FC (RT)", "BELT NO": "", NAME: "", "FATHER NAME": "",
    POSTING: "पुलिस लाईन चित्तौड़गढ़", "POSTING DOB NO": "", EDUCATION: "12th",
    "DATE OF BIRTH": "", "DATE OF JOINING": "", "MOBILE NO 1": "", DISTRICT: "चित्तौड़गढ़"
  });

  // खाली बेल्ट नंबर (1 से 1750) निकालना
  const vacantBelts = useMemo(() => {
    const used = new Set(records.map((r) => String(r["BELT NO"] || "").replace(/\D/g, "")));
    const free = [];
    for (let i = 1; i <= 1750; i++) {
      if (!used.has(String(i))) free.push(String(i));
    }
    return free;
  }, [records]);

  const rtList = useMemo(() => records.filter((r) => String(r["CADER"] || "").toUpperCase().includes("RT")), [records]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.NAME.trim()) return alert("नाम भरें!");
    setRecords((prev) => [{ ...form, "S.N.": prev.length + 1 }, ...prev]);
    alert("नवीन भर्ती कर्मचारी जुड़ गया है!");
    setForm({ ...form, "BELT NO": "", NAME: "", "FATHER NAME": "", "MOBILE NO 1": "" });
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setSubTab("FORM")} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", backgroundColor: subTab === "FORM" ? "#0B1E3D" : "#E2E8F0", color: subTab === "FORM" ? "#FACC15" : "#1E293B" }}>
          ➕ नवीन भर्ती पंजीयन फॉर्म (खाली बेल्ट: {vacantBelts.length})
        </button>
        <button onClick={() => setSubTab("RT_LIST")} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", backgroundColor: subTab === "RT_LIST" ? "#0B1E3D" : "#E2E8F0", color: subTab === "RT_LIST" ? "#FACC15" : "#1E293B" }}>
          ⚡ सभी रिक्रूट (RT) सूची ({rtList.length})
        </button>
      </div>

      {subTab === "FORM" ? (
        <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", maxWidth: "850px" }}>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>पद (CADER)</label>
            <select value={form.CADER} onChange={(e) => setForm({ ...form, CADER: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
              {["FC (RT)", "FC (MT_RT)", "FC", "HC", "ASI", "SI"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>खाली बेल्ट नं. चुनें</label>
            <select value={form["BELT NO"]} onChange={(e) => setForm({ ...form, "BELT NO": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
              <option value="">-- बेल्ट नं. चुनें --</option>
              {vacantBelts.slice(0, 200).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>नाम *</label>
            <input type="text" required value={form.NAME} onChange={(e) => setForm({ ...form, NAME: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>पिता का नाम</label>
            <input type="text" value={form["FATHER NAME"]} onChange={(e) => setForm({ ...form, "FATHER NAME": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>जन्म तिथि (DD-MM-YYYY)</label>
            <input type="text" value={form["DATE OF BIRTH"]} onChange={(e) => setForm({ ...form, "DATE OF BIRTH": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>नियुक्ति तिथि (DD-MM-YYYY)</label>
            <input type="text" value={form["DATE OF JOINING"]} onChange={(e) => setForm({ ...form, "DATE OF JOINING": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>मोबाइल नं.</label>
            <input type="text" value={form["MOBILE NO 1"]} onChange={(e) => setForm({ ...form, "MOBILE NO 1": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>गृह जिला</label>
            <input type="text" value={form.DISTRICT} onChange={(e) => setForm({ ...form, DISTRICT: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ Save New Recruit</button>
          </div>
        </form>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>बेल्ट नं.</th><th style={{ padding: "8px" }}>पद</th><th style={{ padding: "8px", textAlign: "left" }}>नाम</th><th style={{ padding: "8px", textAlign: "left" }}>पिता का नाम</th><th style={{ padding: "8px" }}>नियुक्ति तिथि</th>
            </tr>
          </thead>
          <tbody>
            {rtList.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["FATHER NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{String(r["DATE OF JOINING"] || "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
