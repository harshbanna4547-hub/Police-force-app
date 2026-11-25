import { useMemo } from "react";
import HindiText from "../../core/HindiText";
import { matchesEmployeeSearch } from "../../forceLogic";
import { formatDateOnly } from "../../shared/commonFunctions";

export default function Pi300ChartModule({ plSummary = [], search = "", language = "hi" }) {
  const english = language === "en";

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return plSummary.slice(0, 150);
    return plSummary.filter((r) => matchesEmployeeSearch(r, q, ["BELT NO", "NAME", "POSTING", "CADER"]));
  }, [plSummary, search]);

  return (
    <div style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <h3 style={{ marginTop: 0, color: "#0B1E3D" }}>
        {english ? "📊 Earned Leave 300 PL Chart (PL 300 Summary)" : "📊 उपार्जित अवकाश 300 PL चार्ट (PL 300 Summary)"}
      </h3>

      <div className="table-responsive-box" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>{english ? "Belt No." : "BELT NO"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Name" : "NAME"}</th>
              <th style={{ padding: "8px" }}>{english ? "Post" : "CADER"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Posting" : "POSTING"}</th>
              <th style={{ padding: "8px" }}>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
              <th style={{ padding: "8px" }}>{english ? "Earned PL" : "कुल अर्जित PL"}</th>
              <th style={{ padding: "8px" }}>{english ? "Used PL" : "ली गई PL"}</th>
              <th style={{ padding: "8px" }}>{english ? "Balance PL (Max 300)" : "शेष PL (Max 300)"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", fontWeight: "bold" }}><HindiText text={r["NAME"]} /></td>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px" }}><HindiText text={r["POSTING"]} /></td>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["कुल अर्जित PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", color: "#DC2626", fontFamily: "'Times New Roman', Times, serif" }}>{r["कुल ली गई PL"]}</td>
                <td style={{ padding: "7px", textAlign: "center", fontWeight: "bold", color: "#15803D", backgroundColor: "#F0FDF4", fontFamily: "'Times New Roman', Times, serif" }}>
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
