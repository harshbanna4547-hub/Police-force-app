import { useState, useMemo } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { formatDateOnly } from "../../shared/commonFunctions";
import { sortSeniorityRows } from "./seniorityLogic";
import "./seniority.css";

export default function SeniorityModule({ seniorityList = [], records = [], language = "hi" }) {
  const [caderFilter, setCaderFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const english = language === "en";

  const genderAllowedSet = useMemo(() => {
    if (gender === "ALL") return null;
    const filtered = filterEmployeesByGender(records, gender);
    return new Set(filtered.map((r) => `${String(r["BELT NO"] || "").trim()}::${String(r.NAME || "").trim()}`));
  }, [records, gender]);

  const filtered = useMemo(() => {
    const byRank = sortSeniorityRows(seniorityList, caderFilter);
    return byRank.filter((row) => {
      if (genderAllowedSet && !genderAllowedSet.has(`${String(row["BELT NO"] || "").trim()}::${String(row.NAME || "").trim()}`)) {
        return false;
      }
      if (!search.trim()) return true;
      return matchesEmployeeSearch(row, search, ["NAME", "FATHER NAME", "BELT NO", "CADER", "POSTING"]);
    });
  }, [seniorityList, caderFilter, genderAllowedSet, search]);

  const exportRows = filtered.map((row, index) => ({ ...row, "वरिष्ठता क्र.": index + 1 }));

  const cadreSelector = (
    <select value={caderFilter} onChange={(e) => setCaderFilter(e.target.value)} style={{ minHeight: "38px", padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1" }}>
      <option value="ALL">{english ? `All Cadres (${seniorityList.length})` : `सभी संवर्ग (${seniorityList.length})`}</option>
      <option value="CI">{english ? "CI (Inspector)" : "CI (निरीक्षक)"}</option>
      <option value="SI">{english ? "SI (Sub Inspector)" : "SI (उप निरीक्षक)"}</option>
      <option value="ASI">{english ? "ASI (Asst. SI)" : "ASI (सहायक उप निरीक्षक)"}</option>
      <option value="HC">{english ? "HC (Head Constable)" : "HC (हैड कानिस्टेबल)"}</option>
      <option value="FC">{english ? "FC (Constable)" : "FC (कानिस्टेबल)"}</option>
    </select>
  );

  return (
    <div className="seniority-module" style={{ backgroundColor: "var(--surface-raised, #fff)", borderRadius: "12px", padding: "18px", border: "1px solid var(--border, #E2E8F0)" }}>
      <ModuleHeaderToolbar
        title={english ? "📋 Cadre-Wise Seniority List" : "📋 संवर्ग-वार वरिष्ठता सूची"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName={`Seniority_${caderFilter}`}
        language={language}
        extraActions={cadreSelector}
      />

      <div className="table-responsive-box" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>{english ? "Seniority No." : "वरिष्ठता क्र."}</th>
              <th style={{ padding: "8px" }}>{english ? "Post" : "CADER"}</th>
              <th style={{ padding: "8px" }}>{english ? "Belt No." : "BELT NO"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Name" : "NAME"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Father Name" : "FATHER NAME"}</th>
              <th style={{ padding: "8px" }}>{english ? "DOB" : "जन्म तिथि"}</th>
              <th style={{ padding: "8px" }}>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
              <th style={{ padding: "8px" }}>{english ? "Confirmation" : "स्थायीकरण"}</th>
              <th style={{ padding: "8px", textAlign: "left" }}>{english ? "Posting" : "POSTING"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", fontFamily: "'Times New Roman', Times, serif" }}>{i + 1}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["CADER"]}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}><HindiText text={r["NAME"]} /></td>
                <td style={{ padding: "6px" }}><HindiText text={r["FATHER NAME"]} /></td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF BIRTH"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#1D63DC", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF CONFIRMATION"])}</td>
                <td style={{ padding: "6px" }}><HindiText text={r["POSTING"]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
