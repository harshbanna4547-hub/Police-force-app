// src/modules/01_strength/StrengthModule.jsx
import React, { useState, useMemo } from "react";
import { CADRE_GROUPS, DEFAULT_SANCTIONED, mapRankToCode } from "../../data/cadreConfig";
import ExportBar from "../../core/ExportBar";
import OfficePsStrength from "./OfficePsStrength";
import HindiText from "../../core/HindiText";
import "./strength.css";

const POST_FILTER_TABS = [
  { id: "ALL", label: "सभी पद (ALL)", groupIds: null },
  { id: "SP", label: "SP", groupIds: ["IPS_OFFICERS"] },
  { id: "ASP", label: "ASP", groupIds: ["RPS_OFFICERS"], rankFilter: ["ASP"] },
  { id: "DYSP", label: "DySP", groupIds: ["RPS_OFFICERS"], rankFilter: ["DYSP"] },
  { id: "CI", label: "CI / MTO", groupIds: ["CI_GROUP"] },
  { id: "SI", label: "SI", groupIds: ["SI_GROUP"] },
  { id: "ASI", label: "ASI", groupIds: ["ASI_GROUP"] },
  { id: "HC", label: "HC", groupIds: ["HC_GROUP"] },
  { id: "FC", label: "FC", groupIds: ["FC_GROUP"] },
  { id: "OTHER", label: "अन्य संवर्ग (Min/Acct/IT/IV)", groupIds: ["MINISTERIAL_CADRE", "ACCOUNTS_CADRE", "IT_CADRE", "CLASS_4_CADRE"] }
];

function formatVacancy(sanc, work) {
  const diff = Number(sanc || 0) - Number(work || 0);
  if (diff < 0) return `+${Math.abs(diff)}`;
  return diff;
}

function getBeltNo(emp) {
  if (!emp) return "-";
  const direct =
    emp["BELT NO"] ||
    emp["BELT NO."] ||
    emp["BELT_NO"] ||
    emp["Belt No"] ||
    emp["Belt No."] ||
    emp["BELT"] ||
    emp["बेल्ट नं."] ||
    emp["बेल्ट नं"];
  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return String(direct).trim();
  }
  const cader = String(emp["CADER"] || "").toUpperCase();
  if (cader.includes("HC") || cader.includes("FC") || cader.includes("CONST")) {
    const m = String(emp["NAME"] || "").match(/\b(\d{1,5})\b/);
    if (m) return m.at(1);
  }
  return "-";
}

function getMobileNo(emp) {
  const value = emp?.["MOBILE NO 1"] || emp?.["MOBILE NO"] || emp?.MOBILE || emp?.CONTACT || "";
  return ["_", "-"].includes(String(value).trim()) ? "-" : (value || "-");
}

function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) {
    return new Date(val.getTime() + 6 * 3600 * 1000);
  }
  if (typeof val === "number" && val > 1000) {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : new Date(d.getTime() + 6 * 3600 * 1000);
  }
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let yr = Number(m.at(3));
    if (yr < 100) yr += yr > 40 ? 1900 : 2000;
    const dt = new Date(yr, Number(m.at(2)) - 1, Number(m.at(1)));
    return isNaN(dt) ? null : dt;
  }
  return null;
}

function formatDateClean(val) {
  const dt = parseDateSafe(val);
  if (!dt) return val ? String(val).split("T").at(0) : "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

function calcYearMonth(val) {
  const start = parseDateSafe(val);
  if (!start) return "-";
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return years < 0 ? "-" : `${years} Year ${months} Month`;
}
export default function StrengthModule({
  records,
  sanctioned,
  setSanctioned,
  unitRankSanc,
  setUnitRankSanc,
  onSaveSanctioned,
  onSaveUnitRankSanc,
  devToHindi,
  onEditEmployee
}) {
  const [subTab, setSubTab] = useState("POST_WISE");
  const [selectedPostTab, setSelectedPostTab] = useState("ALL");
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(false);

  const showBeltCol = ["HC", "FC"].includes(selectedPostTab);

  const workStats = useMemo(() => {
    const stats = {};
    Object.keys(DEFAULT_SANCTIONED).forEach((k) => {
      stats[k] = { working: 0, empList: [] };
    });
    records.forEach((row) => {
      const code = mapRankToCode(row["CADER"] || "", getBeltNo(row));
      if (!stats[code]) return;
      stats[code].working += 1;
      stats[code].empList.push(row);
    });
    return stats;
  }, [records]);

  const visibleGroups = useMemo(() => {
    const tabSpec = POST_FILTER_TABS.find((t) => t.id === selectedPostTab);
    if (!tabSpec || !tabSpec.groupIds) return CADRE_GROUPS;
    return CADRE_GROUPS.filter((g) => tabSpec.groupIds.includes(g.id)).map((g) => {
      if (tabSpec.rankFilter) {
        return { ...g, ranks: g.ranks.filter((r) => tabSpec.rankFilter.includes(r.code)) };
      }
      return g;
    });
  }, [selectedPostTab]);

  const selectedPostEmployees = useMemo(() => {
    if (selectedPostTab === "ALL") return [];
    const list = [];
    visibleGroups.forEach((g) => {
      g.ranks.forEach((rk) => {
        if (workStats[rk.code]?.empList) list.push(...workStats[rk.code].empList);
      });
    });
    return list;
  }, [selectedPostTab, visibleGroups, workStats]);

  const postExportRows = useMemo(() => {
    const rows = [];
    visibleGroups.forEach((grp) => {
      const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
      const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
      rows.push({
        "संवर्ग / पद का नाम": grp.title,
        "स्वीकृत (Sanc.)": gSanc,
        "कार्यरत (Work.)": gWork,
        "रिक्त / अधिक": formatVacancy(gSanc, gWork)
      });
      grp.ranks.forEach((rk) => {
        const sVal = Number(sanctioned[rk.code] || 0);
        const wVal = workStats[rk.code]?.working || 0;
        rows.push({
          "संवर्ग / पद का नाम": `    ${rk.label}`,
          "स्वीकृत (Sanc.)": sVal,
          "कार्यरत (Work.)": wVal,
          "रिक्त / अधिक": formatVacancy(sVal, wVal)
        });
      });
    });
    return rows;
  }, [visibleGroups, sanctioned, workStats]);

  const savePostSanctioned = async () => {
    try {
      await onSaveSanctioned(sanctioned);
      setEditing(false);
      alert("पद-वार स्वीकृत नफरी IndexedDB में सुरक्षित हो गई है!");
    } catch (error) {
      console.error("Post-wise sanctioned strength could not be saved:", error);
      alert(`स्वीकृत नफरी सेव नहीं हो सकी: ${error.message}`);
    }
  };
  return (
    <div className="strength-module" style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { id: "POST_WISE", label: "1. Post-Wise Sanctioned Strength" },
          { id: "OFFICE_PS_WISE", label: "2. Office / CO / PS-Wise Sanctioned Strength" },
          { id: "VACANCY_SUMMARY", label: "3. Vacancy & Recruitment Summary" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.88rem",
              backgroundColor: subTab === t.id ? "#0B1E3D" : "#F1F5F9",
              color: subTab === t.id ? "#FFD700" : "#334155"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "POST_WISE" && (
        <div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", backgroundColor: "#F8FAFC", padding: "10px", borderRadius: "10px", border: "1px solid #CBD5E1", marginBottom: "14px" }}>
            {POST_FILTER_TABS.map((pt) => {
              const active = selectedPostTab === pt.id;
              return (
                <button
                  key={pt.id}
                  onClick={() => setSelectedPostTab(pt.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: active ? "none" : "1px solid #CBD5E1",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.84rem",
                    backgroundColor: active ? "#1D63DC" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#1E293B"
                  }}
                >
                  {pt.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#0B1E3D" }}>
              {POST_FILTER_TABS.find((p) => p.id === selectedPostTab)?.label} — स्वीकृत एवं कार्यरत नफरी
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <ExportBar title={`पद-वार स्वीकृत नफरी (${selectedPostTab})`} rows={postExportRows} fileName={`Strength_${selectedPostTab}`} />
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "7px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                  ✏️ स्वीकृत नफरी बदलें
                </button>
              ) : (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={savePostSanctioned} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "7px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ Save</button>
                  <button onClick={() => setEditing(false)} style={{ backgroundColor: "#64748B", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
                  <th style={{ padding: "10px", textAlign: "left", border: "1px solid #CBD5E1" }}>संवर्ग / पद का नाम</th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>स्वीकृत (Sanc.)</th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>कार्यरत (Work.)</th>
                  <th style={{ padding: "10px", border: "1px solid #CBD5E1" }}>रिक्त / अधिक</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((grp) => {
                  const isOpen = selectedPostTab !== "ALL" || !!expanded[grp.id] || editing;
                  const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
                  const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
                  const gVac = gSanc - gWork;
                  return (
                    <React.Fragment key={grp.id}>
                      <tr onClick={() => setExpanded((p) => ({ ...p, [grp.id]: !p[grp.id] }))} style={{ backgroundColor: "#D8E4F0", fontWeight: "bold", cursor: "pointer" }}>
                        <td style={{ padding: "8px 10px", border: "1px solid #CBD5E1" }}>{grp.title}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1" }}>{gSanc}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1" }}>{gWork}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #CBD5E1", color: gVac > 0 ? "#B91C1C" : "#15803D" }}>
                          {formatVacancy(gSanc, gWork)}
                        </td>
                      </tr>
                      {isOpen && grp.ranks.map((rk) => {
                        const sVal = Number(sanctioned[rk.code] || 0);
                        const wVal = workStats[rk.code]?.working || 0;
                        const diff = sVal - wVal;
                        return (
                          <tr key={rk.code}>
                            <td style={{ padding: "7px 10px 7px 28px", border: "1px solid #E2E8F0" }}>{rk.label}</td>
                            <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                              {editing ? (
                                <input type="number" min="0" value={sVal} onChange={(e) => setSanctioned({ ...sanctioned, [rk.code]: Number(e.target.value) })} style={{ width: "65px", textAlign: "center" }} />
                              ) : sVal}
                            </td>
                            <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", color: "#15803D", fontWeight: "bold" }}>{wVal}</td>
                            <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", color: diff > 0 ? "#DC2626" : "#15803D", fontWeight: "bold" }}>
                              {formatVacancy(sVal, wVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedPostTab !== "ALL" && selectedPostEmployees.length > 0 && (
            <div style={{ marginTop: "20px", borderTop: "2px solid #CBD5E1", paddingTop: "14px" }}>
              <h4 style={{ margin: "0 0 10px", color: "#1D63DC" }}>
                👥 {selectedPostTab} पद पर कार्यरत कर्मचारियों की विस्तृत सूची (कुल: {selectedPostEmployees.length})
              </h4>
              <div style={{ overflowX: "auto", maxHeight: "420px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem", whiteSpace: "nowrap" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#1E293B", color: "#fff" }}>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>SN</th>
                      {showBeltCol && <th style={{ padding: "8px", border: "1px solid #475569" }}>Belt No.</th>}
                      <th style={{ padding: "8px", textAlign: "left", border: "1px solid #475569" }}>Name</th>
                      <th style={{ padding: "8px", textAlign: "left", border: "1px solid #475569" }}>Father Name</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Post</th>
                      <th style={{ padding: "8px", textAlign: "left", border: "1px solid #475569" }}>Posting Place</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Posting DOB</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Education</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Date of Birth</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Age</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Date of Joining</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Service</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Mobile Number</th>
                      <th style={{ padding: "8px", border: "1px solid #475569" }}>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPostEmployees.map((emp, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>{idx + 1}</td>
                        {showBeltCol && (
                          <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0", fontWeight: "bold", color: "#0369A1" }}>
                            {getBeltNo(emp)}
                          </td>
                        )}
                        <td onClick={() => onEditEmployee?.(emp)} style={{ padding: "6px 8px", border: "1px solid #E2E8F0", fontWeight: "bold", cursor: "pointer" }}>
                          <HindiText text={emp["NAME"]} />
                        </td>
                        <td style={{ padding: "6px 8px", border: "1px solid #E2E8F0" }}>
                          <HindiText text={emp["FATHER NAME"]} />
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          {emp["CADER"]}
                        </td>
                        <td style={{ padding: "6px 8px", border: "1px solid #E2E8F0" }}>
                          <HindiText text={emp["POSTING"]} />
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          {formatDateClean(emp["POSTING DOB NO"])}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          {emp["EDUCATION"] || "-"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          {formatDateClean(emp["DATE OF BIRTH"])}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0", color: "#0369A1", fontWeight: "bold" }}>
                          {calcYearMonth(emp["DATE OF BIRTH"])}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          {formatDateClean(emp["DATE OF JOINING"])}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0", color: "#15803D", fontWeight: "bold" }}>
                          {calcYearMonth(emp["DATE OF JOINING"])}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>
                          {getMobileNo(emp)}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                          <button type="button" onClick={() => onEditEmployee?.(emp)} style={{ border: 0, borderRadius: "5px", padding: "5px 8px", background: "#DBEAFE", color: "#1D4ED8", fontWeight: "bold", cursor: "pointer" }}>✏️ Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {subTab === "OFFICE_PS_WISE" && (
        <OfficePsStrength
          records={records}
          devToHindi={devToHindi}
          onEditEmployee={onEditEmployee}
          unitRankSanc={unitRankSanc}
          setUnitRankSanc={setUnitRankSanc}
          onSaveUnitRankSanc={onSaveUnitRankSanc}
        />
      )}

      {subTab === "VACANCY_SUMMARY" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#0B1E3D" }}>संवर्ग-वार रिक्त पदों का संक्षिप्त सारांश</h3>
            <ExportBar title="संवर्ग-वार रिक्त पद सारांश" rows={postExportRows} fileName="Vacancy_Summary" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {CADRE_GROUPS.map((grp) => {
              const gSanc = grp.ranks.reduce((s, r) => s + Number(sanctioned[r.code] || 0), 0);
              const gWork = grp.ranks.reduce((s, r) => s + (workStats[r.code]?.working || 0), 0);
              const gVac = gSanc - gWork;
              return (
                <div key={grp.id} style={{ backgroundColor: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontWeight: "bold", color: "#0B1E3D", fontSize: "0.9rem", marginBottom: "8px" }}>{grp.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span>स्वीकृत: <b>{gSanc}</b></span>
                    <span style={{ color: "#15803D" }}>कार्यरत: <b>{gWork}</b></span>
                    <span style={{ color: gVac > 0 ? "#DC2626" : "#15803D" }}>रिक्त/अधिक: <b>{formatVacancy(gSanc, gWork)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
