import { useMemo, useState } from "react";
import { parseAnyDate, formatDateDDMMYYYY } from "../utils/reportEngine";
import ExportBar from "../core/ExportBar";

export default function AcpModule({ records, allSheets = {}, setAllSheets, devToHindi }) {
  const [selectedBelt, setSelectedBelt] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
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
          punishmentReview: punishments.length ? `रिकॉर्ड समीक्षा (${punishments.length})` : "कोई दर्ज रिकॉर्ड नहीं"
        });
      }
    });
    return list.sort((a, b) => Number(b.yrs) - Number(a.yrs));
  }, [records, allSheets]);
  const exportRows = acpEligibleList.map((row) => ({
    "BELT NO": row.belt,
    CADER: row.cader,
    NAME: devToHindi(row.name),
    POSTING: devToHindi(row.posting),
    "नियुक्ति तिथि": row.doj,
    "कुल सेवा (वर्ष)": row.yrs,
    "ACP श्रेणी": row.stage,
    "सजा रिकॉर्ड समीक्षा": row.punishmentReview
  }));
  const selectedEmployee = acpEligibleList.find((row) => String(row.belt || "").trim().toUpperCase() === selectedBelt);
  const approvedOrders = (allSheets["Posting_History"] || []).filter((row) =>
    String(row.POSTING_PLACE || "").includes("[ACP]")
  );
  const saveApprovalOrder = (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      alert("ACP सेवा-अवधि सूची से कर्मचारी चुनें।");
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
    setAllSheets((previous) => ({
      ...previous,
      Posting_History: [approval, ...(previous["Posting_History"] || [])]
    }));
    setOrderNo("");
    setOrderDate("");
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ marginTop: 0, color: "#0B1E3D" }}>🎖️ 9 / 18 / 27 वर्ष ACP सेवा-अवधि सूची ({acpEligibleList.length})</h2>
        <ExportBar title="ACP सेवा-अवधि सूची" rows={exportRows} fileName="ACP_Eligibility_Review" />
      </div>
      <p style={{ color: "#92400E" }}>ACP स्वीकृति से पहले दर्ज सजा/विभागीय रिकॉर्ड की समीक्षा करें। सजा रिकॉर्ड अपने-आप अयोग्यता नहीं बनाता।</p>
      <form onSubmit={saveApprovalOrder} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "8px" }}>
        <select required value={selectedBelt} onChange={(event) => setSelectedBelt(event.target.value)} style={{ padding: "8px" }}>
          <option value="">ACP सेवा-अवधि सूची से कर्मचारी चुनें</option>
          {acpEligibleList.map((row) => <option key={`${row.belt}-${row.stage}`} value={String(row.belt || "").trim().toUpperCase()}>{row.belt} — {devToHindi(row.name)} — {row.stage}</option>)}
        </select>
        <input required value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="ACP स्वीकृति आदेश नं." style={{ padding: "8px" }} />
        <input required value={orderDate} onChange={(event) => setOrderDate(event.target.value)} placeholder="आदेश दिनांक (DD-MM-YYYY)" style={{ padding: "8px" }} />
        <button type="submit" disabled={!selectedEmployee} style={{ padding: "8px 14px", border: 0, borderRadius: "6px", color: "#fff", background: "#16A34A", fontWeight: "bold" }}>✅ ACP आदेश दर्ज करें</button>
      </form>
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
              <th style={{ padding: "8px" }}>सजा रिकॉर्ड समीक्षा</th>
              <th style={{ padding: "8px" }}>चयन</th>
            </tr>
          </thead>
          <tbody>
            {acpEligibleList.slice(0, 150).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r.belt}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r.cader}</td>
                <td style={{ padding: "6px", fontWeight: "bold" }}>{devToHindi(r.name)}</td>
                <td style={{ padding: "6px" }}>{devToHindi(r.posting)}</td>
                <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Times New Roman', Times, serif" }}>{r.doj}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", fontFamily: "'Times New Roman', Times, serif" }}>{r.yrs}</td>
                <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#0369A1", fontFamily: "'Times New Roman', Times, serif" }}>{r.stage}</td>
                <td style={{ padding: "6px", textAlign: "center", color: r.punishmentReview.startsWith("रिकॉर्ड") ? "#B45309" : "#15803D" }}>{r.punishmentReview}</td>
                <td style={{ padding: "6px", textAlign: "center" }}><button type="button" onClick={() => setSelectedBelt(String(r.belt || "").trim().toUpperCase())}>चुनें</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>दर्ज ACP स्वीकृति आदेश ({approvedOrders.length})</h3>
      <ExportBar title="ACP स्वीकृति आदेश" rows={approvedOrders} fileName="ACP_Approval_Orders" />
    </div>
  );
}
