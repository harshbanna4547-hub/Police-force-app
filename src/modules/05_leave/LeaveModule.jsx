import { useMemo, useState } from "react";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, formatDateOnly, getBeltNo } from "../../shared/commonFunctions";
import { openDriveVaultDB } from "../../utils/vaultStorage";
import {
  buildEmployeePlPassbook,
  buildLeaveOrderHtml,
  buildOverstayTracker,
  calculateLeaveDaysBetween,
  calculateRetirementEncashment,
  getFinancialYear,
  getLeaveBalance,
  getLeaveEmployeeKey,
  getRsrLeaveBalances,
  LEAVE_SUBTABS,
  RSR_LEAVE_TYPES,
  RSR_LIMITS,
  sameLeaveEmployee
} from "./leaveLogic";
import "./leave.css";

// [STORAGE] Save generated leave orders & PL encashment ledgers into Storage Vault -> 05. Leave
async function saveLeaveFileToVault(district, subFolderName, fileName, html) {
  const db = await openDriveVaultDB();
  const readTx = db.transaction("drive_items", "readonly");
  const existing = await new Promise((resolve, reject) => {
    const request = readTx.objectStore("drive_items").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const rootName = "05. Leave (अवकाश एवं 300 PL लेखा)";
  const data = await new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" }).arrayBuffer();

  let root = existing.find((item) => item.parentId === "ROOT" && item.kind === "FOLDER" && item.name === rootName && item.district === district);
  const tx = db.transaction("drive_items", "readwrite");
  const store = tx.objectStore("drive_items");
  if (!root) {
    root = { id: `leave_root_${Date.now()}`, parentId: "ROOT", kind: "FOLDER", name: rootName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(root);
  }
  let categoryFolder = existing.find((item) => item.parentId === root.id && item.kind === "FOLDER" && item.name === subFolderName && item.district === district);
  if (!categoryFolder) {
    categoryFolder = { id: `leave_cat_${Date.now()}`, parentId: root.id, kind: "FOLDER", name: subFolderName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(categoryFolder);
  }
  store.put({
    id: `leave_doc_${Date.now()}`,
    parentId: categoryFolder.id,
    kind: "FILE",
    name: fileName,
    mime: "text/html",
    sizeKB: (data.byteLength / 1024).toFixed(1),
    district,
    updatedAt: new Date().toLocaleDateString("en-IN"),
    data
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Leave document save was aborted"));
  });
  window.dispatchEvent(new Event("police-vault-updated"));
}

function openPrintableLeaveWindow(html) {
  const blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Leave_Order_${Date.now()}.html`;
    a.click();
  } else {
    win.addEventListener("load", () => win.print(), { once: true });
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * [COMPONENT] LeaveModule — 300 PL लेखा/नकदीकरण, RSR अवकाश रजिस्टर एवं Overstay/आमद ट्रैकर
 */
export default function LeaveModule({
  records = [],
  plLeaveRows,
  setPlLeaveRows,
  setAllSheets,
  activeProfile = "Chittorgarh",
  initialTab = "PL_300",
  singleTabMode = false,
  language = "hi"
}) {
  const english = language === "en";
  const [subTab, setSubTab] = useState(() => (["PL_300", "REGISTER", "TRACKER"].includes(initialTab) ? initialTab : "PL_300"));
  const [search, setSearch] = useState("");
  const [gender] = useState("ALL");

  // [LEAVE ENTRY FORM STATE]
  const [selectedEmpKey, setSelectedEmpKey] = useState("");
  const [leaveType, setLeaveType] = useState("PL");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [days, setDays] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [remark, setRemark] = useState("");

  // [PASSBOOK MODAL & ENCASHMENT CALCULATOR STATE]
  const [passbookEmployee, setPassbookEmployee] = useState(null);
  const [ledgerActionType, setLedgerActionType] = useState("PL_ENCASHMENT");
  const [ledgerDays, setLedgerDays] = useState("15");
  const [ledgerOrderNo, setLedgerOrderNo] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");
  const [ledgerRemark, setLedgerRemark] = useState("");
  const [basicPay, setBasicPay] = useState("");
  const [daRate, setDaRate] = useState("53");
  const [plPage, setPlPage] = useState(0);

  const ledger = useMemo(() => (Array.isArray(plLeaveRows) ? plLeaveRows : []), [plLeaveRows]);

  // [FILTER] Gender & search filter on employee records
  const filteredRecords = useMemo(() => {
    const byGender = filterEmployeesByGender(records, gender);
    if (!search.trim()) return byGender;
    return byGender.filter((r) => matchesEmployeeSearch(r, search, ["NAME", "BELT NO", "CADER", "POSTING"]));
  }, [records, gender, search]);

  const selectedEmployee = records.find((record) => getLeaveEmployeeKey(record) === selectedEmpKey) || null;
  const selectedRsrBalances = selectedEmployee ? getRsrLeaveBalances(selectedEmployee, ledger) : null;

  // [CALCULATION] 300 PL Account rows across all filtered employees
  const plAccount = useMemo(() => filteredRecords.map((record) => {
    const pl = getLeaveBalance(record, ledger);
    return {
      employee: record,
      _key: getLeaveEmployeeKey(record),
      "BELT NO": getBeltNo(record),
      NAME: record.NAME,
      CADER: record.CADER,
      POSTING: record.POSTING,
      DOJ: formatDateOnly(record["DATE OF JOINING"]),
      "कुल अर्जित PL": pl.earned,
      "उपभोग PL": pl.used,
      "नकदीकरण PL": pl.encashed,
      "शेष PL (Max 300)": pl.balance,
      fyEncashedDays: pl.fyEncashedDays,
      isAtMaxCap: pl.isAtMaxCap,
      overflowDays: pl.overflowDays
    };
  }), [filteredRecords, ledger]);

  const pageSize = 50;
  const plPageCount = Math.max(1, Math.ceil(plAccount.length / pageSize));
  const pagedPlAccount = plAccount.slice(plPage * pageSize, (plPage + 1) * pageSize);

  const atCapCount = plAccount.filter((row) => row.isAtMaxCap).length;
  const fyEncashmentCount = plAccount.filter((row) => row.fyEncashedDays > 0).length;

  // [TRACKER] Overstay / Returning Today / Currently On Leave
  const tracker = useMemo(() => buildOverstayTracker(ledger), [ledger]);
  const currentFy = getFinancialYear();

  const syncDateRange = (nextFrom, nextTo) => {
    setFromDt(nextFrom);
    setToDt(nextTo);
    const calc = calculateLeaveDaysBetween(nextFrom, nextTo);
    if (calc > 0) setDays(String(calc));
  };

  // [ACTION] Save Leave Entry & Auto-Save Order to Storage Vault -> 05. Leave
  const handleAddLeave = async (event, generateOrder = false) => {
    if (event) event.preventDefault();
    const requestedDays = Number(days);
    if (!selectedEmployee || !Number.isFinite(requestedDays) || requestedDays <= 0) {
      window.alert(english ? "Select employee and valid leave days." : "कर्मचारी और वैध अवकाश दिवस चुनें।");
      return;
    }

    const rsr = getRsrLeaveBalances(selectedEmployee, ledger);
    if (leaveType === "PL" && requestedDays > rsr.PL) {
      window.alert(english ? "Requested PL days exceed available PL balance." : "दर्ज PL दिवस उपलब्ध PL शेष से अधिक हैं।");
      return;
    }
    if (leaveType === "CL" && requestedDays > rsr.CL.remaining) {
      window.alert(english ? `CL remaining for ${year} is only ${rsr.CL.remaining} days.` : `इस वर्ष केवल ${rsr.CL.remaining} CL शेष हैं।`);
      return;
    }
    if (leaveType === "ML" && requestedDays > RSR_LIMITS.ML_MAX_DAYS) {
      window.alert(english ? "Maternity leave limit is 180 days." : "मातृत्व अवकाश अधिकतम 180 दिन ही स्वीकृत किया जा सकता है।");
      return;
    }
    if (leaveType === "PL-Pat" && requestedDays > RSR_LIMITS.PATERNITY_MAX_DAYS) {
      window.alert(english ? "Paternity leave limit is 15 days." : "पितृत्व अवकाश अधिकतम 15 दिन ही देय है।");
      return;
    }

    const newEntry = {
      _uid: selectedEmployee._uid,
      "BELT NO": getBeltNo(selectedEmployee),
      NAME: selectedEmployee.NAME,
      CADER: selectedEmployee.CADER,
      POSTING: selectedEmployee.POSTING,
      LEAVE_TYPE: leaveType,
      LEAVE_YEAR: year,
      FROM_DATE: fromDt,
      TO_DATE: toDt,
      DAYS_TAKEN: requestedDays,
      ORDER_NO_DATE: orderNo,
      REMARK: remark,
      RETURN_STATUS: leaveType === "ABSENT" ? "ABSENT" : "ON_LEAVE"
    };

    setPlLeaveRows((previous) => [newEntry, ...(previous || [])]);
    appendRowToSheet(setAllSheets, "PL_Leave_Account", newEntry);

    if (generateOrder) {
      const html = buildLeaveOrderHtml(newEntry, selectedEmployee, activeProfile);
      await saveLeaveFileToVault(
        activeProfile,
        "Leave Sanction Orders",
        `${newEntry["BELT NO"] || "Emp"}_${leaveType}_${Date.now()}.html`,
        html
      ).catch(() => {});
      openPrintableLeaveWindow(html);
    }

    setFromDt("");
    setToDt("");
    setDays("");
    setOrderNo("");
    setRemark("");
  };

  // [ACTION] Record PL Credit / Debit / 15-Day FY Encashment inside Employee Passbook
  const handlePassbookTransaction = async (event) => {
    event.preventDefault();
    if (!passbookEmployee) return;
    const qty = Number(ledgerDays);
    if (!Number.isFinite(qty) || qty <= 0) {
      window.alert(english ? "Enter valid number of days." : "सही दिनों की संख्या दर्ज करें।");
      return;
    }
    const empBalance = getLeaveBalance(passbookEmployee, ledger);
    if (ledgerActionType === "PL_ENCASHMENT") {
      if (qty > empBalance.fyEncashmentRemaining) {
        window.alert(
          english
            ? `Only ${empBalance.fyEncashmentRemaining} days PL encashment left for FY ${currentFy}.`
            : `वित्तीय वर्ष ${currentFy} में केवल ${empBalance.fyEncashmentRemaining} दिन PL नकदीकरण शेष है (अधिकतम 15 दिन)।`
        );
        return;
      }
      if (qty > empBalance.balance) {
        window.alert(english ? "Insufficient PL balance for encashment." : "नकदीकरण हेतु पर्याप्त PL शेष उपलब्ध नहीं है।");
        return;
      }
    }
    if (ledgerActionType === "PL" && qty > empBalance.balance) {
      window.alert(english ? "Insufficient PL balance." : "उपलब्ध PL शेष से अधिक व्यय दर्ज नहीं किया जा सकता।");
      return;
    }

    const row = {
      _uid: passbookEmployee._uid,
      "BELT NO": getBeltNo(passbookEmployee),
      NAME: passbookEmployee.NAME,
      CADER: passbookEmployee.CADER,
      POSTING: passbookEmployee.POSTING,
      LEAVE_TYPE: ledgerActionType,
      LEAVE_YEAR: String(new Date().getFullYear()),
      FINANCIAL_YEAR: currentFy,
      FROM_DATE: ledgerDate || formatDateOnly(new Date()),
      TO_DATE: ledgerDate || formatDateOnly(new Date()),
      DAYS_TAKEN: qty,
      ORDER_NO_DATE: ledgerOrderNo,
      REMARK: ledgerRemark || (ledgerActionType === "PL_ENCASHMENT" ? `FY ${currentFy} 15-Day Encashment` : ""),
      RETURN_STATUS: "RETURNED"
    };

    setPlLeaveRows((prev) => [row, ...(prev || [])]);
    appendRowToSheet(setAllSheets, "PL_Leave_Account", row);

    const html = buildLeaveOrderHtml(row, passbookEmployee, activeProfile);
    await saveLeaveFileToVault(
      activeProfile,
      "300 PL Encashment & Passbook",
      `${row["BELT NO"] || "Emp"}_${ledgerActionType}_${Date.now()}.html`,
      html
    ).catch(() => {});

    setLedgerOrderNo("");
    setLedgerRemark("");
  };

  // [ACTION] Mark employee as returned from leave (आमद दर्ज करें)
  const handleMarkReturned = (entry) => {
    const returnDate = formatDateOnly(new Date());
    const matchFn = (row) =>
      row === entry ||
      (sameLeaveEmployee(entry, row) &&
        row.FROM_DATE === entry.FROM_DATE &&
        row.TO_DATE === entry.TO_DATE &&
        row.LEAVE_TYPE === entry.LEAVE_TYPE);

    setPlLeaveRows((prev) =>
      (prev || []).map((row) => (matchFn(row) ? { ...row, RETURN_STATUS: "RETURNED", RETURN_DATE: returnDate } : row))
    );
    setAllSheets((prev) => ({
      ...prev,
      PL_Leave_Account: (prev.PL_Leave_Account || []).map((row) =>
        matchFn(row) ? { ...row, RETURN_STATUS: "RETURNED", RETURN_DATE: returnDate } : row
      )
    }));
  };

  // [EXPORT ROWS] Dynamic per sub-tab for top ModuleHeaderToolbar
  const leaveRegisterRows = ledger
    .filter((row) => !search.trim() || matchesEmployeeSearch(row, search, ["NAME", "BELT NO", "CADER", "LEAVE_TYPE"]))
    .map((row) => ({
      "BELT NO": row["BELT NO"],
      NAME: row.NAME || "",
      "अवकाश प्रकार": row.LEAVE_TYPE || row.REMARK,
      "वर्ष": row.LEAVE_YEAR || "",
      "अवधि": `${row.FROM_DATE || ""} - ${row.TO_DATE || ""}`,
      "दिन": row.DAYS_TAKEN ?? row.DAYS,
      "DOB / आदेश नं.": row.ORDER_NO_DATE || row.ORDER || "-",
      "स्थिति": row.RETURN_STATUS || "-"
    }));

  const toolbarRows = (() => {
    if (subTab === "PL_300") {
      return plAccount.map((row, idx) => ({
        "क्र.सं.": idx + 1,
        "बेल्ट नं.": row["BELT NO"],
        "नाम": row.NAME,
        "पद": row.CADER,
        "नियुक्ति तिथि": row.DOJ,
        "कुल अर्जित (+15/+15)": row["कुल अर्जित PL"],
        "व्यय PL": row["उपभोग PL"],
        "नकदीकरण PL": row["नकदीकरण PL"],
        "शेष PL (Max 300)": row["शेष PL (Max 300)"]
      }));
    }
    if (subTab === "TRACKER") {
      return [...tracker.overstayAbsent, ...tracker.returningToday, ...tracker.onLeaveToday].map((row) => ({
        "बेल्ट नं.": row["BELT NO"],
        "नाम": row.NAME,
        "प्रकार": row.LEAVE_TYPE,
        "अवधि": `${row.FROM_DATE || "-"} से ${row.TO_DATE || "-"}`,
        "स्थिति": row.overdueDays ? `Overstay (${row.overdueDays} दिन)` : "अवकाश पर"
      }));
    }
    return leaveRegisterRows;
  })();

  const passbookRows = passbookEmployee ? buildEmployeePlPassbook(passbookEmployee, ledger) : [];
  const passbookSummary = passbookEmployee ? getLeaveBalance(passbookEmployee, ledger) : null;
  const retirementCalc = passbookSummary
    ? calculateRetirementEncashment(passbookSummary.balance, basicPay, daRate)
    : null;

  const leaveSectionLabel = subTab === "REGISTER"
    ? (english ? "Leave Entry" : "अवकाश प्रविष्टि")
    : subTab === "TRACKER"
      ? (english ? "Overstay Tracker" : "अवधि-पार / आमद ट्रैकर")
      : (english ? "300 PL Account" : "300 PL लेखा");

  return (
    <div className="leave-module module-panel">
      {/* === TOP UNIFIED MODULE HEADER TOOLBAR === */}
      <ModuleHeaderToolbar
        title={english ? "🏖️ Leave & 300 PL Encashment Portal" : "🏖️ अवकाश, 300 PL लेखा एवं नकदीकरण पोर्टल"}
        sectionLabel={leaveSectionLabel}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPlPage(0);
        }}
        rows={toolbarRows}
        fileName={`Leave_${subTab}`}
        language={language}
      />

      {/* === 3 LEAVE SUB-TABS (Hidden in singleTabMode) === */}
      {!singleTabMode && (
        <nav className="leave-subtabs" aria-label={english ? "Leave management tabs" : "अवकाश प्रबंधन टैब"}>
          {LEAVE_SUBTABS.map((tabItem) => (
            <button
              type="button"
              key={tabItem.id}
              onClick={() => setSubTab(tabItem.id)}
              className={`module-tab-btn ${subTab === tabItem.id ? "is-active" : ""}`}
              aria-pressed={subTab === tabItem.id}
            >
              {english ? tabItem.en : tabItem.hi}
              {tabItem.id === "TRACKER" && tracker.overstayAbsent.length > 0 ? ` (${tracker.overstayAbsent.length})` : ""}
            </button>
          ))}
        </nav>
      )}

      {/* =====================================================================
          SUB-TAB 1: 300 PL ACCOUNT & ENCASHMENT ENGINE
         ===================================================================== */}
      {subTab === "PL_300" && (
        <>
          <div className="leave-rsr-banner">
            📌 {english
              ? "RSR Rule 91: Semi-annual +15 PL is auto-credited on 1 Jan & 1 July (+30/year) up to 300-day cap (300+15 half-year rule). Up to 15 days PL encashment permitted each Financial Year, and max 300 PL at retirement."
              : "RSR नियम 91: 1 जनवरी व 1 जुलाई को स्वतः +15/+15 (+30 PL/वर्ष) जमा होते हैं। अधिकतम संचय सीमा 300 दिन (300+15 अर्धवार्षिक नियम), प्रति वित्तीय वर्ष 15 दिन नकदीकरण तथा सेवानिवृत्ति पर अधिकतम 300 PL नकदीकरण देय है।"}
          </div>

          <div className="leave-kpi-strip">
            <div className="leave-kpi-card">
              <span>{english ? "Personnel Shown" : "कुल कार्मिक"}</span>
              <strong>{plAccount.length}</strong>
            </div>
            <div className="leave-kpi-card is-warning">
              <span>{english ? "At 300 PL Cap (300+15 Alert)" : "300 PL सीमा पर (चेतावनी)"}</span>
              <strong>{atCapCount}</strong>
            </div>
            <div className="leave-kpi-card">
              <span>{english ? `FY ${currentFy} 15-Day Encashments` : `FY ${currentFy} नकदीकरण`}</span>
              <strong>{fyEncashmentCount}</strong>
            </div>
            <div className="leave-kpi-card is-danger">
              <span>{english ? "Overstay / Absent Alerts" : "अनुपस्थित / Overstay चेतावनी"}</span>
              <strong>{tracker.overstayAbsent.length}</strong>
            </div>
          </div>

          <section className="leave-section-card">
            <div className="leave-section-heading">
              <h3>
                📒 {english ? "300 PL Ledger (Click Employee Name for Passbook)" : "300 PL लेखा (पासबुक व नकदीकरण हेतु नाम पर क्लिक करें)"}
              </h3>
            </div>
            <div className="table-responsive-box leave-account-wrap">
              <table className="module-table">
                <thead>
                  <tr>
                    {[
                      english ? "Belt No." : "बेल्ट नं.",
                      english ? "Name (Passbook)" : "नाम (पासबुक खोलें)",
                      english ? "Post" : "पद",
                      english ? "DOJ" : "नियुक्ति तिथि",
                      english ? "Earned (+15/+15)" : "अर्जित (+15/+15)",
                      english ? "Used PL" : "व्यय PL",
                      english ? "Encashed" : "नकदीकरण",
                      english ? "Balance PL (Max 300)" : "शेष PL (अधिकतम 300)"
                    ].map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pagedPlAccount.map((row) => (
                    <tr key={row._key}>
                      <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                      <td className="module-cell-bold">
                        <button
                          type="button"
                          className="leave-name-btn"
                          onClick={() => {
                            setPassbookEmployee(row.employee);
                            setLedgerDate(formatDateOnly(new Date()));
                          }}
                        >
                          <HindiText text={row.NAME} />
                        </button>
                      </td>
                      <td className="module-cell-center english-cell">{row.CADER}</td>
                      <td className="module-cell-center english-cell">{row.DOJ}</td>
                      <td className="module-cell-center english-cell">{row["कुल अर्जित PL"]}</td>
                      <td className="module-cell-center english-cell module-cell-accent-red">{row["उपभोग PL"]}</td>
                      <td className="module-cell-center english-cell module-cell-accent-amber">{row["नकदीकरण PL"]}</td>
                      <td className="module-cell-center module-cell-bold english-cell module-cell-accent-green">
                        {row["शेष PL (Max 300)"]}
                        {row.isAtMaxCap && (
                          <span className="leave-cap-badge" title="300+15 RSR Cap">
                            300+15 Cap
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {plAccount.length > pageSize && (
              <div className="training-pagination">
                <button type="button" className="module-btn-small" disabled={plPage === 0} onClick={() => setPlPage((p) => p - 1)}>
                  ← {english ? "Prev" : "पिछला"}
                </button>
                <span className="english-cell">
                  {english ? "Page" : "पृष्ठ"} {plPage + 1} / {plPageCount}
                </span>
                <button type="button" className="module-btn-small" disabled={plPage + 1 >= plPageCount} onClick={() => setPlPage((p) => p + 1)}>
                  {english ? "Next" : "अगला"} →
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* =====================================================================
          SUB-TAB 2: LEAVE REGISTER & ENTRY (CL / PL / HPL / CCL / ML / PL-Pat)
         ===================================================================== */}
      {subTab === "REGISTER" && (
        <section className="leave-section-card">
          <h3>🗓️ {english ? "RSR Leave Register & Approval Order Entry" : "अवकाश रजिस्टर, लाइव शेष एवं स्वीकृति आदेश जनरेटर"}</h3>

          <form onSubmit={(e) => handleAddLeave(e, false)} className="module-form-card">
            <select required value={selectedEmpKey} onChange={(event) => setSelectedEmpKey(event.target.value)}>
              <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
              {records.map((record) => (
                <option
                  key={getLeaveEmployeeKey(record)}
                  value={getLeaveEmployeeKey(record)}
                  className={isDevlysText(record.NAME) ? "devlys-text" : undefined}
                >
                  {getBeltNo(record)} — {record.NAME} ({record.CADER})
                </option>
              ))}
            </select>
            <select value={leaveType} onChange={(event) => setLeaveType(event.target.value)}>
              {RSR_LEAVE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            <input type="number" min="2000" max="2200" placeholder={english ? "Year" : "वर्ष"} value={year} onChange={(e) => setYear(e.target.value)} />
            <input type="text" placeholder={english ? "From (DD-MM-YYYY)" : "कब से (DD-MM-YYYY)"} value={fromDt} onChange={(e) => syncDateRange(e.target.value, toDt)} />
            <input type="text" placeholder={english ? "To (DD-MM-YYYY)" : "कब तक (DD-MM-YYYY)"} value={toDt} onChange={(e) => syncDateRange(fromDt, e.target.value)} />
            <input type="number" required min="1" placeholder={english ? "Days" : "कुल दिन"} value={days} onChange={(e) => setDays(e.target.value)} />
            <input type="text" placeholder={english ? "DOB / Order No." : "DOB / स्वीकृति आदेश नं."} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <input type="text" placeholder={english ? "Remark / Reason" : "विवरण / कारण"} value={remark} onChange={(e) => setRemark(e.target.value)} />
            <button type="submit" className="module-btn-success">
              ✅ {english ? "Save Leave Entry" : "अवकाश दर्ज करें"}
            </button>
            <button type="button" className="module-btn-primary" onClick={() => handleAddLeave(null, true)}>
              🖨️ {english ? "Save & Print Dispatch Order" : "सेव एवं रवानगी आदेश प्रिंट"}
            </button>
          </form>

          {/* Live 6-Category RSR Balance Pills for Selected Employee */}
          {selectedEmployee && selectedRsrBalances && (
            <div className="leave-balance-pills">
              <span className="leave-balance-pill">👤 <HindiText text={selectedEmployee.NAME} /></span>
              <span className="leave-balance-pill">CL: {selectedRsrBalances.CL.remaining}/{selectedRsrBalances.CL.limit}</span>
              <span className="leave-balance-pill">PL: {selectedRsrBalances.PL}/300</span>
              <span className="leave-balance-pill">HPL: {selectedRsrBalances.HPL.remaining}</span>
              <span className="leave-balance-pill">ML: {selectedRsrBalances.ML.used} (Max 180)</span>
              <span className="leave-balance-pill">PL-Pat: {selectedRsrBalances["PL-Pat"].used} (Max 15)</span>
              <span className="leave-balance-pill">CCL: {selectedRsrBalances.CCL.remaining}/{selectedRsrBalances.CCL.limit}</span>
            </div>
          )}

          <h3>{english ? "Leave Approval Entries" : "अवकाश स्वीकृति / प्रविष्टि आदेश"} ({leaveRegisterRows.length})</h3>
          <div className="table-responsive-box">
            <table className="module-table">
              <thead>
                <tr>
                  {[
                    english ? "Belt No." : "बेल्ट नं.",
                    english ? "Name" : "नाम",
                    english ? "Type" : "प्रकार",
                    english ? "Year" : "वर्ष",
                    english ? "Duration" : "अवधि",
                    english ? "Days" : "दिन",
                    english ? "DOB / Order" : "DOB / आदेश नं.",
                    english ? "Order Print" : "आदेश"
                  ].map((heading) => <th key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {ledger.filter((row) => !search.trim() || matchesEmployeeSearch(row, search, ["NAME", "BELT NO", "CADER", "LEAVE_TYPE"])).map((row, index) => (
                  <tr key={`${row["BELT NO"]}-${index}`}>
                    <td className="module-cell-center english-cell">{row["BELT NO"]}</td>
                    <td className="module-cell-bold"><HindiText text={row.NAME} /></td>
                    <td className="module-cell-center">{row.LEAVE_TYPE || row.REMARK}</td>
                    <td className="module-cell-center english-cell">{row.LEAVE_YEAR || "-"}</td>
                    <td className="module-cell-center english-cell">{`${row.FROM_DATE || "-"} – ${row.TO_DATE || "-"}`}</td>
                    <td className="module-cell-center english-cell">{row.DAYS_TAKEN ?? row.DAYS}</td>
                    <td className="module-cell-center english-cell">{row.ORDER_NO_DATE || row.ORDER || "-"}</td>
                    <td className="module-cell-center">
                      <button
                        type="button"
                        className="module-btn-small"
                        onClick={() => {
                          const emp = records.find((r) => sameLeaveEmployee(r, row)) || {};
                          openPrintableLeaveWindow(buildLeaveOrderHtml(row, emp, activeProfile));
                        }}
                      >
                        🖨️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
          SUB-TAB 3: OVERSTAY / ABSENTEE & RETURN TRACKER
         ===================================================================== */}
      {subTab === "TRACKER" && (
        <>
          <div className="leave-tracker-panel is-overstay">
            <h4>🚨 {english ? `Overstay / Absent Without Intimation Alerts (${tracker.overstayAbsent.length})` : `बिना सूचना अनुपस्थित / अवधि-पार (Overstay) लाल चेतावनी (${tracker.overstayAbsent.length})`}</h4>
            {tracker.overstayAbsent.length === 0 ? (
              <p>{english ? "No overstay or absent alerts right now." : "वर्तमान में कोई Overstay या बिना सूचना अनुपस्थिति दर्ज नहीं है।"}</p>
            ) : (
              tracker.overstayAbsent.map((entry, idx) => (
                <div className="leave-tracker-row" key={`over-${idx}`}>
                  <span>
                    <strong className="module-cell-accent-red">⚠️ Overdue {entry.overdueDays}d</strong> — <HindiText text={entry.NAME} /> ({entry["BELT NO"] || "-"}) · {entry.LEAVE_TYPE} · {entry.FROM_DATE} से {entry.TO_DATE}
                  </span>
                  <button type="button" className="module-btn-success" onClick={() => handleMarkReturned(entry)}>
                    ✅ {english ? "Mark Returned" : "आमद दर्ज करें"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="leave-tracker-panel">
            <h4>📅 {english ? `Leave Ending Today / Expected Return (${tracker.returningToday.length})` : `आज अवकाश अवधि समाप्त हो रही है (${tracker.returningToday.length})`}</h4>
            {tracker.returningToday.length === 0 ? (
              <p>{english ? "No employee scheduled to return today." : "आज किसी कार्मिक की अवकाश समाप्ति निर्धारित नहीं है।"}</p>
            ) : (
              tracker.returningToday.map((entry, idx) => (
                <div className="leave-tracker-row" key={`ret-${idx}`}>
                  <span>
                    <HindiText text={entry.NAME} /> ({entry["BELT NO"] || "-"}) · {entry.LEAVE_TYPE} · {entry.FROM_DATE} से {entry.TO_DATE}
                  </span>
                  <button type="button" className="module-btn-success" onClick={() => handleMarkReturned(entry)}>
                    ✅ {english ? "Mark Returned" : "आमद दर्ज करें"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="leave-tracker-panel">
            <h4>🏖️ {english ? `Currently On Leave Today (${tracker.onLeaveToday.length})` : `आज अवकाश पर चल रहे कार्मिक (${tracker.onLeaveToday.length})`}</h4>
            {tracker.onLeaveToday.length === 0 ? (
              <p>{english ? "No active leave entries for today." : "आज कोई सक्रिय अवकाश प्रविष्टि नहीं है।"}</p>
            ) : (
              tracker.onLeaveToday.map((entry, idx) => (
                <div className="leave-tracker-row" key={`on-${idx}`}>
                  <span>
                    <HindiText text={entry.NAME} /> ({entry["BELT NO"] || "-"}) · {entry.LEAVE_TYPE} · {entry.FROM_DATE} से {entry.TO_DATE} ({entry.DAYS_TAKEN} दिन)
                  </span>
                  <button type="button" className="module-btn-small" onClick={() => handleMarkReturned(entry)}>
                    ✅ {english ? "Early Return" : "अग्रिम आमद"}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* =====================================================================
          PASSBOOK LEDGER & ENCASHMENT MODAL (पासबुक शैली का PL लेजर पॉपअप)
         ===================================================================== */}
      {passbookEmployee && passbookSummary && (
        <div
          className="leave-passbook-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPassbookEmployee(null);
          }}
        >
          <section className="leave-passbook-modal" role="dialog" aria-modal="true" aria-labelledby="pl-passbook-title">
            <div className="leave-section-heading">
              <h3 id="pl-passbook-title">
                📒 <HindiText text={passbookEmployee.NAME} /> ({getBeltNo(passbookEmployee)}) — {english ? "300 PL Passbook & Encashment" : "300 PL पासबुक व नकदीकरण"}
              </h3>
              <button type="button" className="module-btn-small" onClick={() => setPassbookEmployee(null)}>✕</button>
            </div>

            {passbookSummary.isAtMaxCap && (
              <div className="leave-rsr-banner">
                ⚠️ {english
                  ? "300+15 RSR Limit Reached: Balance is at 300 max cap. Claim 15-day FY encashment or avail PL before next half-year lapse."
                  : "300+15 RSR चेतावनी: कार्मिक का संचित PL 300 दिन की अधिकतम सीमा पर है। आगामी अर्धवार्षिक अवधि से पहले 15-दिन नकदीकरण या उपभोग करें।"}
              </div>
            )}

            {/* Direct Credit / Debit / 15-Day Encashment Form with DOB Order */}
            <form onSubmit={handlePassbookTransaction} className="leave-encash-box">
              <label>
                {english ? "Transaction Type" : "लेनदेन प्रकार"}
                <select value={ledgerActionType} onChange={(e) => setLedgerActionType(e.target.value)}>
                  <option value="PL_ENCASHMENT">💰 {english ? `15-Day FY ${currentFy} PL Encashment` : `FY ${currentFy} 15-दिन PL नकदीकरण`}</option>
                  <option value="PL_CREDIT">➕ {english ? "Credit PL (+)" : "अतिरिक्त PL जमा (+)"}</option>
                  <option value="PL">➖ {english ? "Debit / PL Availed (-)" : "PL उपभोग व्यय (-)"}</option>
                </select>
              </label>
              <label>
                {english ? "Days" : "दिन"}
                <input type="number" required min="1" max="300" value={ledgerDays} onChange={(e) => setLedgerDays(e.target.value)} />
              </label>
              <label>
                {english ? "DOB Order No." : "DOB आदेश नं."}
                <input type="text" required placeholder="DOB / Order No." value={ledgerOrderNo} onChange={(e) => setLedgerOrderNo(e.target.value)} />
              </label>
              <label>
                {english ? "Order Date" : "आदेश दिनांक"}
                <input type="text" required placeholder="DD-MM-YYYY" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
              </label>
              <label>
                {english ? "Remark" : "विवरण"}
                <input type="text" value={ledgerRemark} onChange={(e) => setLedgerRemark(e.target.value)} placeholder={english ? "Remark..." : "विवरण..."} />
              </label>
              <button type="submit" className="module-btn-primary">
                💾 {english ? "Save & Archive to Vault" : "सेव करें (Storage में सुरक्षित)"}
              </button>
            </form>

            {/* Retirement 300 PL Encashment Calculator */}
            <div className="leave-encash-box">
              <label>
                {english ? "Retirement Encashable Days" : "सेवानिवृत्ति नकदीकरण दिन"}
                <input type="text" readOnly value={`${retirementCalc?.encashableDays || 0} / 300`} />
              </label>
              <label>
                {english ? "Basic Pay (₹)" : "मूल वेतन (Basic Pay ₹)"}
                <input type="number" min="0" value={basicPay} onChange={(e) => setBasicPay(e.target.value)} placeholder="e.g. 45000" />
              </label>
              <label>
                {english ? "DA (%)" : "महंगाई भत्ता (DA %)"}
                <input type="number" min="0" value={daRate} onChange={(e) => setDaRate(e.target.value)} />
              </label>
              <div>
                <strong>{english ? "Estimated Retirement Value:" : "अनुमानित सेवानिवृत्ति नकदीकरण:"}</strong>{" "}
                <span className="english-cell module-cell-accent-green">
                  ₹ {(retirementCalc?.estimatedAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Passbook Table: Date | Particulars | Order No | Credit (+) | Debit (-) | Balance PL */}
            <div className="table-responsive-box">
              <table className="module-table">
                <thead>
                  <tr>
                    <th>{english ? "Date" : "दिनांक"}</th>
                    <th>{english ? "Particulars" : "विवरण"}</th>
                    <th>{english ? "DOB / Order No." : "आदेश नं."}</th>
                    <th>{english ? "Credit (+)" : "जमा (+)"}</th>
                    <th>{english ? "Debit (-)" : "व्यय (-)"}</th>
                    <th>{english ? "Balance PL" : "शेष PL"}</th>
                  </tr>
                </thead>
                <tbody>
                  {passbookRows.map((ev, i) => (
                    <tr key={`${ev.date}-${i}`}>
                      <td className="module-cell-center english-cell">{ev.date}</td>
                      <td>{ev.particular}</td>
                      <td className="module-cell-center english-cell">{ev.orderNo}</td>
                      <td className="module-cell-center english-cell leave-credit-cell">{ev.credit ? `+${ev.credit}` : "-"}</td>
                      <td className="module-cell-center english-cell leave-debit-cell">{ev.debit ? `-${ev.debit}` : "-"}</td>
                      <td className="module-cell-center english-cell module-cell-bold">{ev.balance}</td>
                    </tr>
                  ))}
                  {passbookRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="module-cell-center">
                        {english ? "No joining date or PL ledger entries available." : "नियुक्ति तिथि या PL प्रविष्टि उपलब्ध नहीं है।"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
