import { useState, useMemo } from "react";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { formatDateOnly } from "../../shared/commonFunctions";
import { sortSeniorityRows } from "./seniorityLogic";
import "./seniority.css";

/**
 * [COMPONENT] SeniorityModule — संवर्ग-वार वरिष्ठता सूची
 */
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
    <select value={caderFilter} onChange={(e) => setCaderFilter(e.target.value)} className="module-select-control">
      <option value="ALL">{english ? `All Cadres (${seniorityList.length})` : `सभी संवर्ग (${seniorityList.length})`}</option>
      <option value="CI">{english ? "CI (Inspector)" : "CI (निरीक्षक)"}</option>
      <option value="SI">{english ? "SI (Sub Inspector)" : "SI (उप निरीक्षक)"}</option>
      <option value="ASI">{english ? "ASI (Asst. SI)" : "ASI (सहायक उप निरीक्षक)"}</option>
      <option value="HC">{english ? "HC (Head Constable)" : "HC (हैड कानिस्टेबल)"}</option>
      <option value="FC">{english ? "FC (Constable)" : "FC (कानिस्टेबल)"}</option>
    </select>
  );

  return (
    <div className="seniority-module module-panel">
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

      <div className="table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              <th>{english ? "Seniority No." : "वरिष्ठता क्र."}</th>
              <th>{english ? "Post" : "CADER"}</th>
              <th>{english ? "Belt No." : "BELT NO"}</th>
              <th>{english ? "Name" : "NAME"}</th>
              <th>{english ? "Father Name" : "FATHER NAME"}</th>
              <th>{english ? "DOB" : "जन्म तिथि"}</th>
              <th>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
              <th>{english ? "Confirmation" : "स्थायीकरण"}</th>
              <th>{english ? "Posting" : "POSTING"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((r, i) => (
              <tr key={i}>
                <td className="module-cell-center module-cell-bold english-cell">{i + 1}</td>
                <td className="module-cell-center english-cell">{r["CADER"]}</td>
                <td className="module-cell-center english-cell">{r["BELT NO"]}</td>
                <td className="module-cell-bold"><HindiText text={r["NAME"]} /></td>
                <td><HindiText text={r["FATHER NAME"]} /></td>
                <td className="module-cell-center english-cell">{formatDateOnly(r["DATE OF BIRTH"])}</td>
                <td className="module-cell-center module-cell-accent-blue english-cell">{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td className="module-cell-center english-cell">{formatDateOnly(r["DATE OF CONFIRMATION"])}</td>
                <td><HindiText text={r["POSTING"]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
