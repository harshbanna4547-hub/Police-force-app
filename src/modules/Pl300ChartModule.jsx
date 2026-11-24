import React, { useState, useMemo } from "react";

export default function Pl300ChartModule({ plSummary, devToHindi }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plSummary.slice(0, 150);
    return plSummary.filter(
      (r) => String(r["BELT NO"] || "").toLowerCase().includes(q) || devToHindi(r["NAME"]).toLowerCase().includes(q)
    );
  }, [plSummary, search, devToHindi]);

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, color: "#0B1E3D" }}>📊 7. उपार्जित अवकाश 300 PL चार्ट (PL 300 Summary)</h2>
        <input
          type="text"
          placeholder="🔍 बेल्ट नं. या नाम से खोजें..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #94A3B8", minWidth: "240px" }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>BELT NO</th>
              <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
              <th style={{ padding: "8px" }}>CADER</th>
              <th style={{ padding: "8px", textAlign: "left" }}>POSTING</th>
              <th style={{ padding: "8px" }}>नियुक्ति तिथि</th>
              <th style={{ padding: "8px" }}>कुल अर्जित PL</th>
              <th style={{ padding: "8px" }}>ली गई PL</th>
              <th style={{ padding: "8px" }}>शेष PL (Max 300)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "7px", textAlign: "center" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px" }}>{devToHindi(r["POSTING"])}</td>
                <td style={{ padding: "7px", textAlign: "center" }}>{r["DATE OF JOINING"]}</td>
                <td style={{ padding: "7px", textAlign: "center" }}>{r["कुल अर्जित PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", color: "#DC2626" }}>{r["कुल ली गई PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", fontWeight: "bold", color: "#15803D", backgroundColor: "#F0FDF4" }}>
                  {r["शेष PL (Max 300)"]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
