// src/utils/exportHelper.js
import * as XLSX from "xlsx";

// 1. Excel (.xlsx) डाउनलोड
export function exportTableToExcel(title, rows, fileName = "Report") {
  if (!rows || rows.length === 0) return alert("एक्सपोर्ट करने के लिए कोई डेटा उपलब्ध नहीं है!");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Report_Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// HTML टेबल जनरेट करना (Word, PDF और Print के लिए)
function buildPrintableHtml(title, rows) {
  const cols = Object.keys(rows);
  const thHtml = cols.map((c) => `<th>${c}</th>`).join("");
  const trHtml = rows
    .map(
      (r) =>
        `<tr>${cols
          .map((c) => `<td>${r[c] !== undefined && r[c] !== null ? r[c] : ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; background: #fff; }
          h2 { text-align: center; margin-bottom: 4px; font-size: 16pt; }
          p { text-align: center; margin-top: 0; font-size: 10pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>कार्यालय पुलिस अधीक्षक — ${title}</h2>
        <p>कुल रिकॉर्ड: ${rows.length} | दिनांक: ${new Date().toLocaleDateString("en-IN")}</p>
        <table>
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${trHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

// 2. Word (.doc) डाउनलोड
export function exportTableToWord(title, rows, fileName = "Report") {
  if (!rows || rows.length === 0) return alert("एक्सपोर्ट करने के लिए कोई डेटा उपलब्ध नहीं है!");
  const html = buildPrintableHtml(title, rows);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// 3. PDF (Save as PDF) और 4. Direct Print
export function exportTableToPdfOrPrint(title, rows) {
  if (!rows || rows.length === 0) return alert("प्रिंट करने के लिए कोई डेटा उपलब्ध नहीं है!");
  const html = buildPrintableHtml(title, rows);
  const printWin = window.open("", "_blank", "width=1050,height=750");
  if (!printWin) return alert("कृपया ब्राउज़र में Pop-up की अनुमति दें!");
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print(); // यहाँ से सीधे Print या "Save as PDF" चुना जा सकता है
  }, 400);
}
