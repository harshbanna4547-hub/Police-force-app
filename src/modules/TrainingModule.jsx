import { useState } from "react";
import ExportBar from "../core/ExportBar";

const REQUIRED_COURSES = [
  { label: "PCC", aliases: ["pcc"] },
  { label: "बुनियादी प्रशिक्षण", aliases: ["बुनियादी", "basic training", "basic course"] },
  { label: "साइबर", aliases: ["साइबर", "cyber"] },
  { label: "विशेष कोर्स", aliases: ["विशेष", "special course", "special training"] }
];

export default function TrainingModule({ records = [], allSheets, setAllSheets, devToHindi }) {
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState(REQUIRED_COURSES[0].label);
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [institute, setInstitute] = useState("");

  const rows = allSheets["Training_History"] || [];
  const missingRows = records.flatMap((record) => REQUIRED_COURSES
    .filter((requiredCourse) => !rows.some((row) => {
      const rowBelt = String(row["BELT NO"] || "").trim().toUpperCase();
      const courseName = String(row.COURSE_NAME || "").toLowerCase();
      return rowBelt === String(record["BELT NO"] || "").trim().toUpperCase() &&
        requiredCourse.aliases.some((alias) => courseName.includes(alias.toLowerCase()));
    }))
    .map((requiredCourse) => ({
      "BELT NO": record["BELT NO"],
      CADER: record.CADER,
      NAME: devToHindi(record.NAME),
      "अपूर्ण कोर्स": requiredCourse.label
    })));

  const handleAdd = (e) => {
    e.preventDefault();
    const newRow = { "BELT NO": belt.toUpperCase(), NAME: name, COURSE_NAME: course, FROM_DATE: fromDt, TO_DATE: toDt, INSTITUTE: institute };
    setAllSheets((prev) => ({ ...prev, Training_History: [...(prev.Training_History || []), newRow] }));
    alert("प्रशिक्षण रिकॉर्ड जुड़ गया!");
    setFromDt("");
    setToDt("");
    setInstitute("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎓 प्रशिक्षण रिकॉर्ड (Training History)</h2>
        <ExportBar title="प्रशिक्षण रिकॉर्ड" rows={rows} fileName="Training_History" />
      </div>
      <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginBottom: "16px", backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "8px" }}>
        <input type="text" required placeholder="बेल्ट नं." value={belt} onChange={(e) => setBelt(e.target.value)} style={{ padding: "8px", fontFamily: "'Times New Roman', Times, serif" }} />
        <input type="text" required placeholder="नाम" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "8px" }} />
        <input list="training-course-list" type="text" required placeholder="कोर्स का नाम" value={course} onChange={(e) => setCourse(e.target.value)} style={{ padding: "8px" }} />
        <datalist id="training-course-list">{REQUIRED_COURSES.map((requiredCourse) => <option key={requiredCourse.label} value={requiredCourse.label} />)}</datalist>
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
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{devToHindi(r["COURSE_NAME"])}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["FROM_DATE"]}</td>
              <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["TO_DATE"]}</td>
              <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["INSTITUTE"])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>आवश्यक प्रशिक्षण रिकॉर्ड की जाँच ({missingRows.length} लंबित कर्मचारी-कोर्स)</h3>
      <ExportBar title="लंबित प्रशिक्षण सूची" rows={missingRows} fileName="Training_Missing_Courses" />
      <div style={{ overflowX: "auto", marginTop: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead><tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>{["बेल्ट नं.", "पद", "नाम", "कोर्स"].map((heading) => <th key={heading} style={{ padding: "8px" }}>{heading}</th>)}</tr></thead>
          <tbody>{missingRows.map((row, index) => <tr key={`${row["BELT NO"]}-${row["अपूर्ण कोर्स"]}-${index}`} style={{ borderBottom: "1px solid #E2E8F0" }}>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row["BELT NO"]}</td>
            <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{row.CADER}</td>
            <td style={{ padding: "6px", fontWeight: "bold" }}>{row.NAME}</td>
            <td style={{ padding: "6px" }}>{row["अपूर्ण कोर्स"]}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
