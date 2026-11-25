import { useEffect, useRef, useState } from "react";
import XLSX from "xlsx-js-style";
import { isDevlysText } from "./isDevlysText";
import "./ExportBar.css";

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
  const str = String(value);
  return str.split(/(\s+)/).map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    return `<span class="${getTextClass(part)}">${escapeHtml(part)}</span>`;
  }).join("");
}

function getCellFontName(value) {
  const text = String(value ?? "").trim();
  if (!text) return "Times New Roman";
  if (/[\u0900-\u097F]/.test(text)) return "Noto Sans Devanagari";
  if (text.split(/\s+/).some((part) => isDevlysText(part))) return "DevLys 010";
  return "Times New Roman";
}

export default function ExportBar({
  title = "Report",
  rows = [],
  fileName = "Police_Report",
  actions = ["excel", "word", "pdf", "print"],
  language = "hi"
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleExcel = () => {
    if (!rows.length) return alert(language === "en" ? "No data available to export." : "डाउनलोड के लिए डेटा उपलब्ध नहीं है!");
    const columns = Object.keys(rows[0] || {});
    const headerTitle = language === "en" ? `Office of SP — ${title}` : `कार्यालय पुलिस अधीक्षक — ${title}`;
    const rawRows = [
      [headerTitle],
      columns,
      ...rows.map((row) => columns.map((column) => row[column] ?? ""))
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rawRows);
    worksheet["!merges"] = [{
      s: { r: 0, c: 0 },
      e: { r: 0, c: Math.max(columns.length - 1, 0) }
    }];
    worksheet["!cols"] = columns.map((column) => ({
      wch: Math.min(Math.max(String(column).length + 4, 12), 36)
    }));

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (!worksheet[address]) continue;
        const originalValue = rawRows[rowIndex]?.[columnIndex] ?? "";
        const isTitle = rowIndex === 0;
        const isHeader = rowIndex === 1;
        const fontName = getCellFontName(originalValue);
        worksheet[address].s = {
          font: {
            name: fontName,
            sz: isTitle ? 15 : fontName === "DevLys 010" ? 14 : 11,
            bold: isTitle || isHeader
          },
          alignment: {
            horizontal: isTitle ? "center" : fontName === "Times New Roman" && !isHeader ? "center" : "left",
            vertical: "center",
            wrapText: true
          },
          ...(isHeader ? {
            fill: { patternType: "solid", fgColor: { rgb: "DCE6F1" } },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          } : {
            border: {
              top: { style: "thin", color: { rgb: "CBD5E1" } },
              bottom: { style: "thin", color: { rgb: "CBD5E1" } },
              left: { style: "thin", color: { rgb: "CBD5E1" } },
              right: { style: "thin", color: { rgb: "CBD5E1" } }
            }
          })
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}_DevLys010.xlsx`);
  };

  const getDevlysHtml = () => {
    const columns = Object.keys(rows[0] || {});
    const fontUrl = typeof window !== "undefined" ? `${window.location.origin}/fonts/DevLys010.ttf` : "/fonts/DevLys010.ttf";
    const headerCells = columns
      .map((column) => `<th>${formatMixedHtml(column)}</th>`)
      .join("");
    const bodyRows = rows.map((row) => (
      `<tr>${columns.map((column) => `<td>${formatMixedHtml(row[column])}</td>`).join("")}</tr>`
    )).join("");

    return `<!doctype html>
      <html lang="hi">
        <head>
          <meta charset="utf-8" />
          <style>
            @font-face {
              font-family: 'DevLys 010';
              src: url('${fontUrl}') format('truetype'), local('DevLys 010');
              font-style: normal;
              font-weight: normal;
            }
            @page { size: A4 landscape; margin: 10mm; }
            body { color: #000; font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
            h2 { text-align: center; font-size: 16pt; margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11pt; }
            th { background: #e2e8f0; font-weight: bold; }
            tr { page-break-inside: avoid; }
            .devlys { font-family: 'DevLys 010', sans-serif; font-size: 17px; line-height: 1.45; }
            .unicode-hindi { font-family: 'Noto Sans Devanagari', sans-serif; }
            .english { font-family: 'Times New Roman', Times, serif; }
          </style>
        </head>
        <body>
          <h2>${formatMixedHtml(title)}</h2>
          <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
        </body>
      </html>`;
  };

  const handleWord = () => {
    if (!rows.length) return alert(language === "en" ? "No data available to export." : "डाउनलोड के लिए डेटा उपलब्ध नहीं है!");
    const blob = new Blob(["\ufeff", getDevlysHtml()], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}_DevLys010.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePdf = async () => {
    if (!rows.length) return alert(language === "en" ? "No data available to export." : "डाउनलोड के लिए डेटा उपलब्ध नहीं है!");
    let host;
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const documentHtml = new DOMParser().parseFromString(getDevlysHtml(), "text/html");
      host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;background:#fff;color:#000;font-family:'Times New Roman',serif;font-size:12pt;";
      documentHtml.head.querySelectorAll("style").forEach((style) => host.append(style.cloneNode(true)));
      documentHtml.body.childNodes.forEach((node) => host.append(node.cloneNode(true)));
      document.body.append(host);
      await html2pdf().set({
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(host).save();
    } catch (error) {
      console.error("PDF export failed:", error);
      alert(`PDF डाउनलोड नहीं हो सका: ${error.message}`);
    } finally {
      host?.remove();
    }
  };

  const handlePrint = () => {
    if (!rows.length) return alert(language === "en" ? "No data available to print." : "प्रिंट के लिए डेटा उपलब्ध नहीं है!");
    const printWindow = window.open("", "_blank", "width=1100,height=750");
    if (!printWindow) return alert(language === "en" ? "Allow pop-ups in your browser to print." : "ब्राउज़र में Pop-up Allow करें!");
    printWindow.document.open();
    printWindow.document.write(getDevlysHtml());
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  const exportOptions = [
    { key: "excel", label: "📊 Excel (.xlsx - DevLys 010)", onClick: handleExcel },
    { key: "word", label: "📝 Word (.doc)", onClick: handleWord },
    { key: "pdf", label: "📄 PDF (.pdf)", onClick: handlePdf }
  ].filter((option) => actions.includes(option.key));

  return (
    <div className="export-bar-group">
      {exportOptions.length > 0 && (
        <div ref={menuRef} className="export-bar-menu-wrap">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="export-bar-btn"
          >
            📥 {language === "en" ? "Export" : "Export"} ▾
          </button>
          {menuOpen && (
            <div role="menu" className="export-bar-dropdown">
              {exportOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void option.onClick();
                  }}
                  className="export-bar-dropdown-item"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {actions.includes("print") && (
        <button type="button" onClick={handlePrint} className="export-bar-btn">🖨️ Print</button>
      )}
    </div>
  );
}
