import { useCallback, useMemo, useState } from "react";
import XLSX from "xlsx-js-style";
import { OFFICE_CO_PS_LIST, PS_CHOWKI_MAP } from "../../data/officeUnits";
import { unicodeToDevlys } from "../../utils/devlysConverter";
import HindiText from "../../core/HindiText";
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

const ENGLISH_CELL_STYLE = { fontFamily: "'Times New Roman', Times, serif" };

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
  { id: "ISSUED", label: "जारी आदेश / प्रिंट / Excel" },
  { id: "DUTY", label: "4. Attachment & Deputation" }
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

function getTransferRows(order, displayText) {
  return order.rows.map((record, index) => [
    index + 1,
    getTransferDisplayCader(record, displayText),
    getTransferDisplayBeltNumber(record, displayText),
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
  const body = rows.map((row) => `<tr>${row.map((value, index) => (
    index === 1 || index === 2
      ? `<td class="english-cell">${escapeHtml(value)}</td>`
      : `<td>${printValue(value)}</td>`
  )).join("")}</tr>`).join("");
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
          td.english-cell { font-family: "Times New Roman", Times, serif !important; }
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

function printRelievingJoiningSlip(order, employee, displayText) {
  const printableValue = (value) => {
    const text = displayText(value);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    return `<span class="${hasHindi ? "hindi" : "english"}">${escapeHtml(hasHindi ? unicodeToDevlys(text) : text)}</span>`;
  };
  const title = escapeHtml(unicodeToDevlys("रवानगी एवं आगमन प्रमाण-पत्र"));
  const html = `<!doctype html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <title>Relieving and Joining Certificate</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { color: #000; font: 12pt "Times New Roman", serif; line-height: 1.7; }
          h1, h2, .hindi { font-family: "DevLys 010", "Kruti Dev 010", "Times New Roman", serif; }
          h1, h2 { text-align: center; margin: 0 0 8px; }
          h1 { font-size: 19pt; }
          h2 { font-size: 14pt; }
          .english { font-family: "Times New Roman", serif; }
          .meta { margin: 20px 0; border: 1px solid #000; padding: 10px 14px; }
          .certificate { margin: 24px 0; text-align: justify; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 70px; text-align: center; }
          .signature-line { border-top: 1px solid #000; padding-top: 7px; }
        </style>
      </head>
      <body>
        <h1 class="hindi">${title}</h1>
        <h2 class="english">Relieving &amp; Joining Certificate</h2>
        <div class="meta">
          <div><b class="hindi">${escapeHtml(unicodeToDevlys("आदेश क्रमांक"))}:</b> ${escapeHtml(order.orderNo)}</div>
          <div><b class="hindi">${escapeHtml(unicodeToDevlys("आदेश दिनांक"))}:</b> ${escapeHtml(order.orderDate)}</div>
        </div>
        <p class="certificate">
          <b class="hindi">${escapeHtml(unicodeToDevlys("रवानगी प्रमाण-पत्र"))}:</b>
          <span class="hindi">${escapeHtml(unicodeToDevlys("प्रमाणित किया जाता है कि"))}</span>
          ${printableValue(employee.NAME || "")},
          <span class="hindi">${escapeHtml(unicodeToDevlys("पद"))}:</span> ${printableValue(employee.CADER || "")},
          <span class="hindi">${escapeHtml(unicodeToDevlys("बेल्ट नं."))}:</span> ${printableValue(employee["BELT NO"] || "")},
          को ${printableValue(employee.OLD_POSTING || "")}
          <span class="hindi">${escapeHtml(unicodeToDevlys("से दिनांक"))}</span> __________________
          <span class="hindi">${escapeHtml(unicodeToDevlys("को कार्यमुक्त किया गया।"))}</span>
        </p>
        <p class="certificate">
          <b class="hindi">${escapeHtml(unicodeToDevlys("आगमन / कार्यग्रहण प्रमाण-पत्र"))}:</b>
          ${printableValue(employee.NAME || "")}
          <span class="hindi">${escapeHtml(unicodeToDevlys("ने"))}</span>
          ${printableValue(employee.POSTING_PLACE || "")}
          <span class="hindi">${escapeHtml(unicodeToDevlys("में दिनांक"))}</span> __________________
          <span class="hindi">${escapeHtml(unicodeToDevlys("को कार्यभार ग्रहण कर लिया है।"))}</span>
        </p>
        <div class="signatures">
          <div class="signature-line"><span class="hindi">${escapeHtml(unicodeToDevlys("रवानगी अधिकारी / कार्यालयाध्यक्ष"))}</span></div>
          <div class="signature-line"><span class="hindi">${escapeHtml(unicodeToDevlys("आगमन अधिकारी / कार्यालयाध्यक्ष"))}</span></div>
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
  attRecords = [],
  setAttRecords,
  depRecords = [],
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
  const [dutyEmployeeKey, setDutyEmployeeKey] = useState("");
  const [dutyType, setDutyType] = useState("ATTACHMENT");
  const [dutyPlace, setDutyPlace] = useState("");
  const [dutyCustomPlace, setDutyCustomPlace] = useState("");
  const [dutyOrderNo, setDutyOrderNo] = useState("");
  const [dutyOrderDate, setDutyOrderDate] = useState(() => formatTransferDate(new Date()));
  const [dutyRemark, setDutyRemark] = useState("");

  const displayText = useCallback((value) => {
    const rawValue = String(value ?? "");
    if (/[\u0900-\u097F]/.test(rawValue)) return rawValue;
    return typeof devToHindi === "function" ? devToHindi(rawValue) : rawValue;
  }, [devToHindi]);
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
    () => records.map((employee, index) => ({
      employee,
      index,
      key: getTransferEmployeeKey(employee, index),
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
    const orderNo = dutyOrderNo.trim();
    const orderNoDate = `${orderNo} / ${normalizedDate}`;
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
      orderNo,
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
                    pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
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
                        <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayCader(employee, displayText) || rank}</td>
                        <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayBeltNumber(employee, displayText)}</td>
                        <td><HindiText text={employee.NAME || ""} /></td>
                        <td><HindiText text={employee.POSTING || "—"} /></td>
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
                            <strong><HindiText text={employee.NAME || ""} /></strong>
                            <small style={ENGLISH_CELL_STYLE}>
                              {getTransferDisplayBeltNumber(employee, displayText)} · {getTransferDisplayCader(employee, displayText)}
                            </small>
                          </td>
                          <td><HindiText text={employee.POSTING || "—"} /></td>
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
                            {isHomePoliceStation(
                              assignments[key]?.destination,
                              employee,
                              displayText,
                              PS_CHOWKI_MAP
                            ) && (
                              <p className="transfer-home-ps-warning" role="alert">
                                ⚠️ सावधान: यह कर्मचारी का गृह थाना (Home PS) है!
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
                      <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayCader(employee, displayText) || rank}</td>
                      <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayBeltNumber(employee, displayText)}</td>
                      <td><HindiText text={employee.NAME || ""} /></td>
                      <td><HindiText text={employee.POSTING || ""} /></td>
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
                          {currentOrder.rows.map((employee, index) => (
                            <tr key={`${currentOrder.id}-${employee["BELT NO"] || employee.NAME}-${index}`}>
                              <td>{index + 1}</td>
                              <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayCader(employee, displayText)}</td>
                              <td style={ENGLISH_CELL_STYLE}>{getTransferDisplayBeltNumber(employee, displayText)}</td>
                              <td><HindiText text={employee.NAME || ""} /></td>
                              <td><HindiText text={employee.OLD_POSTING || "—"} /></td>
                              <td>{displayText(employee.POSTING_PLACE || "")}</td>
                              <td>{`${currentOrder.orderNo} / ${currentOrder.orderDate}`}</td>
                              <td>
                                <button
                                  type="button"
                                  className="transfer-slip-button"
                                  onClick={() => printRelievingJoiningSlip(
                                    currentOrder,
                                    currentOrder.rows[index],
                                    displayText
                                  )}
                                >
                                  📄 रिलीविंग पर्ची
                                </button>
                              </td>
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
                <h3>संलग्नीकरण एवं प्रतिनियुक्ति</h3>
                <p>कार्यालय, थाना, चुनाव/मेला ड्यूटी में अस्थायी तैनाती दर्ज करें।</p>
              </div>
            </div>
            <div className="transfer-duty-counts">
              <div><span>On Attachment</span><strong>{attRecords.length}</strong></div>
              <div><span>On Deputation</span><strong>{depRecords.length}</strong></div>
            </div>
            <form onSubmit={applyDutyAction}>
              <div className="transfer-filter-grid">
                <label className="transfer-field">
                  <span>कर्मचारी</span>
                  <select
                    value={dutyEmployeeKey}
                    onChange={(event) => setDutyEmployeeKey(event.target.value)}
                    required
                  >
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
                  <select value={dutyType} onChange={(event) => setDutyType(event.target.value)}>
                    <option value="ATTACHMENT">संलग्नीकरण (Attachment)</option>
                    <option value="DEPUTATION">प्रतिनियुक्ति (Deputation)</option>
                    <option value="RELIEVE">कार्य-मुक्त (Relieve)</option>
                    <option value="RETIRE">सेवानिवृत्ति / मृत्यु</option>
                  </select>
                </label>
                {["ATTACHMENT", "DEPUTATION"].includes(dutyType) && (
                  <>
                    <label className="transfer-field">
                      <span>नया कार्यालय / थाना / ड्यूटी</span>
                      <select
                        value={dutyPlace}
                        onChange={(event) => setDutyPlace(event.target.value)}
                        required
                      >
                        <option value="">स्थान चुनें</option>
                        {temporaryDutyOptions.map((place) => (
                          <option key={place} value={place}>{displayText(place)}</option>
                        ))}
                      </select>
                    </label>
                    {dutyPlace === "अन्य स्थान" && (
                      <label className="transfer-field">
                        <span>अन्य ड्यूटी / स्थान का नाम</span>
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
                  <span>आदेश क्रमांक</span>
                  <input
                    value={dutyOrderNo}
                    onChange={(event) => setDutyOrderNo(event.target.value)}
                    placeholder="उदा. 875"
                    required
                  />
                </label>
                <label className="transfer-field">
                  <span>आदेश दिनांक (DD-MM-YYYY)</span>
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
                    <span>ड्यूटी / कार्यवाही का विवरण</span>
                    <input
                      value={dutyRemark}
                      onChange={(event) => setDutyRemark(event.target.value)}
                      placeholder="वैकल्पिक विवरण"
                    />
                  </label>
                )}
              </div>
              {dutyEmployee && (
                <p className="transfer-duty-employee">
                  चयनित कर्मचारी: <strong>{displayText(dutyEmployee.NAME || "")}</strong>
                  {" · "}{displayText(dutyEmployee["BELT NO"] || "")}
                  {" · वर्तमान पदस्थापन: "}{displayText(dutyEmployee.POSTING || "—")}
                </p>
              )}
              <button type="submit" className="transfer-primary-button">
                {dutyType === "ATTACHMENT" ? "✅ संलग्नीकरण सुरक्षित करें" :
                  dutyType === "DEPUTATION" ? "✅ प्रतिनियुक्ति सुरक्षित करें" : "✅ कार्यवाही लागू करें"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
