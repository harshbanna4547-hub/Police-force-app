import React, { useState } from "react";

export default function TrainingModule({ allSheets, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [institute, setInstitute] = useState("");

  const rows = allSheets["Training_History"] || [];

  const handleAdd = (e) => {
    e.preventDefault();
    const newRow = { "BELT NO": belt.toUpperCase(), NAME: name, COURSE_NAME: course, FROM_DATE: fromDt, TO_DATE: toDt, INSTITUTE: institute };
    setAllSheets((prev) => ({ ...prev, Training_History: [...rows, newRow] }));
    alert("प्रशिक्षण रिकॉर्ड जुड़ गया!");
    setCourse("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎓 5. प्रशिक्षण रिकॉर्ड (Training History)</h2>
      <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" required placeholder="कोर्स का नाम" value={course} onChange={(e) => setCourse(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब से (DD-MM-YYYY)" value={fromDt} onChange={(e) => setFromDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="कब तक (DD-MM-YYYY)" value={toDt} onChange={(e) => setToDt(e.target.value)} style={{ padding: "8px" }} />
        <input type="text" placeholder="संस्थान (RPA/PTS)" value={institute} onChange={(e) => setInstitute(e.target.value)} style={{ padding: "8px" }} />
        <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>➕ Add Training</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
            <th style={{ padding: "8px" }}>BELT NO</th><th style={{ padding: "8px", textAlign: "left" }}>NAME</th><th style={{ padding: "8px", textAlign: "left" }}>COURSE_NAME</th><th style={{ padding: "8px" }}>FROM</th><th style={{ padding: "8px" }}>TO</th><th style={{ padding: "8px", textAlign: "left" }}>INSTITUTE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["COURSE_NAME"])}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["FROM_DATE"]}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["TO_DATE"]}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["INSTITUTE"])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
