import { useCallback, useMemo, useState } from "react";
import XLSX from "xlsx-js-style";
import { OFFICE_CO_PS_LIST, PS_CHOWKI_MAP } from "../../data/officeUnits";
import { unicodeToDevlys } from "../../utils/devlysConverter";
import {
  buildTransferPostingOptions,
  createTransferOrderId,
  formatTransferDate,
  getCompletedTenureYears,
  getTransferRank,
  groupTransferOrders,
  normalizeTransferDateInput,
  TRANSFER_RANKS,
  TRANSFER_REMARKS
} from "./transferUtils";
import "./transfer.css";

const ORDER_COLUMNS = [
  "क्र.सं.",
  "पद",
  "बेल्ट नं.",
  "नाम",
  "वर्तमान पदस्थापन",
  "नवीन पदस्थापन",
  "आदेश नं./दिनांक"
];

const TAB_ITEMS = [
  { id: "CREATE", label: "नया स्थानांतरण आदेश" },
  { id: "TENURE", label: "कार्यकाल / Overstay जाँच" },
  { id: "ISSUED", label: "जारी आदेश / प्रिंट / Excel" }
];

function getEmployeeKey(employee, index) {
  return String(employee?._uid || `${employee?.["BELT NO"] || "employee"}-${index}`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function getTransferRows(order, displayText) {
  return order.rows.map((record, index) => [
    index + 1,
    displayText(record.CADER || ""),
    displayText(record["BELT NO"] || ""),
    displayText(record.NAME || ""),
    displayText(record.OLD_POSTING || ""),
    displayText(record.POSTING_PLACE || ""),
    `${order.orderNo} / ${order.orderDate}`
  ]);
}

function printTransferOrder(order, displayText) {
  if (!order?.rows?.length) {
    alert("प्रिंट के लिए जारी स्थानांतरण आदेश उपलब्ध नहीं है।");
    return;
  }

  const rows = getTransferRows(order, displayText);
  const printValue = (value) => {
    const text = String(value ?? "");
    const hindiText = /[\u0900-\u097F]/.test(text);
    const printableText = hindiText ? unicodeToDevlys(text) : text;
    return `<span class="${hindiText ? "hindi" : "english"}">${escapeHtml(printableText)}</span>`;
  };
  const headers = ORDER_COLUMNS.map((column) => `<th class="hindi">${escapeHtml(unicodeToDevlys(column))}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((value) => `<td>${printValue(value)}</td>`).join("")}</tr>`).join("");
  const orderNo = escapeHtml(order.orderNo);
  const orderDate = escapeHtml(order.orderDate);
  const html = `<!doctype html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <title>स्थानांतरण आदेश ${orderNo}</title>
        <style>
          @page { size: A4 landscape; margin: 14mm; }
          body { color: #000; font-family: "Times New Roman", serif; font-size: 12pt; }
          h1, h2, .hindi { font-family: "DevLys 010", "Kruti Dev 010", "Times New Roman", serif; }
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
        <h1 class="hindi">${escapeHtml(unicodeToDevlys("कार्यालय पुलिस अधीक्षक"))}</h1>
        <h2 class="hindi">${escapeHtml(unicodeToDevlys("स्थानांतरण आदेश"))}</h2>
        <div class="order-meta">
          <span><b class="hindi">${escapeHtml(unicodeToDevlys("आदेश क्रमांक"))}:</b> ${orderNo}</span>
          <span><b class="hindi">${escapeHtml(unicodeToDevlys("दिनांक"))}:</b> ${orderDate}</span>
        </div>
        <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
        <div class="signatures">
          <span class="hindi">${escapeHtml(unicodeToDevlys("आदेशानुसार"))}</span>
          <span class="hindi">${escapeHtml(unicodeToDevlys("पुलिस अधीक्षक"))}</span>
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

function exportTransferOrder(order, displayText) {
  if (!order?.rows?.length) {
    alert("Excel निर्यात के लिए जारी स्थानांतरण आदेश उपलब्ध नहीं है।");
    return;
  }

  const reportRows = getTransferRows(order, displayText);
  const rawRows = [
    ["कार्यालय पुलिस अधीक्षक"],
    ["स्थानांतरण आदेश"],
    ["आदेश क्रमांक", order.orderNo, "दिनांक", order.orderDate],
    ORDER_COLUMNS,
    ...reportRows
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(
    rawRows.map((row) => row.map((value) => (
      typeof value === "string" ? unicodeToDevlys(value) : value
    )))
  );
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ORDER_COLUMNS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: ORDER_COLUMNS.length - 1 } }
  ];
  worksheet["!cols"] = [
    { wch: 9 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 34 },
    { wch: 34 },
    { wch: 24 }
  ];
  worksheet["!autofilter"] = {
    ref: `A4:G${Math.max(4, rawRows.length)}`
  };

  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < ORDER_COLUMNS.length; columnIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (!worksheet[cellAddress]) continue;
      const originalValue = rawRows[rowIndex][columnIndex] ?? "";
      const containsHindi = /[\u0900-\u097F]/.test(String(originalValue));
      const isHeading = rowIndex <= 1 || rowIndex === 3;
      worksheet[cellAddress].s = {
        font: {
          name: containsHindi ? "DevLys 010" : "Times New Roman",
          sz: rowIndex <= 1 ? 15 : 11,
          bold: isHeading
        },
        alignment: {
          horizontal: rowIndex <= 1 ? "center" : "left",
          vertical: "center",
          wrapText: true
        },
        ...(rowIndex === 3 ? {
          fill: { patternType: "solid", fgColor: { rgb: "DCE6F1" } },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        } : {})
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transfer Order");
  const safeOrderNo = String(order.orderNo || "Order").replace(/[<>:"/\\|?*]+/g, "_");
  XLSX.writeFile(
    workbook,
    `Transfer_Order_${safeOrderNo}_${String(order.orderDate || "").replace(/-/g, "")}.xlsx`
  );
}

export default function TransferModule({
  records = [],
  setRecords,
  allSheets = {},
  setAllSheets,
  setAttRecords,
  setDepRecords,
  devToHindi
}) {
  const [activeTab, setActiveTab] = useState("CREATE");
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
  const [otherActionKey, setOtherActionKey] = useState("");
  const [otherAction, setOtherAction] = useState("ATTACHMENT");
  const [otherOrderNo, setOtherOrderNo] = useState("");
  const [otherPlace, setOtherPlace] = useState("");

  const displayText = useCallback((value) => (
    typeof devToHindi === "function" ? devToHindi(value ?? "") : String(value ?? "")
  ), [devToHindi]);
  const postingOptions = useMemo(
    () => buildTransferPostingOptions(OFFICE_CO_PS_LIST, PS_CHOWKI_MAP),
    []
  );
  const recordsWithKeys = useMemo(
    () => records.map((employee, index) => ({
      employee,
      index,
      key: getEmployeeKey(employee, index),
      rank: getTransferRank(employee, displayText)
    })),
    [records, displayText]
  );
  const stationOptions = useMemo(() => {
    const seen = new Set();
    return recordsWithKeys
      .map(({ employee }) => displayText(employee.POSTING || "").trim())
      .filter((station) => {
        const key = station.toLocaleLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right, "hi"));
  }, [recordsWithKeys, displayText]);
  const visibleEmployees = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    return recordsWithKeys.filter(({ employee, rank }) => {
      if (rankFilter !== "ALL" && rank !== rankFilter) return false;
      if (
        stationFilter !== "ALL" &&
        displayText(employee.POSTING || "").trim().toLocaleLowerCase() !== stationFilter.toLocaleLowerCase()
      ) {
        return false;
      }
      if (!query) return true;
      const searchableText = [
        employee["BELT NO"],
        employee.NAME,
        employee.POSTING,
        employee.CADER
      ].map(displayText).join(" ").toLocaleLowerCase();
      return searchableText.includes(query);
    });
  }, [recordsWithKeys, rankFilter, stationFilter, searchText, displayText]);
  const selectedEmployees = recordsWithKeys.filter(({ key }) => selectedIds.has(key));
  const historyRows = Array.isArray(allSheets["Posting_History"])
    ? allSheets["Posting_History"]
    : [];
  const issuedOrders = useMemo(() => groupTransferOrders(historyRows), [historyRows]);
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
        displayText(employee.POSTING || "").trim().toLocaleLowerCase() === tenureStationFilter.toLocaleLowerCase())
    ))
    .sort((left, right) => {
      const rankDifference = TRANSFER_RANKS.indexOf(left.rank) - TRANSFER_RANKS.indexOf(right.rank);
      return rankDifference || right.years - left.years;
    }), [recordsWithKeys, tenureYears, tenureRankFilter, tenureStationFilter, displayText]);

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
      alert("आदेश जारी करने से पहले कम से कम एक कर्मचारी चुनें।");
      return;
    }
    if (!orderNo.trim()) {
      alert("आदेश क्रमांक भरें।");
      return;
    }
    const normalizedDate = normalizeTransferDateInput(orderDate);
    if (!normalizedDate) {
      alert("आदेश दिनांक DD-MM-YYYY में सही रूप से भरें।");
      return;
    }
    const incompleteEmployee = selectedEmployees.find(({ key }) => !assignments[key]?.destination);
    if (incompleteEmployee) {
      alert(`कृपया ${displayText(incompleteEmployee.employee.NAME)} के लिए नया पदस्थापन स्थान चुनें।`);
      return;
    }

    const cleanOrderNo = orderNo.trim();
    const orderId = createTransferOrderId();
    const issuedAt = new Date().toISOString();
    const orderNoDate = `${cleanOrderNo} / ${normalizedDate}`;
    const updatedRecords = recordsWithKeys.map(({ employee, key }) => {
      if (!selectedIds.has(key)) return employee;
      return {
        ...employee,
        POSTING: assignments[key].destination,
        "POSTING DOB NO": orderNoDate
      };
    });
    const historyEntries = selectedEmployees.map(({ employee, key }) => ({
      ORDER_ID: orderId,
      ACTION: "TRANSFER",
      "BELT NO": employee["BELT NO"] || "",
      NAME: employee.NAME || "",
      CADER: employee.CADER || "",
      OLD_POSTING: employee.POSTING || "",
      POSTING_PLACE: assignments[key].destination,
      ORDER_NO: cleanOrderNo,
      ORDER_DATE: normalizedDate,
      ORDER_NO_DATE: orderNoDate,
      REMARK: assignments[key].remark,
      ISSUED_AT: issuedAt
    }));

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

  const applyOtherAction = (event) => {
    event.preventDefault();
    const selected = recordsWithKeys.find(({ key }) => key === otherActionKey);
    if (!selected) {
      alert("अन्य कार्यवाही के लिए कर्मचारी चुनें।");
      return;
    }
    if (!otherOrderNo.trim()) {
      alert("आदेश क्रमांक / दिनांक भरें।");
      return;
    }
    if (["ATTACHMENT", "DEPUTATION"].includes(otherAction) && !otherPlace.trim()) {
      alert("नया थाना / कार्यालय भरें।");
      return;
    }

    const employee = selected.employee;
    let updatedRecords;
    if (otherAction === "ATTACHMENT") {
      const updatedEmployee = {
        ...employee,
        "WITHOUR DOB": `${otherPlace.trim()} (${otherOrderNo.trim()})`
      };
      updatedRecords = recordsWithKeys.map((row) => row.key === selected.key ? updatedEmployee : row.employee);
      setAttRecords((previous) => [...previous, updatedEmployee]);
    } else if (otherAction === "DEPUTATION") {
      const deputedEmployee = { ...employee, POSTING: otherPlace.trim() };
      updatedRecords = recordsWithKeys.filter((row) => row.key !== selected.key).map((row) => row.employee);
      setDepRecords((previous) => [...previous, deputedEmployee]);
    } else {
      updatedRecords = recordsWithKeys.filter((row) => row.key !== selected.key).map((row) => row.employee);
    }

    setRecords(updatedRecords);
    setAllSheets((previous) => ({
      ...previous,
      Master_All_Data: updatedRecords
    }));
    setOtherActionKey("");
    setOtherOrderNo("");
    setOtherPlace("");
    alert(`कार्यवाही (${otherAction}) सफलतापूर्वक पूरी हुई।`);
  };

  const renderRankOptions = () => TRANSFER_RANKS.map((rank) => (
    <option key={rank} value={rank}>{rank === "ALL" ? "सभी पद" : rank}</option>
  ));

  return (
    <section className="transfer-module">
      <header className="transfer-header">
        <div>
          <p className="transfer-eyebrow">MODULE 02</p>
          <h2>⇄ स्थानांतरण / आदेश प्रबंधन</h2>
          <p>कर्मचारी चयन, कार्यकाल समीक्षा और जारी आदेशों का सुरक्षित रिकॉर्ड।</p>
        </div>
        <div className="transfer-header-count">
          <strong>{records.length}</strong>
          <span>कार्यरत रिकॉर्ड</span>
        </div>
      </header>

      <nav className="transfer-tabs" role="tablist" aria-label="स्थानांतरण मॉड्यूल टैब">
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
            {tab.label}
          </button>
        ))}
      </nav>

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
                  <h3>1. आदेश विवरण</h3>
                  <p>आदेश क्रमांक और जारी दिनांक भरें।</p>
                </div>
              </div>
              <div className="transfer-form-grid">
                <label className="transfer-field">
                  <span>आदेश क्रमांक (DOB No.)</span>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(event) => setOrderNo(event.target.value)}
                    placeholder="उदा. 875"
                    required
                  />
                </label>
                <label className="transfer-field">
                  <span>आदेश दिनांक (DD-MM-YYYY)</span>
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
                    pattern="\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4}"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="transfer-card">
              <div className="transfer-section-heading">
                <div>
                  <h3>2. कर्मचारी खोजें और चुनें</h3>
                  <p>पद, वर्तमान थाना/कार्यालय और नाम/बेल्ट से सूची फ़िल्टर करें।</p>
                </div>
                <span className="transfer-selection-badge">{selectedEmployees.length} चयनित</span>
              </div>
              <div className="transfer-filter-grid">
                <label className="transfer-field">
                  <span>पद</span>
                  <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
                    {renderRankOptions()}
                  </select>
                </label>
                <label className="transfer-field">
                  <span>वर्तमान थाना / कार्यालय</span>
                  <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}>
                    <option value="ALL">सभी स्थान</option>
                    {stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}
                  </select>
                </label>
                <label className="transfer-field transfer-search-field">
                  <span>नाम / बेल्ट नं. खोजें</span>
                  <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="नाम, बेल्ट या पदस्थापन"
                  />
                </label>
              </div>

              <div className="transfer-table-wrap">
                <table className="transfer-table">
                  <thead>
                    <tr>
                      <th>चुनें</th>
                      <th>पद</th>
                      <th>बेल्ट नं.</th>
                      <th>नाम</th>
                      <th>वर्तमान थाना / कार्यालय</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEmployees.map(({ employee, key, rank }) => (
                      <tr key={key}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${displayText(employee.NAME)} को चुनें`}
                            checked={selectedIds.has(key)}
                            onChange={(event) => toggleSelected(key, event.target.checked)}
                          />
                        </td>
                        <td>{displayText(employee.CADER || rank)}</td>
                        <td>{displayText(employee["BELT NO"] || "")}</td>
                        <td>{displayText(employee.NAME || "")}</td>
                        <td>{displayText(employee.POSTING || "—")}</td>
                      </tr>
                    ))}
                    {!visibleEmployees.length && (
                      <tr><td className="transfer-empty" colSpan="5">दिए गए फ़िल्टर में कर्मचारी नहीं मिले।</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedEmployees.length > 0 && (
              <section className="transfer-card">
                <div className="transfer-section-heading">
                  <div>
                    <h3>3. नया पदस्थापन और रिमार्क</h3>
                    <p>हर चयनित कर्मचारी के लिए स्थान और आदेश का आधार चुनें।</p>
                  </div>
                </div>
                <div className="transfer-table-wrap">
                  <table className="transfer-table assignment-table">
                    <thead>
                      <tr>
                        <th>कर्मचारी</th>
                        <th>वर्तमान पदस्थापन</th>
                        <th>नया पदस्थापन स्थान</th>
                        <th>रिमार्क</th>
                        <th>हटाएँ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEmployees.map(({ employee, key }) => (
                        <tr key={key}>
                          <td>
                            <strong>{displayText(employee.NAME || "")}</strong>
                            <small>{displayText(employee["BELT NO"] || "")} · {displayText(employee.CADER || "")}</small>
                          </td>
                          <td>{displayText(employee.POSTING || "—")}</td>
                          <td>
                            <select
                              value={assignments[key]?.destination || ""}
                              onChange={(event) => updateAssignment(key, "destination", event.target.value)}
                              required
                            >
                              <option value="">नया स्थान चुनें</option>
                              {postingOptions.map((place) => (
                                <option key={place} value={place}>{displayText(place)}</option>
                              ))}
                            </select>
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
                              हटाएँ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="submit" className="transfer-primary-button">
                  ✅ आदेश जारी करें एवं डेटा अपडेट करें
                </button>
              </section>
            )}
          </form>

          <details className="transfer-legacy-actions">
            <summary>अन्य कार्यवाही (अटैचमेंट / प्रतिनियुक्ति / कार्यमुक्ति / सेवानिवृत्ति)</summary>
            <form onSubmit={applyOtherAction} className="transfer-filter-grid">
              <label className="transfer-field">
                <span>कर्मचारी</span>
                <select value={otherActionKey} onChange={(event) => setOtherActionKey(event.target.value)} required>
                  <option value="">कर्मचारी चुनें</option>
                  {recordsWithKeys.map(({ employee, key }) => (
                    <option key={key} value={key}>
                      {displayText(employee["BELT NO"] || "")} · {displayText(employee.NAME || "")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="transfer-field">
                <span>कार्यवाही</span>
                <select value={otherAction} onChange={(event) => setOtherAction(event.target.value)}>
                  <option value="ATTACHMENT">Attachment</option>
                  <option value="DEPUTATION">Deputation</option>
                  <option value="RELIEVE">Relieve</option>
                  <option value="RETIRE">Retire / Death</option>
                </select>
              </label>
              <label className="transfer-field">
                <span>आदेश नं. / दिनांक</span>
                <input value={otherOrderNo} onChange={(event) => setOtherOrderNo(event.target.value)} required />
              </label>
              {["ATTACHMENT", "DEPUTATION"].includes(otherAction) && (
                <label className="transfer-field">
                  <span>नया थाना / कार्यालय</span>
                  <input value={otherPlace} onChange={(event) => setOtherPlace(event.target.value)} required />
                </label>
              )}
              <button type="submit" className="transfer-secondary-button">कार्यवाही लागू करें</button>
            </form>
          </details>
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
                <h3>एक ही स्थान पर कार्यकाल अवधि</h3>
                <p>POSTING DOB NO में दर्ज दिनांक से आज तक पूर्ण वर्ष गणना की गई है।</p>
              </div>
              <span className="transfer-selection-badge">{tenureEmployees.length} कर्मचारी</span>
            </div>
            <div className="transfer-filter-grid tenure-filter-grid">
              <label className="transfer-field">
                <span>कार्यकाल</span>
                <select value={tenureYears} onChange={(event) => setTenureYears(Number(event.target.value))}>
                  {[2, 3, 4, 5].map((years) => <option key={years} value={years}>{years}+ वर्ष</option>)}
                </select>
              </label>
              <label className="transfer-field">
                <span>पद</span>
                <select value={tenureRankFilter} onChange={(event) => setTenureRankFilter(event.target.value)}>
                  {renderRankOptions()}
                </select>
              </label>
              <label className="transfer-field">
                <span>थाना / कार्यालय</span>
                <select value={tenureStationFilter} onChange={(event) => setTenureStationFilter(event.target.value)}>
                  <option value="ALL">सभी स्थान</option>
                  {stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}
                </select>
              </label>
            </div>
            <div className="transfer-table-wrap">
              <table className="transfer-table">
                <thead>
                  <tr>
                    <th>चुनें</th>
                    <th>पद</th>
                    <th>बेल्ट नं.</th>
                    <th>नाम</th>
                    <th>वर्तमान पदस्थापन</th>
                    <th>पदस्थापन आदेश / दिनांक</th>
                    <th>पूर्ण अवधि</th>
                  </tr>
                </thead>
                <tbody>
                  {tenureEmployees.map(({ employee, key, rank, years }) => (
                    <tr key={key}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${displayText(employee.NAME)} को स्थानांतरण सूची में चुनें`}
                          checked={tenureSelectedIds.has(key)}
                          onChange={(event) => setTenureSelectedIds((previous) => {
                            const next = new Set(previous);
                            if (event.target.checked) next.add(key);
                            else next.delete(key);
                            return next;
                          })}
                        />
                      </td>
                      <td>{displayText(employee.CADER || rank)}</td>
                      <td>{displayText(employee["BELT NO"] || "")}</td>
                      <td>{displayText(employee.NAME || "")}</td>
                      <td>{displayText(employee.POSTING || "")}</td>
                      <td>{displayText(employee["POSTING DOB NO"] || "")}</td>
                      <td><strong>{years} वर्ष</strong></td>
                    </tr>
                  ))}
                  {!tenureEmployees.length && (
                    <tr><td className="transfer-empty" colSpan="7">इस अवधि और फ़िल्टर के लिए रिकॉर्ड नहीं मिला।</td></tr>
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
              चयनित कर्मचारियों को स्थानांतरण सूची में भेजें ({tenureSelectedIds.size})
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
                <h3>जारी स्थानांतरण आदेश</h3>
                <p>आदेश इस जिले की Posting_History में सुरक्षित हैं और यहाँ से दोबारा प्रिंट किए जा सकते हैं।</p>
              </div>
              <span className="transfer-selection-badge">{issuedOrders.length} आदेश</span>
            </div>
            {!issuedOrders.length ? (
              <p className="transfer-empty-message">अभी कोई स्थानांतरण आदेश जारी नहीं हुआ है।</p>
            ) : (
              <>
                <label className="transfer-field transfer-order-picker">
                  <span>आदेश चुनें</span>
                  <select value={currentOrder?.id || ""} onChange={(event) => setSelectedOrderId(event.target.value)}>
                    {issuedOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        आदेश {order.orderNo} · {order.orderDate} · {order.rows.length} कर्मचारी
                      </option>
                    ))}
                  </select>
                </label>
                {currentOrder && (
                  <>
                    <div className="transfer-order-summary">
                      <strong>आदेश क्रमांक: {currentOrder.orderNo}</strong>
                      <span>दिनांक: {currentOrder.orderDate}</span>
                      <span>कर्मचारी: {currentOrder.rows.length}</span>
                    </div>
                    <div className="transfer-table-wrap">
                      <table className="transfer-table">
                        <thead>
                          <tr>{ORDER_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
                        </thead>
                        <tbody>
                          {getTransferRows(currentOrder, displayText).map((row, index) => (
                            <tr key={`${currentOrder.id}-${row[2]}-${index}`}>
                              {row.map((value, cellIndex) => <td key={`${index}-${cellIndex}`}>{value}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="transfer-action-row">
                      <button type="button" className="transfer-primary-button" onClick={() => printTransferOrder(currentOrder, displayText)}>
                        🖨️ आदेश प्रिंट करें
                      </button>
                      <button type="button" className="transfer-secondary-button" onClick={() => exportTransferOrder(currentOrder, displayText)}>
                        📊 Excel निर्यात करें
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
