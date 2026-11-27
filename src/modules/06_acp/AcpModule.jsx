import { useMemo, useState } from "react";
import { appendRowToSheet, parseAnyDate, formatDateDDMMYYYY } from "../../shared/commonFunctions";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { getAcpServiceStage } from "./acpLogic";
import "./acp.css";

/**
 * [COMPONENT] AcpModule — 9 / 18 / 27 वर्ष एसीपी सेवा-अवधि समीक्षा एवं आदेश प्रविष्टि
 */
export default function AcpModule({
  records = [],
  allSheets = {},
  setAllSheets,
  initialTab = "REVIEW",
  language = "hi"
}) {
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");
  const [selectedBelt, setSelectedBelt] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const english = language === "en";

  const filteredRecords = useMemo(() => {
    const byGender = filterEmployeesByGender(records, gender);
    if (!search.trim()) return byGender;
    return byGender.filter((r) => matchesEmployeeSearch(r, search, ["NAME", "BELT NO", "CADER", "POSTING"]));
  }, [records, gender, search]);

  const acpEligibleList = useMemo(() => {
    const today = new Date();
    const list = [];
    filteredRecords.forEach((rec) => {
      const doj = parseAnyDate(rec["DATE OF JOINING"]);
      if (!doj) return;
      const serviceYrs = (today - doj) / (1000 * 60 * 60 * 24 * 365.25);
      const stage = getAcpServiceStage(doj, today);

      if (stage) {
        const belt = String(rec["BELT NO"] || "").trim().toUpperCase();
        const punishments = (allSheets["Saja_Record"] || []).filter(
          (row) => String(row["BELT NO"] || "").trim().toUpperCase() === belt
        );
        list.push({
          belt: rec["BELT NO"],
          cader: rec["CADER"],
          name: rec["NAME"],
          posting: rec["POSTING"],
          doj: formatDateDDMMYYYY(doj),
          yrs: serviceYrs.toFixed(1),
          stage,
          punishmentReview: punishments.length
            ? (english ? `Record Review (${punishments.length})` : `रिकॉर्ड समीक्षा (${punishments.length})`)
            : (english ? "No Record" : "कोई दर्ज रिकॉर्ड नहीं")
        });
      }
    });
    return list.sort((a, b) => Number(b.yrs) - Number(a.yrs));
  }, [filteredRecords, allSheets, english]);

  const exportRows = acpEligibleList.map((row) => ({
    "BELT NO": row.belt,
    CADER: row.cader,
    NAME: row.name,
    POSTING: row.posting,
    "नियुक्ति तिथि": row.doj,
    "कुल सेवा (वर्ष)": row.yrs,
    "ACP श्रेणी": row.stage,
    "सजा रिकॉर्ड समीक्षा": row.punishmentReview
  }));

  const selectedEmployee = acpEligibleList.find((row) => String(row.belt || "").trim().toUpperCase() === selectedBelt);

  const saveApprovalOrder = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert(english ? "Select employee from ACP list." : "ACP सेवा-अवधि सूची से कर्मचारी चुनें।");
      return;
    }
    const approval = {
      "BELT NO": selectedEmployee.belt,
      NAME: selectedEmployee.name,
      POSTING_PLACE: `[ACP] ${selectedEmployee.stage}`,
      ORDER_NO_DATE: orderNo,
      ORDER_DATE: orderDate,
      REMARK: `सजा रिकॉर्ड समीक्षा: ${selectedEmployee.punishmentReview}`
    };
    appendRowToSheet(setAllSheets, "Posting_History", approval);
    setOrderNo("");
    setOrderDate("");
  };

  const acpSectionLabel = initialTab === "ORDERS"
    ? (english ? "ACP Orders" : "ACP आदेश पत्रक")
    : (english ? "9 / 18 / 27 Review" : "9 / 18 / 27 समीक्षा");

  return (
    <div className="acp-module module-panel">
      <ModuleHeaderToolbar
        title={english ? `🎖️ 9 / 18 / 27 Years ACP Service Review (${acpEligibleList.length})` : `🎖️ 9 / 18 / 27 वर्ष ACP सेवा-अवधि सूची (${acpEligibleList.length})`}
        sectionLabel={acpSectionLabel}
        search={search}
        onSearchChange={setSearch}
        rows={exportRows}
        fileName="ACP_Eligibility_Review"
        language={language}
      />

      <p className="module-notice-warn">
        {english
          ? "Review punishment/departmental records manually before approving ACP."
          : "ACP स्वीकृति से पहले दर्ज सजा/विभागीय रिकॉर्ड की समीक्षा करें। सजा रिकॉर्ड अपने-आप अयोग्यता नहीं बनाता।"}
      </p>

      <form onSubmit={saveApprovalOrder} className="module-form-card">
        <select required value={selectedBelt} onChange={(event) => setSelectedBelt(event.target.value)}>
          <option value="">{english ? "Select Employee from ACP List" : "ACP सेवा-अवधि सूची से कर्मचारी चुनें"}</option>
          {acpEligibleList.map((row, idx) => (
            <option
              key={`${row.belt}-${row.stage}-${idx}`}
              value={String(row.belt || "").trim().toUpperCase()}
              className={isDevlysText(row.name) ? "devlys-text" : undefined}
            >
              {row.belt} — {row.name} — {row.stage}
            </option>
          ))}
        </select>
        <input required value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder={english ? "ACP Approval Order No." : "ACP स्वीकृति आदेश नं."} />
        <input required value={orderDate} onChange={(event) => setOrderDate(event.target.value)} placeholder={english ? "Order Date (DD-MM-YYYY)" : "आदेश दिनांक (DD-MM-YYYY)"} />
        <button type="submit" disabled={!selectedEmployee} className="module-btn-success">
          ✅ {english ? "Record ACP Order" : "ACP आदेश दर्ज करें"}
        </button>
      </form>

      <div className="table-responsive-box">
        <table className="module-table">
          <thead>
            <tr>
              <th>{english ? "Belt No." : "BELT NO"}</th>
              <th>{english ? "Post" : "CADER"}</th>
              <th>{english ? "Name" : "NAME"}</th>
              <th>{english ? "Posting" : "POSTING"}</th>
              <th>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
              <th>{english ? "Service Yrs" : "कुल सेवा (वर्ष)"}</th>
              <th>{english ? "ACP Stage" : "ACP श्रेणी"}</th>
              <th>{english ? "Punishment Review" : "सजा रिकॉर्ड समीक्षा"}</th>
              <th>{english ? "Select" : "चयन"}</th>
            </tr>
          </thead>
          <tbody>
            {acpEligibleList.slice(0, 150).map((r, i) => (
              <tr key={i}>
                <td className="module-cell-center english-cell">{r.belt}</td>
                <td className="module-cell-center english-cell">{r.cader}</td>
                <td className="module-cell-bold"><HindiText text={r.name} /></td>
                <td><HindiText text={r.posting} /></td>
                <td className="module-cell-center english-cell">{r.doj}</td>
                <td className="module-cell-center module-cell-bold english-cell">{r.yrs}</td>
                <td className="module-cell-center module-cell-accent-cyan english-cell">{r.stage}</td>
                <td className={`module-cell-center ${r.punishmentReview.includes("(") ? "module-cell-accent-amber" : "module-cell-accent-green"}`}>
                  {r.punishmentReview}
                </td>
                <td className="module-cell-center">
                  <button type="button" className="module-btn-small" onClick={() => setSelectedBelt(String(r.belt || "").trim().toUpperCase())}>
                    {english ? "Select" : "चुनें"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
