import React, { useMemo } from "react";
import { parseAnyDate, formatDateDDMMYYYY } from "../utils/reportEngine";

export default function AcpModule({ records, devToHindi }) {
  // नियुक्ति तिथि से 9, 18 और 27 वर्ष ACP पात्रता की स्वतः गणना
  const acpEligibleList = useMemo(() => {
    const today = new Date();
    const list = [];
    records.forEach((rec) => {
      const doj = parseAnyDate(rec["DATE OF JOINING"]);
      if (!doj) return;
      const serviceYrs = (today - doj) / (1000 * 60 * 60 * 24 * 365.25);
      let stage = "";
      if (serviceYrs >= 27) stage = "27 Year ACP (3rd ACP)";
      else if (serviceYrs >= 18) stage = "18 Year ACP (2nd ACP)";
      else if (serviceYrs >= 9) stage = "9 Year ACP (1st ACP)";

      if (stage) {
        list.push({
          belt: rec["BELT NO"],
          cader: rec["CADER"],
          name: rec["NAME"],
          posting: rec["POSTING"],
          doj: formatDateDDMMYYYY(doj),
          yrs: serviceYrs.toFixed(1),
          stage
        });
      }
    });
    return list.sort((a, b) => Number(b.yrs) - Number(a.yrs));
  }, [records]);

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎖️ 9. 9 / 18 / 27 वर्ष ACP पात्रता सूची ({acpEligibleList.length})</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>BELT NO</th>
              <th style={{ padding: "8px" }}>CADER</th>
              <th style={{ padding: "8px", textAlign: "left" }}>NAME</th>
              <th style={{ padding: "8px", textAlign: "left" }}>POSTING</th>
              <th style={{ padding: "8px" }}>नियुक्ति तिथि</th>
              <th style={{ padding: "8px" }}>कुल सेवा (वर्ष)</th>
              <th style={{ padding: "8px" }}>ACP श्रेणी</th>
            </tr>
          </thead>
          <tbody>
            {acpEligibleList.slice(0, 150).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center" }}>{r.belt}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r.cader}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r.name)}</td>
                <td style={{ padding: "6px" }}>{devToHindi(r.posting)}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>{r.doj}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold" }}>{r.yrs}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#0369A1" }}>{r.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
