import { useState, useMemo } from "react";
import ExportBar from "../../core/ExportBar";
import { formatDateOnly } from "../../shared/commonFunctions";
import { getProbationDetails, getVacantBelts } from "./bhartiLogic";
import "./bharti.css";

export default function BhartiModule({ records, setRecords, allSheets = {}, setAllSheets, devToHindi }) {
  const [subTab, setSubTab] = useState("FORM"); // FORM | RT_LIST
  const [confirmationBelt, setConfirmationBelt] = useState("");
  const [confirmationDate, setConfirmationDate] = useState("");
  const [confirmationOrder, setConfirmationOrder] = useState("");
  const [form, setForm] = useState({
    CADER: "FC (RT)", "BELT NO": "", NAME: "", "FATHER NAME": "",
    POSTING: "पुलिस लाईन चित्तौड़गढ़", "POSTING DOB NO": "", EDUCATION: "12th",
    "DATE OF BIRTH": "", "DATE OF JOINING": "", "MOBILE NO 1": "", DISTRICT: "चित्तौड़गढ़"
  });

  // खाली बेल्ट नंबर (1 से 1750) निकालना
  const vacantBelts = useMemo(() => {
    return getVacantBelts(records);
  }, [records]);

  const rtList = useMemo(() => records
    .filter((r) => String(r["CADER"] || "").toUpperCase().includes("RT"))
    .map((record) => {
      const probation = getProbationDetails(record);
      return {
        ...record,
        "JOINING YEAR": probation.joiningYear,
        "PROBATION END": probation.probationEnd,
        "PROBATION STATUS": probation.status
      };
    }), [records]);
  const joiningYearRows = [...new Set(rtList.map((record) => record["JOINING YEAR"]).filter(Boolean))]
    .sort((a, b) => b - a)
    .flatMap((joiningYear) => rtList.filter((record) => record["JOINING YEAR"] === joiningYear));

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.NAME.trim()) return alert("नाम भरें!");
    if (!form["BELT NO"]) return alert("खाली बेल्ट नंबर चुनें।");
    if (records.some((record) => String(record["BELT NO"] || "").trim().toUpperCase() === String(form["BELT NO"]).trim().toUpperCase())) {
      return alert("यह बेल्ट नंबर पहले से रिकॉर्ड में मौजूद है।");
    }
    const newRecord = { ...form, "S.N.": records.length + 1 };
    setRecords((prev) => [newRecord, ...prev]);
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: [newRecord, ...records]
    }));
    alert("नवीन भर्ती कर्मचारी जुड़ गया है!");
    setForm({ ...form, "BELT NO": "", NAME: "", "FATHER NAME": "", "MOBILE NO 1": "" });
  };
  const saveConfirmation = (event) => {
    event.preventDefault();
    const beltKey = confirmationBelt.trim().toUpperCase();
    if (!records.some((record) => String(record["BELT NO"] || "").trim().toUpperCase() === beltKey)) {
      alert("चयनित भर्ती कर्मचारी रिकॉर्ड में नहीं मिला।");
      return;
    }
    const nextRecords = records.map((record) =>
      String(record["BELT NO"] || "").trim().toUpperCase() === beltKey
        ? { ...record, "DATE OF CONFIRMATION": confirmationDate, "CONFIRMATION DOB NO": confirmationOrder }
        : record
    );
    setRecords(nextRecords);
    const employee = nextRecords.find((record) => String(record["BELT NO"] || "").trim().toUpperCase() === beltKey);
    const orderRow = {
      "BELT NO": employee["BELT NO"],
      NAME: employee.NAME,
      POSTING_PLACE: "[Confirmation] स्थायीकरण",
      ORDER_NO_DATE: confirmationOrder,
      ORDER_DATE: confirmationDate,
      REMARK: "Probation confirmation order"
    };
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: nextRecords,
      Posting_History: [orderRow, ...(previous.Posting_History || [])]
    }));
    setConfirmationDate("");
    setConfirmationOrder("");
  };
  const recruitExportRows = joiningYearRows.map((record) => ({
    "JOINING YEAR": record["JOINING YEAR"],
    "BELT NO": record["BELT NO"],
    CADER: record.CADER,
    NAME: devToHindi(record.NAME),
    "नियुक्ति तिथि": record["DATE OF JOINING"],
    "परिवीक्षा पूर्ण": record["PROBATION END"],
    "स्थिति": record["PROBATION STATUS"]
  }));

  return (
    <div className="bharti-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setSubTab("FORM")} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", backgroundColor: subTab === "FORM" ? "#0B1E3D" : "#E2E8F0", color: subTab === "FORM" ? "#FACC15" : "#1E293B" }}>
          ➕ नवीन भर्ती पंजीयन फॉर्म (खाली बेल्ट: {vacantBelts.length})
        </button>
        <button onClick={() => setSubTab("RT_LIST")} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", backgroundColor: subTab === "RT_LIST" ? "#0B1E3D" : "#E2E8F0", color: subTab === "RT_LIST" ? "#FACC15" : "#1E293B" }}>
          ⚡ सभी रिक्रूट (RT) सूची ({rtList.length})
        </button>
        <button onClick={() => setSubTab("CONFIRMATION")} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer", backgroundColor: subTab === "CONFIRMATION" ? "#0B1E3D" : "#E2E8F0", color: subTab === "CONFIRMATION" ? "#FACC15" : "#1E293B" }}>
          ✅ स्थायीकरण आदेश
        </button>
      </div>

      {subTab === "FORM" ? (
        <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", maxWidth: "850px" }}>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>पद (CADER)</label>
            <select value={form.CADER} onChange={(e) => setForm({ ...form, CADER: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
              {["FC (RT)", "FC (MT_RT)", "FC", "HC", "ASI", "SI"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>खाली बेल्ट नं. चुनें</label>
            <select value={form["BELT NO"]} onChange={(e) => setForm({ ...form, "BELT NO": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
              <option value="">-- बेल्ट नं. चुनें --</option>
              {vacantBelts.slice(0, 200).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>नाम *</label>
            <input type="text" required value={form.NAME} onChange={(e) => setForm({ ...form, NAME: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>पिता का नाम</label>
            <input type="text" value={form["FATHER NAME"]} onChange={(e) => setForm({ ...form, "FATHER NAME": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>जन्म तिथि (DD-MM-YYYY)</label>
            <input type="text" value={form["DATE OF BIRTH"]} onChange={(e) => setForm({ ...form, "DATE OF BIRTH": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>नियुक्ति तिथि (DD-MM-YYYY)</label>
            <input type="text" value={form["DATE OF JOINING"]} onChange={(e) => setForm({ ...form, "DATE OF JOINING": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>मोबाइल नं.</label>
            <input type="text" value={form["MOBILE NO 1"]} onChange={(e) => setForm({ ...form, "MOBILE NO 1": e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div>
            <label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>गृह जिला</label>
            <input type="text" value={form.DISTRICT} onChange={(e) => setForm({ ...form, DISTRICT: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>✅ Save New Recruit</button>
          </div>
        </form>
      ) : subTab === "RT_LIST" ? (
        <>
        <ExportBar title="वर्षवार भर्ती एवं परिवीक्षा सूची" rows={recruitExportRows} fileName="Recruit_Probation_List" />
        <div className="table-responsive-box">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
              <th style={{ padding: "8px" }}>JOINING YEAR</th><th style={{ padding: "8px" }}>बेल्ट नं.</th><th style={{ padding: "8px" }}>पद</th><th style={{ padding: "8px", textAlign: "left" }}>नाम</th><th style={{ padding: "8px", textAlign: "left" }}>पिता का नाम</th><th style={{ padding: "8px" }}>नियुक्ति तिथि</th><th style={{ padding: "8px" }}>परिवीक्षा पूर्ण</th><th style={{ padding: "8px" }}>स्थिति</th>
            </tr>
          </thead>
          <tbody>
            {joiningYearRows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["JOINING YEAR"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["BELT NO"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["CADER"]}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0", fontWeight: "bold" }}>{devToHindi(r["NAME"])}</td>
                <td style={{ padding: "7px", border: "1px solid #E2E8F0" }}>{devToHindi(r["FATHER NAME"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{formatDateOnly(r["DATE OF JOINING"])}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0", fontFamily: "'Times New Roman', Times, serif" }}>{r["PROBATION END"]}</td>
                <td style={{ padding: "7px", textAlign: "center", border: "1px solid #E2E8F0" }}>{r["PROBATION STATUS"]}</td>
              </tr>
            ))}
          </tbody>
            </table>
        </div>
        </>
      ) : (
        <>
          <form onSubmit={saveConfirmation} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", maxWidth: "900px", marginBottom: "18px" }}>
            <select required value={confirmationBelt} onChange={(event) => setConfirmationBelt(event.target.value)} style={{ padding: "8px" }}>
              <option value="">भर्ती कर्मचारी चुनें</option>
              {rtList.map((record) => <option key={record._uid || record["BELT NO"]} value={String(record["BELT NO"] || "").trim().toUpperCase()}>{record["BELT NO"]} — {devToHindi(record.NAME)}</option>)}
            </select>
            <input required type="text" placeholder="स्थायीकरण दिनांक (DD-MM-YYYY)" value={confirmationDate} onChange={(event) => setConfirmationDate(event.target.value)} style={{ padding: "8px" }} />
            <input required type="text" placeholder="स्थायीकरण आदेश नं." value={confirmationOrder} onChange={(event) => setConfirmationOrder(event.target.value)} style={{ padding: "8px" }} />
            <button type="submit" style={{ background: "#16A34A", color: "#fff", border: 0, borderRadius: "6px", padding: "8px 14px", fontWeight: "bold" }}>✅ स्थायीकरण दर्ज करें</button>
          </form>
          <ExportBar title="स्थायीकरण आदेश पात्र कर्मचारी" rows={recruitExportRows.filter((row) => row["स्थिति"] === "आदेश हेतु लंबित")} fileName="Confirmation_Review" />
          <h3>दर्ज स्थायीकरण आदेश</h3>
          <ExportBar title="दर्ज स्थायीकरण आदेश" rows={(allSheets.Posting_History || []).filter((row) => String(row.POSTING_PLACE || "").includes("[Confirmation]"))} fileName="Confirmation_Orders" />
        </>
      )}
    </div>
  );
}
