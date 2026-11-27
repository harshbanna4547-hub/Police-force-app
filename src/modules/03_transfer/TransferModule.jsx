import { useMemo, useState } from "react";
import { OFFICE_CO_PS_LIST, PS_CHOWKI_MAP } from "../../data/officeUnits";
import HindiText from "../../core/HindiText";
import { isDevlysText } from "../../core/isDevlysText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { translateUnitName } from "../../utils/i18n";
import {
  buildTransferPostingOptions,
  createTransferOrderUpdates,
  createTemporaryDutyEntry,
  createTransferOrderId,
  formatTransferDate,
  getCompletedTenureYears,
  getTransferDisplayBeltNumber,
  getTransferDisplayCader,
  getTransferRank,
  getTransferEmployeeKey,
  groupTransferOrders,
  isHomePoliceStation,
  normalizeTransferDateInput,
  TRANSFER_RANKS,
  TRANSFER_REMARKS
} from "./transferLogic";
import "./transfer.css";

const TAB_ITEMS = [
  { id: "CREATE", hi: "नया स्थानांतरण आदेश", en: "New Transfer Order" },
  { id: "TENURE", hi: "कार्यकाल / Overstay जाँच", en: "Tenure / Overstay Check" },
  { id: "ISSUED", hi: "जारी आदेश / प्रिंट / Excel", en: "Issued Orders / Print / Excel" },
  { id: "DUTY", hi: "Attachment एवं Deputation", en: "Attachment & Deputation" }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrintValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).split(/(\s+)/).map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    const isUni = /[\u0900-\u097F]/.test(part);
    const cls = isUni ? "unicode-hindi" : isDevlysText(part) ? "devlys" : "english";
    return `<span class="${cls}">${escapeHtml(part)}</span>`;
  }).join("");
}

function getTransferRows(order) {
  return order.rows.map((record, index) => [
    index + 1,
    getTransferDisplayCader(record, (v) => v),
    getTransferDisplayBeltNumber(record, (v) => v),
    record.NAME || "",
    record.OLD_POSTING || "",
    record.POSTING_PLACE || "",
    `${order.orderNo} / ${order.orderDate}`
  ]);
}

function printTransferOrder(order) {
  if (!order?.rows?.length) {
    alert("प्रिंट के लिए जारी स्थानांतरण आदेश उपलब्ध नहीं है।");
    return;
  }

  const fontUrl = typeof window !== "undefined" ? `${window.location.origin}/fonts/DevLys010.ttf` : "/fonts/DevLys010.ttf";
  const columns = ["क्र.सं.", "पद", "बेल्ट नं.", "नाम", "वर्तमान पदस्थापन", "नवीन पदस्थापन", "आदेश नं./दिनांक"];
  const rows = getTransferRows(order);
  const headers = columns.map((column) => `<th class="unicode-hindi">${escapeHtml(column)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((value, index) => (
    index <= 2 || index === 6
      ? `<td class="english">${escapeHtml(value)}</td>`
      : `<td>${formatPrintValue(value)}</td>`
  )).join("")}</tr>`).join("");
  const orderNo = escapeHtml(order.orderNo);
  const orderDate = escapeHtml(order.orderDate);
  const html = `<!doctype html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <title>स्थानांतरण आदेश ${orderNo}</title>
        <style>
          @font-face { font-family: "DevLys 010"; src: url("${fontUrl}") format("truetype"), local("DevLys 010"); }
          @page { size: A4 landscape; margin: 14mm; }
          body { color: #000; font-family: "Times New Roman", serif; font-size: 12pt; }
          .unicode-hindi { font-family: "Noto Sans Devanagari", sans-serif; }
          .devlys { font-family: "DevLys 010", sans-serif; font-size: 17px; line-height: 1.45; }
          .english { font-family: "Times New Roman", Times, serif; }
          h1, h2 { text-align: center; margin: 0 0 8px; }
          h1 { font-size: 19pt; }
          h2 { font-size: 17pt; }
          .order-meta { display: flex; justify-content: space-between; margin: 16px 0 10px; font-size: 12pt; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 7px; text-align: center; }
          th { background: #e2e8f0; font-size: 12pt; }
          td { font-size: 11pt; }
          .signatures { display: flex; justify-content: space-between; margin-top: 52px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1 class="unicode-hindi">कार्यालय पुलिस अधीक्षक</h1>
        <h2 class="unicode-hindi">स्थानांतरण आदेश</h2>
        <div class="order-meta">
          <span><b class="unicode-hindi">आदेश क्रमांक:</b> ${orderNo}</span>
          <span><b class="unicode-hindi">दिनांक:</b> ${orderDate}</span>
        </div>
        <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
        <div class="signatures">
          <span class="unicode-hindi">आदेशानुसार</span>
          <span class="unicode-hindi">पुलिस अधीक्षक</span>
        </div>
      </body>
    </html>`;

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) {
    alert("कृपया ब्राउज़र में पॉप-अप की अनुमति दें।");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

function printRelievingJoiningSlip(order, employee) {
  const fontUrl = typeof window !== "undefined" ? `${window.location.origin}/fonts/DevLys010.ttf` : "/fonts/DevLys010.ttf";
  const html = `<!doctype html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <title>Relieving and Joining Certificate</title>
        <style>
          @font-face { font-family: "DevLys 010"; src: url("${fontUrl}") format("truetype"), local("DevLys 010"); }
          @page { size: A4 portrait; margin: 20mm; }
          body { color: #000; font: 12pt "Times New Roman", serif; line-height: 1.7; }
          .unicode-hindi { font-family: "Noto Sans Devanagari", sans-serif; }
          .devlys { font-family: "DevLys 010", sans-serif; font-size: 17px; line-height: 1.45; }
          .english { font-family: "Times New Roman", Times, serif; }
          h1, h2 { text-align: center; margin: 0 0 8px; }
          h1 { font-size: 19pt; }
          h2 { font-size: 14pt; }
          .meta { margin: 20px 0; border: 1px solid #000; padding: 10px 14px; }
          .certificate { margin: 24px 0; text-align: justify; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 70px; text-align: center; }
          .signature-line { border-top: 1px solid #000; padding-top: 7px; }
        </style>
      </head>
      <body>
        <h1 class="unicode-hindi">रवानगी एवं आगमन प्रमाण-पत्र</h1>
        <h2 class="english">Relieving &amp; Joining Certificate</h2>
        <div class="meta">
          <div><b class="unicode-hindi">आदेश क्रमांक:</b> ${escapeHtml(order.orderNo)}</div>
          <div><b class="unicode-hindi">आदेश दिनांक:</b> ${escapeHtml(order.orderDate)}</div>
        </div>
        <p class="certificate">
          <b class="unicode-hindi">रवानगी प्रमाण-पत्र:</b>
          <span class="unicode-hindi">प्रमाणित किया जाता है कि</span>
          ${formatPrintValue(employee.NAME || "")},
          <span class="unicode-hindi">पद:</span> ${formatPrintValue(employee.CADER || "")},
          <span class="unicode-hindi">बेल्ट नं.:</span> ${formatPrintValue(employee["BELT NO"] || "")},
          को ${formatPrintValue(employee.OLD_POSTING || "")}
          <span class="unicode-hindi">से दिनांक</span> __________________
          <span class="unicode-hindi">को कार्यमुक्त किया गया।</span>
        </p>
        <p class="certificate">
          <b class="unicode-hindi">आगमन / कार्यग्रहण प्रमाण-पत्र:</b>
          ${formatPrintValue(employee.NAME || "")}
          <span class="unicode-hindi">ने</span>
          ${formatPrintValue(employee.POSTING_PLACE || "")}
          <span class="unicode-hindi">में दिनांक</span> __________________
          <span class="unicode-hindi">को कार्यभार ग्रहण कर लिया है।</span>
        </p>
        <div class="signatures">
          <div class="signature-line"><span class="unicode-hindi">रवानगी अधिकारी / कार्यालयाध्यक्ष</span></div>
          <div class="signature-line"><span class="unicode-hindi">आगमन अधिकारी / कार्यालयाध्यक्ष</span></div>
        </div>
      </body>
    </html>`;

  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    alert("कृपया ब्राउज़र में पॉप-अप की अनुमति दें।");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

export default function TransferModule({
  records = [],
  setRecords,
  allSheets = {},
  setAllSheets,
  attRecords = [],
  setAttRecords,
  depRecords = [],
  setDepRecords,
  initialTab = "CREATE",
  singleTabMode = false,
  language = "hi"
}) {
  const [activeTab, setActiveTab] = useState(() =>
    ["CREATE", "TENURE", "ISSUED", "DUTY"].includes(initialTab) ? initialTab : "CREATE"
  );
  const [genderFilter] = useState("ALL");
  const [rankFilter, setRankFilter] = useState("ALL");
  const [stationFilter, setStationFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [assignments, setAssignments] = useState({});
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState(() => formatTransferDate(new Date()));
  const [tenureRankFilter, setTenureRankFilter] = useState("ALL");
  const [tenureStationFilter, setTenureStationFilter] = useState("ALL");
  const [tenureYears, setTenureYears] = useState(2);
  const [tenureSelectedIds, setTenureSelectedIds] = useState(() => new Set());
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [dutyEmployeeKey, setDutyEmployeeKey] = useState("");
  const [dutyType, setDutyType] = useState("ATTACHMENT");
  const [dutyPlace, setDutyPlace] = useState("");
  const [dutyCustomPlace, setDutyCustomPlace] = useState("");
  const [dutyOrderNo, setDutyOrderNo] = useState("");
  const [dutyOrderDate, setDutyOrderDate] = useState(() => formatTransferDate(new Date()));
  const [dutyRemark, setDutyRemark] = useState("");
  const english = language === "en";

  const identityText = (value) => String(value ?? "");
  const genderFilteredRecords = useMemo(
    () => filterEmployeesByGender(records, genderFilter),
    [records, genderFilter]
  );

  const postingOptions = useMemo(
    () => buildTransferPostingOptions(OFFICE_CO_PS_LIST, PS_CHOWKI_MAP),
    []
  );
  const temporaryDutyOptions = useMemo(
    () => buildTransferPostingOptions(
      [...postingOptions, "चुनाव ड्यूटी", "मेला ड्यूटी", "अन्य स्थान"],
      {}
    ),
    [postingOptions]
  );
  const recordsWithKeys = useMemo(
    () => genderFilteredRecords.map((employee, index) => ({
      employee,
      index,
      key: getTransferEmployeeKey(employee, index),
      rank: getTransferRank(employee, identityText)
    })),
    [genderFilteredRecords]
  );
  const stationOptions = useMemo(() => {
    const seen = new Set();
    return recordsWithKeys
      .map(({ employee }) => String(employee.POSTING || "").trim())
      .filter((station) => {
        const key = station.toLocaleLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right, "hi"));
  }, [recordsWithKeys]);

  const visibleEmployees = useMemo(() => {
    const query = searchText.trim();
    return recordsWithKeys.filter(({ employee, rank }) => {
      if (rankFilter !== "ALL" && rank !== rankFilter) return false;
      if (
        stationFilter !== "ALL" &&
        String(employee.POSTING || "").trim().toLocaleLowerCase() !== stationFilter.toLocaleLowerCase()
      ) {
        return false;
      }
      if (!query) return true;
      return matchesEmployeeSearch(employee, query, ["BELT NO", "NAME", "POSTING", "CADER"]);
    });
  }, [recordsWithKeys, rankFilter, stationFilter, searchText]);

  const selectedEmployees = recordsWithKeys.filter(({ key }) => selectedIds.has(key));
  const dutyEmployee = recordsWithKeys.find(({ key }) => key === dutyEmployeeKey)?.employee || null;
  const postingHistory = allSheets["Posting_History"];
  const issuedOrders = useMemo(
    () => groupTransferOrders(Array.isArray(postingHistory) ? postingHistory : []),
    [postingHistory]
  );
  const currentOrder = issuedOrders.find((order) => order.id === selectedOrderId) || issuedOrders[0] || null;

  const tenureEmployees = useMemo(() => recordsWithKeys
    .map((row) => ({
      ...row,
      years: getCompletedTenureYears(row.employee["POSTING DOB NO"])
    }))
    .filter(({ employee, rank, years }) => (
      years !== null &&
      years >= Number(tenureYears) &&
      (tenureRankFilter === "ALL" || rank === tenureRankFilter) &&
      (tenureStationFilter === "ALL" ||
        String(employee.POSTING || "").trim().toLocaleLowerCase() === tenureStationFilter.toLocaleLowerCase()) &&
      (!searchText.trim() || matchesEmployeeSearch(employee, searchText, ["BELT NO", "NAME", "POSTING", "CADER"]))
    ))
    .sort((left, right) => {
      const rankDifference = TRANSFER_RANKS.indexOf(left.rank) - TRANSFER_RANKS.indexOf(right.rank);
      return rankDifference || right.years - left.years;
    }), [recordsWithKeys, tenureYears, tenureRankFilter, tenureStationFilter, searchText]);

  const toggleSelected = (key, checked) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
    if (checked) {
      setAssignments((previous) => ({
        ...previous,
        [key]: previous[key] || { destination: "", remark: TRANSFER_REMARKS[0] }
      }));
    }
  };

  const updateAssignment = (key, field, value) => {
    setAssignments((previous) => ({
      ...previous,
      [key]: { ...(previous[key] || { destination: "", remark: TRANSFER_REMARKS[0] }), [field]: value }
    }));
  };

  const issueTransferOrder = (event) => {
    event.preventDefault();
    if (!selectedEmployees.length) {
      alert(english ? "Select at least one employee." : "आदेश जारी करने से पहले कम से कम एक कर्मचारी चुनें।");
      return;
    }
    if (!orderNo.trim()) {
      alert(english ? "Enter Order Number." : "आदेश क्रमांक भरें।");
      return;
    }
    const normalizedDate = normalizeTransferDateInput(orderDate);
    if (!normalizedDate) {
      alert(english ? "Enter Order Date in DD-MM-YYYY format." : "आदेश दिनांक DD-MM-YYYY में सही रूप से भरें।");
      return;
    }
    const incompleteEmployee = selectedEmployees.find(({ key }) => !assignments[key]?.destination);
    if (incompleteEmployee) {
      alert(english ? "Select destination posting for all employees." : "कृपया सभी चयनित कर्मचारियों के लिए नया पदस्थापन स्थान चुनें।");
      return;
    }

    const cleanOrderNo = orderNo.trim();
    const orderId = createTransferOrderId();
    const issuedAt = new Date().toISOString();
    const { updatedRecords, historyEntries } = createTransferOrderUpdates(
      records,
      assignments,
      selectedIds,
      {
        orderId,
        orderNo: cleanOrderNo,
        orderDate: normalizedDate,
        issuedAt
      }
    );

    setRecords(updatedRecords);
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: updatedRecords,
      Posting_History: [
        ...historyEntries,
        ...(Array.isArray(previous["Posting_History"]) ? previous["Posting_History"] : [])
      ]
    }));
    setSelectedIds(new Set());
    setAssignments({});
    setOrderNo("");
    setOrderDate(formatTransferDate(new Date()));
    setSelectedOrderId(orderId);
    setActiveTab("ISSUED");
    alert(`${selectedEmployees.length} कर्मचारियों का स्थानांतरण आदेश जारी कर रिकॉर्ड में सुरक्षित किया गया।`);
  };

  const sendTenureSelectionToOrder = () => {
    if (!tenureSelectedIds.size) {
      alert("स्थानांतरण सूची में भेजने के लिए कर्मचारी चुनें।");
      return;
    }
    setSelectedIds((previous) => new Set([...previous, ...tenureSelectedIds]));
    setAssignments((previous) => {
      const next = { ...previous };
      tenureSelectedIds.forEach((key) => {
        if (!next[key]) next[key] = { destination: "", remark: TRANSFER_REMARKS[0] };
      });
      return next;
    });
    setTenureSelectedIds(new Set());
    setActiveTab("CREATE");
  };

  const applyDutyAction = (event) => {
    event.preventDefault();
    const selected = recordsWithKeys.find(({ key }) => key === dutyEmployeeKey);
    if (!selected) {
      alert("कार्यवाही के लिए कर्मचारी चुनें।");
      return;
    }
    if (!dutyOrderNo.trim()) {
      alert("आदेश क्रमांक भरें।");
      return;
    }
    const normalizedDate = normalizeTransferDateInput(dutyOrderDate);
    if (!normalizedDate) {
      alert("आदेश दिनांक DD-MM-YYYY में सही रूप से भरें।");
      return;
    }

    const employee = selected.employee;
    if (dutyType === "RELIEVE" || dutyType === "RETIRE") {
      const updatedRecords = recordsWithKeys
        .filter((row) => row.key !== selected.key)
        .map((row) => row.employee);
      setRecords(updatedRecords);
      setAllSheets((previous) => ({
        ...previous,
        Master_All_Data: updatedRecords
      }));
      setDutyEmployeeKey("");
      setDutyOrderNo("");
      alert(`कार्यवाही (${dutyType}) सफलतापूर्वक पूरी हुई।`);
      return;
    }

    const place = dutyPlace === "अन्य स्थान" ? dutyCustomPlace.trim() : dutyPlace;
    if (!place) {
      alert("नया थाना / कार्यालय / ड्यूटी स्थान चुनें या लिखें।");
      return;
    }
    const cleanDutyOrderNo = dutyOrderNo.trim();
    const orderNoDate = `${cleanDutyOrderNo} / ${normalizedDate}`;
    let updatedEmployee = employee;
    let updatedRecords;
    if (dutyType === "ATTACHMENT") {
      updatedEmployee = {
        ...employee,
        "WITHOUR DOB": `${place} (${orderNoDate})`
      };
      updatedRecords = recordsWithKeys.map((row) => row.key === selected.key ? updatedEmployee : row.employee);
    } else {
      const deputedEmployee = { ...employee, POSTING: place };
      updatedRecords = recordsWithKeys.filter((row) => row.key !== selected.key).map((row) => row.employee);
      updatedEmployee = deputedEmployee;
    }

    const dutyEntry = createTemporaryDutyEntry(updatedEmployee, dutyType, {
      place,
      orderNo: cleanDutyOrderNo,
      orderDate: normalizedDate,
      remark: dutyRemark.trim(),
      issuedAt: new Date().toISOString()
    });
    const sheetName = dutyType === "ATTACHMENT" ? "Attachment" : "Deputation";
    if (dutyType === "ATTACHMENT") {
      setAttRecords((previous) => [...(Array.isArray(previous) ? previous : []), dutyEntry]);
    } else {
      setDepRecords((previous) => [...(Array.isArray(previous) ? previous : []), dutyEntry]);
    }
    setRecords(updatedRecords);
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: updatedRecords,
      [sheetName]: [
        dutyEntry,
        ...(Array.isArray(previous[sheetName]) ? previous[sheetName] : [])
      ]
    }));
    setDutyEmployeeKey("");
    setDutyPlace("");
    setDutyCustomPlace("");
    setDutyOrderNo("");
    setDutyOrderDate(formatTransferDate(new Date()));
    setDutyRemark("");
    alert(
      `${dutyType === "ATTACHMENT" ? "संलग्नीकरण" : "प्रतिनियुक्ति"} रिकॉर्ड सुरक्षित हुआ; डैशबोर्ड गणना अपडेट की गई।`
    );
  };

  const toolbarExportRows = useMemo(() => {
    if (activeTab === "ISSUED" && currentOrder) {
      const cols = ["क्र.सं.", "पद", "बेल्ट नं.", "नाम", "वर्तमान पदस्थापन", "नवीन पदस्थापन", "आदेश नं./दिनांक"];
      return getTransferRows(currentOrder).map((row) => Object.fromEntries(cols.map((col, idx) => [col, row[idx]])));
    }
    if (activeTab === "TENURE") {
      return tenureEmployees.map(({ employee, rank, years }, idx) => ({
        "क्र.सं.": idx + 1,
        "पद": getTransferDisplayCader(employee, identityText) || rank,
        "बेल्ट नं.": getTransferDisplayBeltNumber(employee, identityText),
        "नाम": employee.NAME || "",
        "वर्तमान पदस्थापन": employee.POSTING || "",
        "पदस्थापन आदेश": employee["POSTING DOB NO"] || "",
        "पूर्ण वर्ष": years
      }));
    }
    return visibleEmployees.map(({ employee, rank }, idx) => ({
      "क्र.सं.": idx + 1,
      "पद": getTransferDisplayCader(employee, identityText) || rank,
      "बेल्ट नं.": getTransferDisplayBeltNumber(employee, identityText),
      "नाम": employee.NAME || "",
      "वर्तमान पदस्थापन": employee.POSTING || ""
    }));
  }, [activeTab, currentOrder, tenureEmployees, visibleEmployees]);

  const renderRankOptions = () => TRANSFER_RANKS.map((rank) => (
    <option key={rank} value={rank}>{rank === "ALL" ? (english ? "All Posts" : "सभी पद") : rank}</option>
  ));

  const transferSectionLabel = TAB_ITEMS.find((t) => t.id === activeTab)?.[english ? "en" : "hi"]
    || (english ? "Transfer Orders" : "स्थानांतरण आदेश");

  return (
    <section className="transfer-module">
      <ModuleHeaderToolbar
        title={english ? "⇄ Transfer & Order Management" : "⇄ स्थानांतरण / आदेश प्रबंधन"}
        sectionLabel={transferSectionLabel}
        search={searchText}
        onSearchChange={setSearchText}
        rows={toolbarExportRows}
        fileName={activeTab === "ISSUED" && currentOrder ? `Transfer_Order_${currentOrder.orderNo}` : `Transfer_${activeTab}`}
        language={language}
      />

      {!singleTabMode && (
        <nav className="transfer-tabs" role="tablist" aria-label={english ? "Transfer module tabs" : "स्थानांतरण मॉड्यूल टैब"}>
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              id={`transfer-tab-${tab.id.toLowerCase()}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`transfer-panel-${tab.id.toLowerCase()}`}
              className={activeTab === tab.id ? "transfer-tab is-active" : "transfer-tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              {english ? tab.en : tab.hi}
            </button>
          ))}
        </nav>
      )}

      {activeTab === "CREATE" && (
        <div
          id="transfer-panel-create"
          role="tabpanel"
          aria-labelledby="transfer-tab-create"
          className="transfer-panel"
        >
          <form onSubmit={issueTransferOrder}>
            <section className="transfer-card">
              <div className="transfer-section-heading">
                <div>
                  <h3>{english ? "Order Details" : "आदेश विवरण"}</h3>
                  <p>{english ? "Enter order number and issue date." : "आदेश क्रमांक और जारी दिनांक भरें।"}</p>
                </div>
              </div>
              <div className="transfer-form-grid">
                <label className="transfer-field">
                  <span>{english ? "Order Number (DOB No.)" : "आदेश क्रमांक (DOB No.)"}</span>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(event) => setOrderNo(event.target.value)}
                    placeholder="उदा. 875"
                    required
                  />
                </label>
                <label className="transfer-field">
                  <span>{english ? "Order Date (DD-MM-YYYY)" : "आदेश दिनांक (DD-MM-YYYY)"}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={orderDate}
                    onChange={(event) => setOrderDate(event.target.value)}
                    onBlur={() => {
                      const normalized = normalizeTransferDateInput(orderDate);
                      if (normalized) setOrderDate(normalized);
                    }}
                    placeholder="DD-MM-YYYY"
                    pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="transfer-card">
              <div className="transfer-section-heading">
                <div>
                  <h3>{english ? "Search & Select Employees" : "कर्मचारी खोजें और चुनें"}</h3>
                  <p>{english ? "Filter by post, current posting, or name/belt." : "पद, वर्तमान थाना/कार्यालय और नाम/बेल्ट से सूची फ़िल्टर करें।"}</p>
                </div>
                <span className="transfer-selection-badge">{selectedEmployees.length} {english ? "Selected" : "चयनित"}</span>
              </div>
              <div className="transfer-filter-grid">
                <label className="transfer-field">
                  <span>{english ? "Post" : "पद"}</span>
                  <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
                    {renderRankOptions()}
                  </select>
                </label>
                <label className="transfer-field">
                  <span>{english ? "Current Station / Office" : "वर्तमान थाना / कार्यालय"}</span>
                  <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}>
                    <option value="ALL">{english ? "All Locations" : "सभी स्थान"}</option>
                    {stationOptions.map((station) => (
                      <option
                        key={station}
                        value={station}
                        className={isDevlysText(station) ? "devlys-text" : undefined}
                      >
                        {station}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="transfer-table-wrap table-responsive-box">
                <table className="transfer-table">
                  <thead>
                    <tr>
                      <th>{english ? "Select" : "चुनें"}</th>
                      <th>{english ? "Post" : "पद"}</th>
                      <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                      <th>{english ? "Name" : "नाम"}</th>
                      <th>{english ? "Current Posting" : "वर्तमान थाना / कार्यालय"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEmployees.map(({ employee, key, rank }) => (
                      <tr key={key}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${employee.NAME || ""}`}
                            checked={selectedIds.has(key)}
                            onChange={(event) => toggleSelected(key, event.target.checked)}
                          />
                        </td>
                        <td className="english-cell">{getTransferDisplayCader(employee, identityText) || rank}</td>
                        <td className="english-cell">{getTransferDisplayBeltNumber(employee, identityText)}</td>
                        <td><HindiText text={employee.NAME || ""} /></td>
                        <td><HindiText text={employee.POSTING || "—"} /></td>
                      </tr>
                    ))}
                    {!visibleEmployees.length && (
                      <tr><td className="transfer-empty" colSpan="5">{english ? "No employees found for the selected filter." : "दिए गए फ़िल्टर में कर्मचारी नहीं मिले।"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedEmployees.length > 0 && (
              <section className="transfer-card">
                <div className="transfer-section-heading">
                  <div>
                    <h3>{english ? "New Posting & Remark" : "नया पदस्थापन और रिमार्क"}</h3>
                    <p>{english ? "Select destination posting and remark for each selected employee." : "हर चयनित कर्मचारी के लिए स्थान और आदेश का आधार चुनें।"}</p>
                  </div>
                </div>
                <div className="transfer-table-wrap table-responsive-box">
                  <table className="transfer-table assignment-table">
                    <thead>
                      <tr>
                        <th>{english ? "Employee" : "कर्मचारी"}</th>
                        <th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th>
                        <th>{english ? "New Posting" : "नया पदस्थापन स्थान"}</th>
                        <th>{english ? "Remark" : "रिमार्क"}</th>
                        <th>{english ? "Remove" : "हटाएँ"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEmployees.map(({ employee, key }) => (
                        <tr key={key}>
                          <td>
                            <strong><HindiText text={employee.NAME || ""} /></strong>
                            <small className="english-cell">
                              {getTransferDisplayBeltNumber(employee, identityText)} · {getTransferDisplayCader(employee, identityText)}
                            </small>
                          </td>
                          <td><HindiText text={employee.POSTING || "—"} /></td>
                          <td>
                            <select
                              value={assignments[key]?.destination || ""}
                              onChange={(event) => updateAssignment(key, "destination", event.target.value)}
                              required
                            >
                              <option value="">{english ? "Select Destination" : "नया स्थान चुनें"}</option>
                              {postingOptions.map((place) => (
                                <option key={place} value={place}>{translateUnitName(place, language)}</option>
                              ))}
                            </select>
                            {isHomePoliceStation(
                              assignments[key]?.destination,
                              employee,
                              identityText,
                              PS_CHOWKI_MAP
                            ) && (
                              <p className="transfer-home-ps-warning" role="alert">
                                ⚠️ {english ? "Warning: This is the employee's Home Police Station!" : "सावधान: यह कर्मचारी का गृह थाना (Home PS) है!"}
                              </p>
                            )}
                          </td>
                          <td>
                            <select
                              value={assignments[key]?.remark || TRANSFER_REMARKS[0]}
                              onChange={(event) => updateAssignment(key, "remark", event.target.value)}
                            >
                              {TRANSFER_REMARKS.map((remark) => <option key={remark} value={remark}>{remark}</option>)}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="transfer-remove-button"
                              onClick={() => toggleSelected(key, false)}
                            >
                              {english ? "Remove" : "हटाएँ"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="submit" className="transfer-primary-button">
                  ✅ {english ? "Issue Transfer Order & Update Data" : "आदेश जारी करें एवं डेटा अपडेट करें"}
                </button>
              </section>
            )}
          </form>
        </div>
      )}

      {activeTab === "TENURE" && (
        <div
          id="transfer-panel-tenure"
          role="tabpanel"
          aria-labelledby="transfer-tab-tenure"
          className="transfer-panel"
        >
          <section className="transfer-card">
            <div className="transfer-section-heading">
              <div>
                <h3>{english ? "Tenure Duration at Current Posting" : "एक ही स्थान पर कार्यकाल अवधि"}</h3>
                <p>{english ? "Calculated from POSTING DOB NO date up to today." : "POSTING DOB NO में दर्ज दिनांक से आज तक पूर्ण वर्ष गणना की गई है।"}</p>
              </div>
              <span className="transfer-selection-badge">{tenureEmployees.length} {english ? "Employees" : "कर्मचारी"}</span>
            </div>
            <div className="transfer-filter-grid tenure-filter-grid">
              <label className="transfer-field">
                <span>{english ? "Tenure" : "कार्यकाल"}</span>
                <select value={tenureYears} onChange={(event) => setTenureYears(Number(event.target.value))}>
                  {[2, 3, 4, 5].map((years) => <option key={years} value={years}>{years}+ {english ? "Years" : "वर्ष"}</option>)}
                </select>
              </label>
              <label className="transfer-field">
                <span>{english ? "Post" : "पद"}</span>
                <select value={tenureRankFilter} onChange={(event) => setTenureRankFilter(event.target.value)}>
                  {renderRankOptions()}
                </select>
              </label>
              <label className="transfer-field">
                <span>{english ? "Station / Office" : "थाना / कार्यालय"}</span>
                <select value={tenureStationFilter} onChange={(event) => setTenureStationFilter(event.target.value)}>
                  <option value="ALL">{english ? "All Locations" : "सभी स्थान"}</option>
                  {stationOptions.map((station) => (
                    <option
                      key={station}
                      value={station}
                      className={isDevlysText(station) ? "devlys-text" : undefined}
                    >
                      {station}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="transfer-table-wrap table-responsive-box">
              <table className="transfer-table">
                <thead>
                  <tr>
                    <th>{english ? "Select" : "चुनें"}</th>
                    <th>{english ? "Post" : "पद"}</th>
                    <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                    <th>{english ? "Name" : "नाम"}</th>
                    <th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th>
                    <th>{english ? "Posting Order / Date" : "पदस्थापन आदेश / दिनांक"}</th>
                    <th>{english ? "Completed Tenure" : "पूर्ण अवधि"}</th>
                  </tr>
                </thead>
                <tbody>
                  {tenureEmployees.map(({ employee, key, rank, years }) => (
                    <tr key={key}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${employee.NAME || ""}`}
                          checked={tenureSelectedIds.has(key)}
                          onChange={(event) => setTenureSelectedIds((previous) => {
                            const next = new Set(previous);
                            if (event.target.checked) next.add(key);
                            else next.delete(key);
                            return next;
                          })}
                        />
                      </td>
                      <td className="english-cell">{getTransferDisplayCader(employee, identityText) || rank}</td>
                      <td className="english-cell">{getTransferDisplayBeltNumber(employee, identityText)}</td>
                      <td><HindiText text={employee.NAME || ""} /></td>
                      <td><HindiText text={employee.POSTING || ""} /></td>
                      <td className="english-cell"><HindiText text={employee["POSTING DOB NO"] || ""} /></td>
                      <td><strong>{years} {english ? "Yrs" : "वर्ष"}</strong></td>
                    </tr>
                  ))}
                  {!tenureEmployees.length && (
                    <tr><td className="transfer-empty" colSpan="7">{english ? "No records match this duration and filter." : "इस अवधि और फ़िल्टर के लिए रिकॉर्ड नहीं मिला।"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="transfer-primary-button"
              disabled={!tenureSelectedIds.size}
              onClick={sendTenureSelectionToOrder}
            >
              {english ? `Send Selected to Transfer Order (${tenureSelectedIds.size})` : `चयनित कर्मचारियों को स्थानांतरण सूची में भेजें (${tenureSelectedIds.size})`}
            </button>
          </section>
        </div>
      )}

      {activeTab === "ISSUED" && (
        <div
          id="transfer-panel-issued"
          role="tabpanel"
          aria-labelledby="transfer-tab-issued"
          className="transfer-panel"
        >
          <section className="transfer-card">
            <div className="transfer-section-heading">
              <div>
                <h3>{english ? "Issued Transfer Orders" : "जारी स्थानांतरण आदेश"}</h3>
                <p>{english ? "Orders are saved in Posting_History and can be reprinted anytime." : "आदेश इस जिले की Posting_History में सुरक्षित हैं और यहाँ से दोबारा प्रिंट किए जा सकते हैं।"}</p>
              </div>
              <span className="transfer-selection-badge">{issuedOrders.length} {english ? "Orders" : "आदेश"}</span>
            </div>
            {!issuedOrders.length ? (
              <p className="transfer-empty-message">{english ? "No transfer order issued yet." : "अभी कोई स्थानांतरण आदेश जारी नहीं हुआ है।"}</p>
            ) : (
              <>
                <label className="transfer-field transfer-order-picker">
                  <span>{english ? "Select Order" : "आदेश चुनें"}</span>
                  <select value={currentOrder?.id || ""} onChange={(event) => setSelectedOrderId(event.target.value)}>
                    {issuedOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {english ? "Order" : "आदेश"} {order.orderNo} · {order.orderDate} · {order.rows.length} {english ? "Employees" : "कर्मचारी"}
                      </option>
                    ))}
                  </select>
                </label>
                {currentOrder && (
                  <>
                    <div className="transfer-order-summary">
                      <strong>{english ? "Order No." : "आदेश क्रमांक"}: {currentOrder.orderNo}</strong>
                      <span>{english ? "Date" : "दिनांक"}: {currentOrder.orderDate}</span>
                      <span>{english ? "Employees" : "कर्मचारी"}: {currentOrder.rows.length}</span>
                    </div>
                    <div className="transfer-table-wrap table-responsive-box">
                      <table className="transfer-table">
                        <thead>
                          <tr>
                            <th>{english ? "S.N." : "क्र.सं."}</th>
                            <th>{english ? "Post" : "पद"}</th>
                            <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                            <th>{english ? "Name" : "नाम"}</th>
                            <th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th>
                            <th>{english ? "New Posting" : "नवीन पदस्थापन"}</th>
                            <th>{english ? "Order No. / Date" : "आदेश नं./दिनांक"}</th>
                            <th>{english ? "Slip" : "पर्ची"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentOrder.rows.map((employee, index) => (
                            <tr key={`${currentOrder.id}-${employee["BELT NO"] || employee.NAME}-${index}`}>
                              <td className="english-cell">{index + 1}</td>
                              <td className="english-cell">{getTransferDisplayCader(employee, identityText)}</td>
                              <td className="english-cell">{getTransferDisplayBeltNumber(employee, identityText)}</td>
                              <td><HindiText text={employee.NAME || ""} /></td>
                              <td><HindiText text={employee.OLD_POSTING || "—"} /></td>
                              <td><HindiText text={employee.POSTING_PLACE || ""} /></td>
                              <td className="english-cell">{`${currentOrder.orderNo} / ${currentOrder.orderDate}`}</td>
                              <td>
                                <button
                                  type="button"
                                  className="transfer-slip-button"
                                  onClick={() => printRelievingJoiningSlip(
                                    currentOrder,
                                    currentOrder.rows[index]
                                  )}
                                >
                                  📄 {english ? "Relieving Slip" : "रिलीविंग पर्ची"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="transfer-action-row">
                      <button type="button" className="transfer-primary-button" onClick={() => printTransferOrder(currentOrder)}>
                        🖨️ {english ? "Print Official Order" : "आदेश प्रिंट करें"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {activeTab === "DUTY" && (
        <div
          id="transfer-panel-duty"
          role="tabpanel"
          aria-labelledby="transfer-tab-duty"
          className="transfer-panel"
        >
          <section className="transfer-card">
            <div className="transfer-section-heading">
              <div>
                <h3>{english ? "Attachment & Deputation" : "संलग्नीकरण एवं प्रतिनियुक्ति"}</h3>
                <p>{english ? "Record temporary duty in office, PS, election, or fair." : "कार्यालय, थाना, चुनाव/मेला ड्यूटी में अस्थायी तैनाती दर्ज करें।"}</p>
              </div>
            </div>
            <div className="transfer-duty-counts">
              <div><span>On Attachment</span><strong>{attRecords.length}</strong></div>
              <div><span>On Deputation</span><strong>{depRecords.length}</strong></div>
            </div>
            <form onSubmit={applyDutyAction}>
              <div className="transfer-filter-grid">
                <label className="transfer-field">
                  <span>{english ? "Employee" : "कर्मचारी"}</span>
                  <select
                    value={dutyEmployeeKey}
                    onChange={(event) => setDutyEmployeeKey(event.target.value)}
                    required
                  >
                    <option value="">{english ? "Select Employee" : "कर्मचारी चुनें"}</option>
                    {recordsWithKeys.map(({ employee, key }) => (
                      <option
                        key={key}
                        value={key}
                        className={isDevlysText(employee.NAME) ? "devlys-text" : undefined}
                      >
                        {employee["BELT NO"] || "-"} · {employee.NAME || ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="transfer-field">
                  <span>{english ? "Action" : "कार्यवाही"}</span>
                  <select value={dutyType} onChange={(event) => setDutyType(event.target.value)}>
                    <option value="ATTACHMENT">{english ? "Attachment" : "संलग्नीकरण (Attachment)"}</option>
                    <option value="DEPUTATION">{english ? "Deputation" : "प्रतिनियुक्ति (Deputation)"}</option>
                    <option value="RELIEVE">{english ? "Relieve" : "कार्य-मुक्त (Relieve)"}</option>
                    <option value="RETIRE">{english ? "Retirement / Death" : "सेवानिवृत्ति / मृत्यु"}</option>
                  </select>
                </label>
                {["ATTACHMENT", "DEPUTATION"].includes(dutyType) && (
                  <>
                    <label className="transfer-field">
                      <span>{english ? "New Office / PS / Duty" : "नया कार्यालय / थाना / ड्यूटी"}</span>
                      <select
                        value={dutyPlace}
                        onChange={(event) => setDutyPlace(event.target.value)}
                        required
                      >
                        <option value="">{english ? "Select Location" : "स्थान चुनें"}</option>
                        {temporaryDutyOptions.map((place) => (
                          <option key={place} value={place}>{translateUnitName(place, language)}</option>
                        ))}
                      </select>
                    </label>
                    {dutyPlace === "अन्य स्थान" && (
                      <label className="transfer-field">
                        <span>{english ? "Other Duty / Location Name" : "अन्य ड्यूटी / स्थान का नाम"}</span>
                        <input
                          value={dutyCustomPlace}
                          onChange={(event) => setDutyCustomPlace(event.target.value)}
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                <label className="transfer-field">
                  <span>{english ? "Order Number" : "आदेश क्रमांक"}</span>
                  <input
                    value={dutyOrderNo}
                    onChange={(event) => setDutyOrderNo(event.target.value)}
                    placeholder="उदा. 875"
                    required
                  />
                </label>
                <label className="transfer-field">
                  <span>{english ? "Order Date (DD-MM-YYYY)" : "आदेश दिनांक (DD-MM-YYYY)"}</span>
                  <input
                    inputMode="numeric"
                    value={dutyOrderDate}
                    onChange={(event) => setDutyOrderDate(event.target.value)}
                    onBlur={() => {
                      const normalized = normalizeTransferDateInput(dutyOrderDate);
                      if (normalized) setDutyOrderDate(normalized);
                    }}
                    placeholder="DD-MM-YYYY"
                    pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
                    required
                  />
                </label>
                {["ATTACHMENT", "DEPUTATION"].includes(dutyType) && (
                  <label className="transfer-field">
                    <span>{english ? "Remark / Details" : "ड्यूटी / कार्यवाही का विवरण"}</span>
                    <input
                      value={dutyRemark}
                      onChange={(event) => setDutyRemark(event.target.value)}
                      placeholder={english ? "Optional details" : "वैकल्पिक विवरण"}
                    />
                  </label>
                )}
              </div>
              {dutyEmployee && (
                <p className="transfer-duty-employee">
                  {english ? "Selected Employee" : "चयनित कर्मचारी"}: <strong><HindiText text={dutyEmployee.NAME || ""} /></strong>
                  {" · "}<span className="english-cell">{dutyEmployee["BELT NO"] || "-"}</span>
                  {" · "}{english ? "Current Posting" : "वर्तमान पदस्थापन"}: <HindiText text={dutyEmployee.POSTING || "—"} />
                </p>
              )}
              <button type="submit" className="transfer-primary-button">
                ✅ {english ? "Save Action" : (dutyType === "ATTACHMENT" ? "संलग्नीकरण सुरक्षित करें" : dutyType === "DEPUTATION" ? "प्रतिनियुक्ति सुरक्षित करें" : "कार्यवाही लागू करें")}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
