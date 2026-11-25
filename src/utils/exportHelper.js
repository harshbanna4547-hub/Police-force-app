// src/utils/exportHelper.js
import XLSX from "xlsx-js-style";
import { isDevlysText } from "../core/isDevlysText";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function getTextClass(value) {
  const text = String(value ?? "");
  if (/[\u0900-\u097F]/.test(text)) return "unicode-hindi";
  return isDevlysText(text) ? "devlys" : "english";
}

function formatMixedHtml(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).split(/(\s+)/).map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    return `<span class="${getTextClass(part)}">${escapeHtml(part)}</span>`;
  }).join("");
}

export function exportTableToExcel(title, rows, fileName = "Report") {
  if (!rows || rows.length === 0) return alert("एक्सपोर्ट करने के लिए कोई डेटा उपलब्ध नहीं है!");
  const cols = Object.keys(rows[0] || {});
  const aoa = [[title], cols, ...rows.map((r) => cols.map((c) => r[c] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(cols.length - 1, 0) } }];
  ws["!cols"] = cols.map((c) => ({ wch: Math.min(Math.max(String(c).length + 4, 12), 36) }));

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const rawVal = aoa[r]?.[c] ?? "";
      const isDev = String(rawVal).split(/\s+/).some((p) => isDevlysText(p));
      const isUni = /[\u0900-\u097F]/.test(String(rawVal));
      ws[addr].s = {
        font: {
          name: isDev ? "DevLys 010" : isUni ? "Noto Sans Devanagari" : "Times New Roman",
          sz: r === 0 ? 15 : isDev ? 14 : 11,
          bold: r <= 1
        }
      };
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report_Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

function buildPrintableHtml(title, rows) {
  const cols = Object.keys(rows[0] || {});
  const fontUrl = typeof window !== "undefined" ? `${window.location.origin}/fonts/DevLys010.ttf` : "/fonts/DevLys010.ttf";
  const thHtml = cols.map((c) => `<th>${formatMixedHtml(c)}</th>`).join("");
  const trHtml = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${formatMixedHtml(r[c])}</td>`).join("")}</tr>`)
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @font-face {
            font-family: 'DevLys 010';
            src: url('${fontUrl}') format('truetype'), local('DevLys 010');
          }
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; }
          h2 { text-align: center; margin-bottom: 4px; font-size: 16pt; }
          p { text-align: center; margin-top: 0; font-size: 10pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .devlys { font-family: 'DevLys 010', sans-serif; font-size: 17px; line-height: 1.45; }
          .unicode-hindi { font-family: 'Noto Sans Devanagari', sans-serif; }
          .english { font-family: 'Times New Roman', Times, serif; }
        </style>
      </head>
      <body>
        <h2>कार्यालय पुलिस अधीक्षक — ${formatMixedHtml(title)}</h2>
        <p>कुल रिकॉर्ड: ${rows.length} | दिनांक: ${new Date().toLocaleDateString("en-IN")}</p>
        <table>
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${trHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

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
    printWin.print();
  }, 400);
}
