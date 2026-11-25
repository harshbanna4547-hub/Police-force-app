// src/core/ExportBar.jsx
import * as XLSX from "xlsx";
import { unicodeToDevlys } from "../utils/devlysConverter";

export default function ExportBar({
  title = "Report",
  rows = [],
  fileName = "Police_Report",
  actions = ["excel", "word", "pdf", "print"]
}) {
  // Excel (.xlsx) में DevLys 010 टेक्स्ट के साथ एक्सपोर्ट
  const handleExcel = () => {
    if (!rows.length) return alert("डाउनलोड के लिए डेटा उपलब्ध नहीं है!");
    const devRows = rows.map((r) => {
      const obj = {};
      Object.entries(r).forEach(([k, v]) => {
        obj[unicodeToDevlys(k)] = typeof v === "string" ? unicodeToDevlys(v) : v;
      });
      return obj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(devRows);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}_DevLys010.xlsx`);
  };

  // Word, PDF और Print के लिए DevLys 010 (Font Size 16pt) HTML
  const getDevlysHtml = () => {
    const firstRow = rows.at(0) || {};
    const cols = Object.keys(firstRow);
    const devTitle = unicodeToDevlys(`कार्यालय पुलिस अधीक्षक — ${title}`);

    const th = cols
      .map((c) => `<th>${unicodeToDevlys(c)}</th>`)
      .join("");

    const tr = rows
      .map(
        (r) =>
          `<tr>${cols
            .map((c) => {
              const val = r[c] ?? "";
              return `<td>${typeof val === "string" ? unicodeToDevlys(val) : val}</td>`;
            })
            .join("")}</tr>`
      )
      .join("");

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body {
              font-family: 'DevLys 010', 'Kruti Dev 010', 'Times New Roman', Times, serif;
              font-size: 16pt;
              color: #000000;
            }
            h2 {
              text-align: center;
              font-family: 'DevLys 010', 'Kruti Dev 010', 'Times New Roman', Times, serif;
              font-size: 20pt;
              margin-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-family: 'DevLys 010', 'Kruti Dev 010', 'Times New Roman', Times, serif;
              font-size: 16pt;
            }
            th, td {
              border: 1px solid #000000;
              padding: 6px 8px;
              font-family: 'DevLys 010', 'Kruti Dev 010', 'Times New Roman', Times, serif;
              font-size: 16pt;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h2>${devTitle}</h2>
          <table>
            <thead><tr>${th}</tr></thead>
            <tbody>${tr}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleWord = () => {
    if (!rows.length) return alert("डाउनलोड के लिए डेटा उपलब्ध नहीं है!");
    const blob = new Blob(["\ufeff", getDevlysHtml()], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}_DevLys010.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintOrPdf = () => {
    if (!rows.length) return alert("प्रिंट के लिए डेटा उपलब्ध नहीं है!");
    const w = window.open("", "_blank", "width=1100,height=750");
    if (!w) return alert("ब्राउज़र में Pop-up Allow करें!");
    w.document.write(getDevlysHtml());
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const btn = (bg) => ({
    backgroundColor: bg,
    color: "#fff",
    border: "none",
    padding: "7px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "0.82rem",
    cursor: "pointer"
  });

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {actions.includes("excel") && <button type="button" onClick={handleExcel} style={btn("#16A34A")}>📊 Excel (DevLys)</button>}
      {actions.includes("word") && <button type="button" onClick={handleWord} style={btn("#2563EB")}>📝 Word (DevLys 16)</button>}
      {actions.includes("pdf") && <button type="button" onClick={handlePrintOrPdf} style={btn("#DC2626")}>📕 PDF (DevLys 16)</button>}
      {actions.includes("print") && <button type="button" onClick={handlePrintOrPdf} style={btn("#334155")}>🖨️ Print</button>}
    </div>
  );
}
