import React, { useState } from "react";

export default function TransferModule({ records, setRecords, setAttRecords, setDepRecords, devToHindi }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [mode, setMode] = useState("TRANSFER");
  const [orderNo, setOrderNo] = useState("");
  const [newPlace, setNewPlace] = useState("");

  const foundEmp = selectedIdx >= 0 ? records[selectedIdx] : null;

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    const idx = records.findIndex(
      (r) => String(r["BELT NO"] || "").toLowerCase() === q || devToHindi(r["NAME"]).toLowerCase().includes(q)
    );
    if (idx === -1) alert("कर्मचारी नहीं मिला!");
    setSelectedIdx(idx);
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!foundEmp) return;
    const updated = [...records];
    const empCopy = { ...foundEmp };

    if (mode === "TRANSFER") {
      empCopy["POSTING"] = newPlace || empCopy["POSTING"];
      empCopy["POSTING DOB NO"] = orderNo;
      updated[selectedIdx] = empCopy;
      setRecords(updated);
    } else if (mode === "ATTACHMENT") {
      empCopy["WITHOUR DOB"] = `${newPlace} (${orderNo})`;
      updated[selectedIdx] = empCopy;
      setRecords(updated);
      setAttRecords((prev) => [...prev, empCopy]);
    } else if (mode === "DEPUTATION") {
      updated.splice(selectedIdx, 1);
      setRecords(updated);
      setDepRecords((prev) => [...prev, { ...empCopy, POSTING: newPlace }]);
    } else if (mode === "RELIEVE" || mode === "RETIRE") {
      updated.splice(selectedIdx, 1);
      setRecords(updated);
    }

    alert(`कार्यवाही (${mode}) सफलतापूर्वक पूरी हो गई!`);
    setSelectedIdx(-1);
    setOrderNo("");
    setNewPlace("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px", maxWidth: "820px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>⇄ 2. Transfer / Attachment / Deputation / Relieve</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <input type="text" placeholder="बेल्ट नं. या नाम लिखें..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "1px solid #94A3B8" }} />
        <button onClick={handleSearch} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>🔍 Search</button>
      </div>

      {foundEmp && (
        <form onSubmit={handleApply} style={{ backgroundColor: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
          <div style={{ marginBottom: "12px", fontWeight: "bold", color: "#15803D" }}>
            ✔ {devToHindi(foundEmp["NAME"])} ({foundEmp["CADER"]} - {foundEmp["BELT NO"]}) | वर्तमान: {devToHindi(foundEmp["POSTING"])}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>कार्यवाही प्रकार</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
                <option value="TRANSFER">District Transfer</option>
                <option value="ATTACHMENT">Attachment</option>
                <option value="DEPUTATION">Deputation</option>
                <option value="RELIEVE">Relieve</option>
                <option value="RETIRE">Retire / Death</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>आदेश नं. व दिनांक</label>
              <input type="text" required placeholder="875 / 10-07-2026" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>नया थाना / स्थान / रिमार्क</label>
              <input type="text" required value={newPlace} onChange={(e) => setNewPlace(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
            </div>
          </div>
          <button type="submit" style={{ marginTop: "14px", backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "9px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ Apply & Update</button>
        </form>
      )}
    </div>
  );
}
