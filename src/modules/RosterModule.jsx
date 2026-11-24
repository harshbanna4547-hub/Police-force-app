import React from "react";
import { downloadAllReportsExcel } from "../utils/reportEngine";

export default function RosterModule({ reports, devToHindi }) {
  const rows = reports.monthlyRoster || [];

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, color: "#0B1E3D" }}>🏢 13. मासिक थाना-वार नफरी रोस्टर (Monthly PS Roster)</h2>
        <button
          onClick={() => downloadAllReportsExcel(reports)}
          style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          📥 सभी 8 रिपोर्ट्स Excel डाउनलोड करें
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>क्र.सं.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>थाना / शाखा / कार्यालय</th>
              <th style={{ padding: "8px" }}>HC (पुरुष)</th>
              <th style={{ padding: "8px" }}>MHC (महिला)</th>
              <th style={{ padding: "8px" }}>FC (पुरुष)</th>
              <th style={{ padding: "8px" }}>MFC (महिला)</th>
              <th style={{ padding: "8px" }}>MT (चालक)</th>
              <th style={{ padding: "8px" }}>Recruit (RT)</th>
              <th style={{ padding: "8px" }}>कुल नफरी</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["क्र.सं."]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r["थाना / शाखा / कार्यालय"])}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["HC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MHC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["FC (पुरुष)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MFC (महिला)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["MT (चालक)"]}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r["Recruit (RT)"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", backgroundColor: "#F1F5F9" }}>{r["कुल कार्यरत नफरी"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
