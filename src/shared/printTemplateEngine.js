const ENGLISH_COLUMN = /\b(BELT|CADER|RANK|DATE|YEAR|NO\.?|ORDER|SERVICE|DAYS|SERIAL|S\.N\.|MOBILE|PIN)\b/i;

export function escapePrintHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

export function renderPrintTemplate(template, data = {}) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const columns = Array.isArray(data.columns)
    ? data.columns
    : [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const columnMarkup = columns.map((column) => `<th>${escapePrintHtml(column)}</th>`).join("");
  const rowMarkup = rows.map((row) => `<tr>${columns.map((column) => {
    const fontClass = ENGLISH_COLUMN.test(column) ? "english-cell" : "hindi-cell";
    return `<td class="${fontClass}">${escapePrintHtml(row?.[column])}</td>`;
  }).join("")}</tr>`).join("");
  const replacements = {
    ...data,
    columns: columnMarkup,
    rows: rowMarkup
  };
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    if (key === "columns" || key === "rows") return replacements[key];
    return key in replacements ? escapePrintHtml(replacements[key]) : "";
  });
}

export function printTemplateDocument(template, data = {}, windowRef = window) {
  const printWindow = windowRef.open("", "_blank", "width=1100,height=750");
  if (!printWindow) throw new Error("प्रिंट विंडो नहीं खुली। ब्राउज़र में pop-up अनुमति दें।");
  printWindow.document.open();
  printWindow.document.write(renderPrintTemplate(template, data));
  printWindow.document.close();
  printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  return printWindow;
}
