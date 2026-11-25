import { useState, useMemo } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { formatDateOnly } from "../../shared/commonFunctions";
import { getProbationDetails, getVacantBelts } from "./bhartiLogic";
import "./bharti.css";

/**
 * [COMPONENT] BhartiModule — नवीन भर्ती पंजीयन, रिक्रूट सूची एवं स्थायीकरण आदेश
 */
export default function BhartiModule({ records = [], setRecords, allSheets = {}, setAllSheets, language = "hi" }) {
  const [subTab, setSubTab] = useState("FORM"); // FORM | RT_LIST | CONFIRMATION
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");
  const [confirmationBelt, setConfirmationBelt] = useState("");
  const [confirmationDate, setConfirmationDate] = useState("");
  const [confirmationOrder, setConfirmationOrder] = useState("");
  const [form, setForm] = useState({
    CADER: "FC (RT)", "BELT NO": "", NAME: "", "FATHER NAME": "",
    POSTING: "पुलिस लाईन चित्तौड़गढ़", "POSTING DOB NO": "", EDUCATION: "12th",
    "DATE OF BIRTH": "", "DATE OF JOINING": "", "MOBILE NO 1": "", DISTRICT: "चित्तौड़गढ़"
  });
  const english = language === "en";

  const vacantBelts = useMemo(() => getVacantBelts(records), [records]);

  const rtList = useMemo(() => filterEmployeesByGender(records, gender)
    .filter((r) => String(r["CADER"] || "").toUpperCase().includes("RT"))
    .filter((r) => !search.trim() || matchesEmployeeSearch(r, search, ["NAME", "FATHER NAME", "BELT NO", "CADER", "POSTING"]))
    .map((record) => {
      const probation = getProbationDetails(record);
      return {
        ...record,
        "JOINING YEAR": probation.joiningYear,
        "PROBATION END": probation.probationEnd,
        "PROBATION STATUS": probation.status
      };
    }), [records, gender, search]);

  const joiningYearRows = [...new Set(rtList.map((record) => record["JOINING YEAR"]).filter(Boolean))]
    .sort((a, b) => b - a)
    .flatMap((joiningYear) => rtList.filter((record) => record["JOINING YEAR"] === joiningYear));

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.NAME.trim()) return alert(english ? "Enter Name." : "नाम भरें!");
    if (!form["BELT NO"]) return alert(english ? "Select vacant belt number." : "खाली बेल्ट नंबर चुनें।");
    if (records.some((record) => String(record["BELT NO"] || "").trim().toUpperCase() === String(form["BELT NO"]).trim().toUpperCase())) {
      return alert(english ? "This belt number already exists." : "यह बेल्ट नंबर पहले से रिकॉर्ड में मौजूद है।");
    }
    const newRecord = { ...form, "S.N.": records.length + 1 };
    setRecords((prev) => [newRecord, ...prev]);
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: [newRecord, ...records]
    }));
    alert(english ? "New recruit saved." : "नवीन भर्ती कर्मचारी जुड़ गया है!");
    setForm({ ...form, "BELT NO": "", NAME: "", "FATHER NAME": "", "MOBILE NO 1": "" });
  };

  const saveConfirmation = (event) => {
    event.preventDefault();
    const beltKey = confirmationBelt.trim().toUpperCase();
    if (!records.some((record) => String(record["BELT NO"] || "").trim().toUpperCase() === beltKey)) {
      alert(english ? "Selected recruit not found." : "चयनित भर्ती कर्मचारी रिकॉर्ड में नहीं मिला।");
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
    NAME: record.NAME,
    "नियुक्ति तिथि": record["DATE OF JOINING"],
    "परिवीक्षा पूर्ण": record["PROBATION END"],
    "स्थिति": record["PROBATION STATUS"]
  }));

  const exportRows = subTab === "CONFIRMATION"
    ? recruitExportRows.filter((row) => row["स्थिति"] === "आदेश हेतु लंबित")
    : recruitExportRows;

  return (
    <div className="bharti-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "⚡ Recruitment (Bharti) & Confirmation" : "⚡ भर्ती एवं स्थायीकरण"}
        search={search}
        onSearchChange={setSearch}
        gender={gender}
        onGenderChange={setGender}
        rows={exportRows}
        fileName={subTab === "CONFIRMATION" ? "Confirmation_Review" : "Recruit_Probation_List"}
        language={language}
      />

      <div className="module-tab-bar">
        <button type="button" onClick={() => setSubTab("FORM")} className={`module-tab-btn ${subTab === "FORM" ? "is-active" : ""}`}>
          ➕ {english ? `New Recruitment Form (Vacant Belts: ${vacantBelts.length})` : `नवीन भर्ती पंजीयन फॉर्म (खाली बेल्ट: ${vacantBelts.length})`}
        </button>
        <button type="button" onClick={() => setSubTab("RT_LIST")} className={`module-tab-btn ${subTab === "RT_LIST" ? "is-active" : ""}`}>
          ⚡ {english ? `All Recruits (RT) (${rtList.length})` : `सभी रिक्रूट (RT) सूची (${rtList.length})`}
        </button>
        <button type="button" onClick={() => setSubTab("CONFIRMATION")} className={`module-tab-btn ${subTab === "CONFIRMATION" ? "is-active" : ""}`}>
          ✅ {english ? "Confirmation Orders" : "स्थायीकरण आदेश"}
        </button>
      </div>

      {subTab === "FORM" ? (
        <form onSubmit={handleSave} className="bharti-form-grid">
          <div className="bharti-field">
            <label>{english ? "Post (CADER)" : "पद (CADER)"}</label>
            <select value={form.CADER} onChange={(e) => setForm({ ...form, CADER: e.target.value })}>
              {["FC (RT)", "FC (MT_RT)", "FC", "HC", "ASI", "SI"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="bharti-field">
            <label>{english ? "Select Vacant Belt No." : "खाली बेल्ट नं. चुनें"}</label>
            <select value={form["BELT NO"]} onChange={(e) => setForm({ ...form, "BELT NO": e.target.value })}>
              <option value="">{english ? "-- Select Belt No. --" : "-- बेल्ट नं. चुनें --"}</option>
              {vacantBelts.slice(0, 200).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="bharti-field">
            <label>{english ? "Name *" : "नाम *"}</label>
            <input type="text" required value={form.NAME} onChange={(e) => setForm({ ...form, NAME: e.target.value })} />
          </div>
          <div className="bharti-field">
            <label>{english ? "Father Name" : "पिता का नाम"}</label>
            <input type="text" value={form["FATHER NAME"]} onChange={(e) => setForm({ ...form, "FATHER NAME": e.target.value })} />
          </div>
          <div className="bharti-field">
            <label>{english ? "DOB (DD-MM-YYYY)" : "जन्म तिथि (DD-MM-YYYY)"}</label>
            <input type="text" value={form["DATE OF BIRTH"]} onChange={(e) => setForm({ ...form, "DATE OF BIRTH": e.target.value })} />
          </div>
          <div className="bharti-field">
            <label>{english ? "DOJ (DD-MM-YYYY)" : "नियुक्ति तिथि (DD-MM-YYYY)"}</label>
            <input type="text" value={form["DATE OF JOINING"]} onChange={(e) => setForm({ ...form, "DATE OF JOINING": e.target.value })} />
          </div>
          <div className="bharti-field">
            <label>{english ? "Mobile No." : "मोबाइल नं."}</label>
            <input type="text" value={form["MOBILE NO 1"]} onChange={(e) => setForm({ ...form, "MOBILE NO 1": e.target.value })} />
          </div>
          <div className="bharti-field">
            <label>{english ? "Home District" : "गृह जिला"}</label>
            <input type="text" value={form.DISTRICT} onChange={(e) => setForm({ ...form, DISTRICT: e.target.value })} />
          </div>
          <div className="bharti-submit-row">
            <button type="submit" className="module-btn-success">
              ✅ {english ? "Save New Recruit" : "नया रिक्रूट सेव करें"}
            </button>
          </div>
        </form>
      ) : subTab === "RT_LIST" ? (
        <div className="table-responsive-box">
          <table className="module-table">
            <thead>
              <tr>
                <th>{english ? "Joining Year" : "JOINING YEAR"}</th>
                <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                <th>{english ? "Post" : "पद"}</th>
                <th>{english ? "Name" : "नाम"}</th>
                <th>{english ? "Father Name" : "पिता का नाम"}</th>
                <th>{english ? "DOJ" : "नियुक्ति तिथि"}</th>
                <th>{english ? "Probation End" : "परिवीक्षा पूर्ण"}</th>
                <th>{english ? "Status" : "स्थिति"}</th>
              </tr>
            </thead>
            <tbody>
              {joiningYearRows.map((r, i) => (
                <tr key={r._uid || i}>
                  <td className="module-cell-center english-cell">{r["JOINING YEAR"]}</td>
                  <td className="module-cell-center english-cell">{r["BELT NO"]}</td>
                  <td className="module-cell-center english-cell">{r["CADER"]}</td>
                  <td className="module-cell-bold"><HindiText text={r["NAME"]} /></td>
                  <td><HindiText text={r["FATHER NAME"]} /></td>
                  <td className="module-cell-center english-cell">{formatDateOnly(r["DATE OF JOINING"])}</td>
                  <td className="module-cell-center english-cell">{r["PROBATION END"]}</td>
                  <td className="module-cell-center">{r["PROBATION STATUS"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <form onSubmit={saveConfirmation} className="module-form-card">
            <select required value={confirmationBelt} onChange={(event) => setConfirmationBelt(event.target.value)}>
              <option value="">{english ? "Select Recruit" : "भर्ती कर्मचारी चुनें"}</option>
              {rtList.map((record) => (
                <option
                  key={record._uid || record["BELT NO"]}
                  value={String(record["BELT NO"] || "").trim().toUpperCase()}
                  className={isDevlysText(record.NAME) ? "devlys-text" : undefined}
                >
                  {record["BELT NO"]} — {record.NAME}
                </option>
              ))}
            </select>
            <input required type="text" placeholder={english ? "Confirmation Date (DD-MM-YYYY)" : "स्थायीकरण दिनांक (DD-MM-YYYY)"} value={confirmationDate} onChange={(event) => setConfirmationDate(event.target.value)} />
            <input required type="text" placeholder={english ? "Confirmation Order No." : "स्थायीकरण आदेश नं."} value={confirmationOrder} onChange={(event) => setConfirmationOrder(event.target.value)} />
            <button type="submit" className="module-btn-success">
              ✅ {english ? "Save Confirmation" : "स्थायीकरण दर्ज करें"}
            </button>
          </form>
          <h3>{english ? "Recorded Confirmation Orders" : "दर्ज स्थायीकरण आदेश"}</h3>
          <div className="table-responsive-box">
            <table className="module-table">
              <thead>
                <tr>
                  <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                  <th>{english ? "Name" : "नाम"}</th>
                  <th>{english ? "Order No." : "आदेश नं."}</th>
                  <th>{english ? "Date" : "दिनांक"}</th>
                </tr>
              </thead>
              <tbody>
                {(allSheets.Posting_History || [])
                  .filter((row) => String(row.POSTING_PLACE || "").includes("[Confirmation]"))
                  .map((row, index) => (
                    <tr key={`${row["BELT NO"]}-${index}`}>
                      <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                      <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                      <td className="module-cell-center english-cell">{row.ORDER_NO_DATE}</td>
                      <td className="module-cell-center english-cell">{formatDateOnly(row.ORDER_DATE)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
