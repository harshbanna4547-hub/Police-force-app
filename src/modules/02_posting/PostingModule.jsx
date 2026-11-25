import { useMemo, useState } from "react";
import ExportBar from "../../core/ExportBar";
import EmployeeActionRow from "../../core/EmployeeActionRow";
import HindiText from "../../core/HindiText";
import { openEmployeeServiceSlip } from "../../core/serviceSlip";
import { CO_PS_MAP, OFFICE_SECTIONS } from "../../data/officeUnits";

const POST_ORDER = ["SP", "ASP", "DySP", "CI", "SI", "ASI", "HC", "FC", "FC(DR)"];
const RANKS = [
  ["SP", /^SP$/i],
  ["ASP", /^ASP$/i],
  ["DySP", /^(DYSP|DSP)$/i],
  ["CI", /^CI$/i],
  ["SI", /^SI$/i],
  ["ASI", /^ASI$/i],
  ["HC", /^HC$/i],
  ["FC(DR)", /^FC\s*\(DR\)$/i],
  ["FC", /^(FC|FC\s*\(GD\)|CONSTABLE)/i]
];

function rankOf(employee) {
  const cader = String(employee.CADER || "").trim();
  return RANKS.find(([, pattern]) => pattern.test(cader))?.[0] || "Other";
}

function placeOf(employee) {
  return String(employee.POSTING || "अज्ञात पदस्थापन").trim() || "अज्ञात पदस्थापन";
}

function SummaryTable({ rows, title, sanctioned = {}, onEditEmployee, onArchiveEmployee }) {
  const rankValues = (employees, rank) => employees.filter((employee) => rankOf(employee) === rank).length;
  const exportRows = rows.map(([unit, employees]) => {
    const result = { "इकाई": unit };
    POST_ORDER.forEach((rank) => {
      result[`${rank} कार्यरत`] = rankValues(employees, rank);
      result[`${rank} स्वीकृत`] = Number(sanctioned[unit]?.[rank] || 0);
    });
    result["कुल कार्यरत"] = employees.length;
    return result;
  });
  return (
    <section className="posting-summary">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <h3>{title}</h3>
        <ExportBar title={title} rows={exportRows} fileName="Posting_Summary" />
      </div>
      {rows.map(([unit, employees]) => (
        <details key={unit} style={{ margin: "8px 0", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px" }}>
          <summary style={{ cursor: "pointer", fontWeight: "bold" }}>{unit} — {employees.length} कार्यरत</summary>
          <div className="table-responsive-box" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: "8px" }}>
            <table>
              <thead><tr>{["पद", "स्वीकृत", "कार्यरत", "कर्मचारी"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>{POST_ORDER.flatMap((rank) => {
                const list = employees.filter((employee) => rankOf(employee) === rank);
                return [
                  <tr key={`${unit}-${rank}-total`}>
                    <td>{rank}</td>
                    <td>{Number(sanctioned[unit]?.[rank] || 0)}</td>
                    <td>{list.length}</td>
                    <td>{list.length || "—"}</td>
                  </tr>,
                  ...list.map((employee, index) => (
                    <EmployeeActionRow
                      key={employee._uid || `${rank}-${index}`}
                      employee={employee}
                      responsiveDetails
                      nameCellIndex={3}
                      onAction={(action, selected) => {
                        if (action === "UPDATE" || action === "TRANSFER") onEditEmployee?.(selected);
                        if (action === "RELIEVE") {
                          const reason = window.prompt("Relieve / Retire / Death / Deputation का कारण लिखें:");
                          if (reason) onArchiveEmployee?.(selected, reason);
                        }
                        if (action === "SERVICE_SLIP") openEmployeeServiceSlip(selected);
                      }}
                    >
                      <td>{rank}</td><td>—</td><td>—</td><td><HindiText text={employee.NAME} /> ({employee["BELT NO"] || "-"})</td>
                    </EmployeeActionRow>
                  ))
                ];
              })}</tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}

export default function PostingModule({ records = [], sanctioned = {}, unitRankSanc = {}, onEditEmployee, onArchiveEmployee }) {
  const [tab, setTab] = useState("ALL");
  const [selectedSection, setSelectedSection] = useState(OFFICE_SECTIONS[0]?.id || "SEC_SPO");
  const [selectedCircle, setSelectedCircle] = useState(Object.keys(CO_PS_MAP)[0] || "");
  const placeMap = useMemo(() => records.reduce((map, employee) => {
    const place = placeOf(employee);
    (map[place] ||= []).push(employee);
    return map;
  }, {}), [records]);
  const allWorkingRows = useMemo(() => {
    const sections = OFFICE_SECTIONS.map((section) => ({
      id: section.id,
      title: section.title,
      units: section.units.map((unit) => [unit, placeMap[unit] || []])
    }));
    const assigned = new Set(OFFICE_SECTIONS.flatMap((section) => section.units));
    const rpl = Object.entries(placeMap).filter(([unit]) => /rpl|police line|पुलिस लाइन/i.test(unit));
    const other = Object.entries(placeMap).filter(([unit]) => !assigned.has(unit) && !rpl.some(([rplUnit]) => rplUnit === unit));
    return [...sections, { id: "RPL", title: "RPL / पुलिस लाइन", units: rpl }, { id: "OTHER", title: "अन्य पदस्थापन", units: other }];
  }, [placeMap]);
  const postRows = POST_ORDER.map((rank) => [
    rank,
    records.filter((employee) => rankOf(employee) === rank)
  ]);
  const section = OFFICE_SECTIONS.find((item) => item.id === selectedSection);
  const sectionRows = selectedSection === "SEC_CO" && selectedCircle
    ? [
      [selectedCircle, placeMap[selectedCircle] || []],
      ...(CO_PS_MAP[selectedCircle] || []).map((unit) => [unit, placeMap[unit] || []])
    ]
    : section?.units.map((unit) => [unit, placeMap[unit] || []]) || [];
  const totalWorking = records.length;
  const totalSanctioned = Object.values(sanctioned).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div className="posting-module" style={{ padding: "18px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: "14px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {[
          ["ALL", "All Working"],
          ["POST", "Post-Wise"],
          ["UNIT", "Office / CO / PS Wise"]
        ].map(([id, label]) => (
          <button type="button" key={id} onClick={() => setTab(id)} aria-pressed={tab === id}>{label}</button>
        ))}
      </div>
      {tab === "ALL" && allWorkingRows.map((group) => (
        <section key={group.title}>
          <h3>{group.title}</h3>
          {group.id === "SEC_CO"
            ? Object.entries(CO_PS_MAP).map(([circle, stations]) => (
              <details key={circle} style={{ margin: "8px 0", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>{circle} — {(placeMap[circle] || []).length} CO कर्मचारी</summary>
                <SummaryTable
                  rows={[[circle, placeMap[circle] || []], ...stations.map((station) => [station, placeMap[station] || []])]}
                  title={`${circle} — CO / PS Summary`}
                  sanctioned={unitRankSanc}
                  onEditEmployee={onEditEmployee}
                  onArchiveEmployee={onArchiveEmployee}
                />
              </details>
            ))
            : <SummaryTable rows={group.units} title={group.title} sanctioned={unitRankSanc} onEditEmployee={onEditEmployee} onArchiveEmployee={onArchiveEmployee} />}
        </section>
      ))}
      {tab === "POST" && <SummaryTable rows={postRows} title="Post-Wise Working" onEditEmployee={onEditEmployee} onArchiveEmployee={onArchiveEmployee} />}
      {tab === "UNIT" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {OFFICE_SECTIONS.map((item) => (
              <button type="button" key={item.id} onClick={() => setSelectedSection(item.id)} aria-pressed={selectedSection === item.id}>{item.title}</button>
            ))}
          </div>
          {selectedSection === "SEC_CO" && (
            <label style={{ display: "block", marginTop: "10px" }}>CO Circle
              <select value={selectedCircle} onChange={(event) => setSelectedCircle(event.target.value)} style={{ marginLeft: "8px" }}>
                {Object.keys(CO_PS_MAP).map((circle) => <option key={circle} value={circle}>{circle}</option>)}
              </select>
            </label>
          )}
          <SummaryTable rows={sectionRows} title={section?.title || "इकाई-वार नफरी"} sanctioned={unitRankSanc} onEditEmployee={onEditEmployee} onArchiveEmployee={onArchiveEmployee} />
        </>
      )}
      <footer style={{ marginTop: "18px", padding: "14px", borderRadius: "10px", background: "#EFF6FF", fontWeight: "bold" }}>
        कुल स्वीकृत: {totalSanctioned} | कुल कार्यरत: {totalWorking} | कुल रिक्त: {Math.max(totalSanctioned - totalWorking, 0)}
      </footer>
    </div>
  );
}
