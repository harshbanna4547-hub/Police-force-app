import { useState, useMemo } from "react";
import ExportBar from "../../core/ExportBar";
import { formatDateOnly } from "../../shared/commonFunctions";
import { sortSeniorityRows } from "./seniorityLogic";
import "./seniority.css";

export default function SeniorityModule({ seniorityList, devToHindi }) {
  const [caderFilter, setCaderFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return sortSeniorityRows(seniorityList, caderFilter);
  }, [seniorityList, caderFilter]);
  const exportRows = filtered.map((row, index) => ({ ...row, "वरिष्ठता क्र.": index + 1 }));

  return (
    <div className="seniority-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, color: "#0B1E3D" }}>📋 12. संवर्ग-वार वरिष्ठता सूची (Seniority List)</h2>
        <ExportBar title="संवर्ग-वार वरिष्ठता सूची" rows={exportRows} fileName={`Seniority_${caderFilter}`} />
        <select value={caderFilter} onChange={(e) => setCaderFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #94A3B8" }}>
          <option value="ALL">सभी संवर्ग ({seniorityList.length})</option>
          <option value="CI">CI (निरीक्षक)</option>
          <option value="SI">SI (उप निरीक्षक)</option>
          <option value="ASI">ASI (सहायक उप निरीक्षक)</option>
          <option value="HC">HC (हैड कानिस्टेबल)</option>
          <option value="FC">FC (कानिस्टेबल)</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>वरिष्ठता क्र.</th>
              <th style={{ padding: "8px" }}>CADER</th>
              <th style={{ padding: "8px" }}>BELT NO</th>
              <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
              <th style={{ padding: "8px", textAlign: "left" }}>FATHER NAME</th>
              <th style={{ padding: "8px" }}>जन्म तिथि</th>
              <th style={{ padding: "8px" }}>नियुक्ति तिथि</th>
              <th style={{ padding: "8px" }}>स्थायीकरण</th>
              <th style={{ padding: "8px", textAlign: "left" }}>POSTING</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["CADER"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "6px" }}>{devToHindi(r["FATHER NAME"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF BIRTH"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#1D63DC", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF CONFIRMATION"])}</td>
                <td style={{ padding: "6px" }}>{devToHindi(r["POSTING"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
