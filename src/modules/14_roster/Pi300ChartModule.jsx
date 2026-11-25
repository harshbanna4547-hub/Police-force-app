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
    <div className="module-panel roster-pl-chart">
      <h3 className="roster-pl-title">
        {english ? "📊 Earned Leave 300 PL Chart (PL 300 Summary)" : "📊 उपार्जित अवकाश 300 PL चार्ट (PL 300 Summary)"}
      </h3>

      <div className="module-table-wrap table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              <th>{english ? "Belt No." : "BELT NO"}</th>
              <th className="module-cell-left">{english ? "Name" : "NAME"}</th>
              <th>{english ? "Post" : "CADER"}</th>
              <th className="module-cell-left">{english ? "Posting" : "POSTING"}</th>
              <th>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
              <th>{english ? "Earned PL" : "कुल अर्जित PL"}</th>
              <th>{english ? "Used PL" : "ली गई PL"}</th>
              <th>{english ? "Balance PL (Max 300)" : "शेष PL (Max 300)"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="module-cell-center module-cell-tnr">{r["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={r["NAME"]} /></td>
                <td className="module-cell-center module-cell-tnr">{r["CADER"]}</td>
                <td><HindiText text={r["POSTING"]} /></td>
                <td className="module-cell-center module-cell-tnr">{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td className="module-cell-center module-cell-tnr">{r["कुल अर्जित PL"]}</td>
                <td className="module-cell-center module-cell-tnr module-cell-accent-red">{r["कुल ली गई PL"]}</td>
                <td className="module-cell-center module-cell-tnr roster-pl-balance-cell">
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
