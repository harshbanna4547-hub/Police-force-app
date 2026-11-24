import React, { useState, useMemo } from "react";
import { parseAnyDate } from "../utils/reportEngine";

export default function PostingModule({ records, devToHindi }) {
  const [psFilter, setPsFilter] = useState("");
  const [tenureFilter, setTenureFilter] = useState("ALL"); // ALL | 5YR | 8YR | NODOB

  const filtered = useMemo(() => {
    const today = new Date();
    const q = psFilter.trim().toLowerCase();
    return records.filter((r) => {
      const psHi = devToHindi(r["POSTING"]).toLowerCase();
      if (q && !psHi.includes(q) && !String(r["NAME"] || "").toLowerCase().includes(q)) return false;

      const dobNo = String(r["POSTING DOB NO"] || "").trim();
      const wDob = String(r["WITHOUR DOB"] || "").trim();
      if (tenureFilter === "NODOB") return !dobNo || wDob !== "";

      const pDt = parseAnyDate(dobNo);
      const yrs = pDt ? (today - pDt) / (1000 * 60 * 60 * 24 * 365.25) : 0;
      if (tenureFilter === "5YR") return yrs >= 5 && yrs < 8;
      if (tenureFilter === "8YR") return yrs >= 8;
      return true;
    });
  }, [records, psFilter, tenureFilter, devToHindi]);

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>📍 3. पदस्थापन एवं कार्यकाल सूची (Posting & Tenure) — {filtered.length}</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <input type="text" placeholder="थाना / शाखा या नाम से खोजें..." value={psFilter} onChange={(e) => setPsFilter(e.target.value)} style={{ flex: 1, minWidth: "200px", padding: "8px", borderRadius: "6px", border: "1px solid #94A3B8" }} />
        <select value={tenureFilter} onChange={(e) => setTenureFilter(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #94A3B8" }}>
          <option value="ALL">सभी पदस्थापित (All)</option>
          <option value="5YR">5 वर्ष या अधिक पूर्ण</option>
          <option value="8YR">8 वर्ष या अधिक पूर्ण</option>
          <option value="NODOB">बिना DOB आदेश (Without DOB)</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>क्र.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>POSTING (थाना/शाखा)</th>
              <th style={{ padding: "8px" }}>पद</th>
              <th style={{ padding: "8px" }}>बेल्ट नं.</th>
              <th style={{ padding: "8px", textAlign: "left" }}>नाम</th>
              <th style={{ padding: "8px" }}>POSTING DOB NO</th>
              <th style={{ padding: "8px" }}>WITHOUT DOB</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{i + 1}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["POSTING"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["POSTING DOB NO"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["WITHOUR DOB"])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
