import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { isDevlysText } from "../../core/isDevlysText";
import {
  extractWordBodyHtml,
  getOfficeEditorKind,
  getOfficeFontMeta,
  OFFICE_FONT_OPTIONS,
  wrapWordDocumentHtml
} from "../../modules/16_storage/storageLogic";
import "./InbuiltOfficeEditor.css";

const PDF_STAMPS = [
  "स्वीकृत (Approved)",
  "अग्रिम कार्यवाही हेतु प्रेषित",
  "रिकॉर्ड में दर्ज (Filed)",
  "नस्तीबद्ध",
  "अवलोकनार्थ प्रस्तुत"
];

function columnLetters(index) {
  let num = index;
  let result = "";
  while (num >= 0) {
    result = String.fromCharCode((num % 26) + 65) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}

function parseExcelSheets(data) {
  const wb = XLSX.read(data, { type: "array" });
  const result = {};
  (wb.SheetNames.length ? wb.SheetNames : ["Sheet1"]).forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) : [];
    const normalized = rows.map((row) => Array.isArray(row) ? row.map((v) => String(v ?? "")) : [String(row ?? "")]);
    const minRows = Math.max(10, normalized.length);
    const minCols = Math.max(6, ...normalized.map((r) => r.length));
    for (let r = 0; r < minRows; r += 1) {
      if (!normalized[r]) normalized[r] = [];
      while (normalized[r].length < minCols) normalized[r].push("");
    }
    result[sheetName] = normalized;
  });
  return result;
}

/**
 * [COMPONENT] InbuiltOfficeEditor — इन-ऐप Excel, Word एवं PDF एडिटर / व्यूअर मोडल
 */
export default function InbuiltOfficeEditor({ item, onSaveFile, onClose, language = "hi" }) {
  const english = language === "en";
  const kind = getOfficeEditorKind(item?.name, item?.mime) || "WORD";

  // [STATE] General Status
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // [STATE] Excel Editor
  const [sheets, setSheets] = useState(() => (kind === "EXCEL" ? parseExcelSheets(item.data) : {}));
  const [activeSheet, setActiveSheet] = useState(() => Object.keys(kind === "EXCEL" ? parseExcelSheets(item.data) : { Sheet1: [] })[0] || "Sheet1");
  const [colFonts, setColFonts] = useState({}); // colIndex -> "AUTO" | fontName
  const [cellFonts, setCellFonts] = useState({}); // "sheet:r:c" -> fontName
  const [excelToolbarFont, setExcelToolbarFont] = useState("DevLys 010");
  const [focusedCell, setFocusedCell] = useState(null);

  // [STATE] Word Editor
  const wordRef = useRef(null);
  const [wordDefaultFont, setWordDefaultFont] = useState("DevLys 010");
  const [wordSize, setWordSize] = useState("4");

  // [STATE] PDF Viewer & Notes
  const [pdfZoom, setPdfZoom] = useState(100);
  const [notePage, setNotePage] = useState("1");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(() => (Array.isArray(item?.officeNotes) ? item.officeNotes : []));

  const pdfObjectUrl = useMemo(() => {
    if (kind !== "PDF" || !item?.data) return "";
    return URL.createObjectURL(new Blob([item.data], { type: "application/pdf" }));
  }, [kind, item]);

  useEffect(() => () => {
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  }, [pdfObjectUrl]);

  useEffect(() => {
    if (kind === "WORD" && wordRef.current) {
      wordRef.current.innerHTML = extractWordBodyHtml(item?.data);
    }
  }, [kind, item]);

  const currentRows = sheets[activeSheet] || [[]];
  const colCount = Math.max(1, ...(currentRows.map((r) => r.length)));

  const updateCell = (rowIndex, colIndex, val) => {
    setSheets((prev) => {
      const nextGrid = (prev[activeSheet] || []).map((row) => [...row]);
      while (nextGrid.length <= rowIndex) nextGrid.push(Array(colCount).fill(""));
      while (nextGrid[rowIndex].length <= colIndex) nextGrid[rowIndex].push("");
      nextGrid[rowIndex][colIndex] = val;
      return { ...prev, [activeSheet]: nextGrid };
    });
  };

  const addExcelRow = () => {
    setSheets((prev) => ({
      ...prev,
      [activeSheet]: [...(prev[activeSheet] || []), Array(colCount).fill("")]
    }));
  };

  const addExcelColumn = () => {
    setSheets((prev) => ({
      ...prev,
      [activeSheet]: (prev[activeSheet] || []).map((row) => [...row, ""])
    }));
  };

  const addExcelSheet = () => {
    const newName = window.prompt(english ? "New sheet name:" : "नई शीट का नाम लिखें:", `Sheet${Object.keys(sheets).length + 1}`);
    if (!newName || !newName.trim() || sheets[newName.trim()]) return;
    const blank = Array.from({ length: 10 }, () => Array(6).fill(""));
    setSheets((prev) => ({ ...prev, [newName.trim()]: blank }));
    setActiveSheet(newName.trim());
  };

  const toggleColumnFont = (colIndex) => {
    setColFonts((prev) => {
      const curr = prev[colIndex] || "AUTO";
      const next = curr === "AUTO" ? "DevLys 010" : curr === "DevLys 010" ? "Times New Roman" : "AUTO";
      return { ...prev, [colIndex]: next };
    });
  };

  const applyExcelFontSelection = (fontName) => {
    setExcelToolbarFont(fontName);
    if (focusedCell) {
      const key = `${activeSheet}:${focusedCell.r}:${focusedCell.c}`;
      setCellFonts((prev) => ({ ...prev, [key]: fontName }));
    }
  };

  const applyExcelFontToColumn = () => {
    if (!focusedCell) return;
    setColFonts((prev) => ({ ...prev, [focusedCell.c]: excelToolbarFont }));
  };

  const resolveCellFontName = (r, c, value) => {
    const cellOverride = cellFonts[`${activeSheet}:${r}:${c}`];
    if (cellOverride) return cellOverride;
    const colMode = colFonts[c] || "AUTO";
    if (colMode !== "AUTO") return colMode;
    return String(value || "").split(/\s+/).some((word) => isDevlysText(word))
      ? "DevLys 010"
      : "Times New Roman";
  };

  const getCellFontClass = (r, c, value) => getOfficeFontMeta(resolveCellFontName(r, c, value)).className;

  const buildWorkbookBytes = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([sheetName, grid]) => {
      const trimmed = grid.filter((row, idx) => idx === 0 || row.some((cell) => String(cell || "").trim() !== ""));
      const ws = XLSX.utils.aoa_to_sheet(trimmed.length ? trimmed : [[""]]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  };

  const saveExcelToVault = async () => {
    setSaving(true);
    try {
      const out = buildWorkbookBytes();
      const targetName = /\.(csv|xls)$/i.test(item.name) ? item.name.replace(/\.(csv|xls)$/i, ".xlsx") : item.name;
      await onSaveFile({
        ...item,
        name: targetName,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        data: out
      });
      setStatusMsg(english ? "✔ Saved to Storage Vault" : "✔ Storage Vault में सेव हो गया");
    } finally {
      setSaving(false);
    }
  };

  const downloadExcel = () => {
    const out = buildWorkbookBytes();
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = /\.(csv|xls)$/i.test(item.name) ? item.name.replace(/\.(csv|xls)$/i, ".xlsx") : item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // [WORD ACTIONS]
  const execWord = (cmd, val = null) => {
    if (wordRef.current) wordRef.current.focus();
    document.execCommand(cmd, false, val);
  };

  const insertWordTable = () => {
    const tableHtml = "<table><thead><tr><th>क्र.सं.</th><th>विवरण</th><th>आदेश / टिप्पणी</th></tr></thead><tbody><tr><td>1</td><td></td><td></td></tr><tr><td>2</td><td></td><td></td></tr></tbody></table><p></p>";
    execWord("insertHTML", tableHtml);
  };

  const applySelectionFont = (fontName) => {
    setWordDefaultFont(fontName);
    execWord("fontName", getOfficeFontMeta(fontName).stack);
  };

  const buildWordBuffer = () => {
    const bodyHtml = wordRef.current ? wordRef.current.innerHTML : "<p></p>";
    const fullHtml = wrapWordDocumentHtml(bodyHtml, item.name, wordDefaultFont);
    return {
      fullHtml,
      buffer: new TextEncoder().encode(`\uFEFF${fullHtml}`).buffer
    };
  };

  const saveWordToVault = async () => {
    setSaving(true);
    try {
      const { buffer } = buildWordBuffer();
      const targetName = /\.docx$/i.test(item.name) ? item.name.replace(/\.docx$/i, ".doc") : item.name;
      await onSaveFile({
        ...item,
        name: targetName,
        mime: "application/msword",
        data: buffer
      });
      setStatusMsg(english ? "✔ Saved to Storage Vault" : "✔ Storage Vault में सेव हो गया");
    } finally {
      setSaving(false);
    }
  };

  const downloadWordDoc = () => {
    const { fullHtml } = buildWordBuffer();
    const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name.endsWith(".doc") ? item.name : `${item.name.replace(/\.docx$/i, "")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printWordOrPdf = () => {
    if (kind === "PDF" && pdfObjectUrl) {
      const win = window.open(pdfObjectUrl, "_blank");
      if (win) win.addEventListener("load", () => win.print(), { once: true });
      return;
    }
    const { fullHtml } = buildWordBuffer();
    const win = window.open("", "_blank", "width=950,height=780");
    if (!win) return window.alert("Pop-up blocked!");
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 300);
  };

  // [PDF ACTIONS]
  const addPdfNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const nextNotes = [
      { id: Date.now(), page: notePage || "1", text: noteText.trim(), createdAt: new Date().toLocaleDateString("en-IN") },
      ...notes
    ];
    setNotes(nextNotes);
    setNoteText("");
    await onSaveFile({ ...item, officeNotes: nextNotes });
    setStatusMsg(english ? "✔ Note saved to Storage Vault" : "✔ टिप्पणी Storage Vault में सुरक्षित");
  };

  const downloadPdf = () => {
    const blob = new Blob([item.data], { type: item.mime || "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="office-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section className="office-modal" role="dialog" aria-modal="true" aria-label={item?.name || "Office Suite"}>
        {/* === TOP BAR === */}
        <header className="office-header">
          <div className="office-title-group">
            <span className="office-kind-pill">
              {kind === "EXCEL" ? "📊 EXCEL" : kind === "WORD" ? "📝 WORD" : "📕 PDF VIEWER"}
            </span>
            <h3 className="office-file-name">{item?.name}</h3>
          </div>

          <div className="office-header-actions">
            {kind === "EXCEL" && (
              <>
                <button type="button" disabled={saving} onClick={saveExcelToVault} className="office-btn office-btn-save">
                  💾 {english ? "Save to Storage Vault" : "Storage Vault में सेव"}
                </button>
                <button type="button" onClick={downloadExcel} className="office-btn office-btn-download">
                  📥 Download .xlsx
                </button>
              </>
            )}
            {kind === "WORD" && (
              <>
                <button type="button" disabled={saving} onClick={saveWordToVault} className="office-btn office-btn-save">
                  💾 {english ? "Save to Storage Vault" : "Storage Vault में सेव"}
                </button>
                <button type="button" onClick={downloadWordDoc} className="office-btn office-btn-download">
                  📥 Download .doc
                </button>
                <button type="button" onClick={printWordOrPdf} className="office-btn office-btn-print">
                  🖨️ Print / PDF
                </button>
              </>
            )}
            {kind === "PDF" && (
              <>
                <button type="button" onClick={downloadPdf} className="office-btn office-btn-download">
                  📥 Download .pdf
                </button>
                <button type="button" onClick={printWordOrPdf} className="office-btn office-btn-print">
                  🖨️ Print
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="office-btn office-btn-close" aria-label="Close Office Suite">
              ✕ {english ? "Close" : "बंद"}
            </button>
          </div>
        </header>

        {/* === MODE 1: EXCEL SPREADSHEET EDITOR === */}
        {kind === "EXCEL" && (
          <>
            <div className="office-toolbar">
              <button type="button" onClick={addExcelRow} className="office-tool-btn">➕ Add Row</button>
              <button type="button" onClick={addExcelColumn} className="office-tool-btn">➕ Add Column</button>
              <button type="button" onClick={addExcelSheet} className="office-tool-btn">📑 + Sheet</button>

              <label className="office-tool-label" htmlFor="excel-font-select">
                🔤 {english ? "Font:" : "फ़ॉन्ट:"}
              </label>
              <select
                id="excel-font-select"
                aria-label="Excel Font Family"
                value={excelToolbarFont}
                onChange={(e) => applyExcelFontSelection(e.target.value)}
                className="office-tool-select"
              >
                {OFFICE_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={applyExcelFontToColumn}
                className="office-tool-btn"
                disabled={!focusedCell}
              >
                📐 {english ? "Apply to Column" : "पूरे कॉलम पर लागू"}
              </button>
              {statusMsg && <span className="office-status-msg">{statusMsg}</span>}
            </div>

            <div className="office-sheet-tabs">
              {Object.keys(sheets).map((sheetName) => (
                <button
                  type="button"
                  key={sheetName}
                  onClick={() => setActiveSheet(sheetName)}
                  className={`office-sheet-tab ${activeSheet === sheetName ? "is-active" : ""}`}
                >
                  {sheetName}
                </button>
              ))}
            </div>

            <div className="office-excel-wrap">
              <table className="office-excel-grid">
                <thead>
                  <tr>
                    <th className="office-excel-corner">#</th>
                    {Array.from({ length: colCount }, (_, colIndex) => {
                      const colMode = colFonts[colIndex] || "AUTO";
                      return (
                        <th key={colIndex} className="office-excel-col-head">
                          <div className="office-col-head-inner">
                            <span>{columnLetters(colIndex)}</span>
                            <button
                              type="button"
                              onClick={() => toggleColumnFont(colIndex)}
                              className={`office-col-font-btn ${colMode === "DevLys 010" ? "is-devlys" : ""}`}
                              title="Toggle Column Font (Auto / DevLys 010 / Times New Roman)"
                            >
                              {colMode === "AUTO" ? "Auto" : colMode === "DevLys 010" ? "DevLys" : colMode === "Times New Roman" ? "TNR" : colMode.split(" ")[0]}
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, rIndex) => (
                    <tr key={rIndex}>
                      <td className="office-excel-row-num">{rIndex + 1}</td>
                      {Array.from({ length: colCount }, (_, cIndex) => {
                        const val = row[cIndex] ?? "";
                        const fontClass = getCellFontClass(rIndex, cIndex, val);
                        return (
                          <td key={cIndex}>
                            <input
                              type="text"
                              value={val}
                              onFocus={() => {
                                setFocusedCell({ r: rIndex, c: cIndex });
                                setExcelToolbarFont(resolveCellFontName(rIndex, cIndex, val));
                              }}
                              onChange={(e) => updateCell(rIndex, cIndex, e.target.value)}
                              className={`office-cell-input ${fontClass}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* === MODE 2: WORD RICH TEXT EDITOR === */}
        {kind === "WORD" && (
          <>
            <div className="office-toolbar">
              <button type="button" onClick={() => execWord("bold")} className="office-tool-btn"><b>B</b></button>
              <button type="button" onClick={() => execWord("italic")} className="office-tool-btn"><i>I</i></button>
              <button type="button" onClick={() => execWord("underline")} className="office-tool-btn"><u>U</u></button>
              <button type="button" onClick={() => execWord("justifyLeft")} className="office-tool-btn">⟸ Left</button>
              <button type="button" onClick={() => execWord("justifyCenter")} className="office-tool-btn">☰ Center</button>
              <button type="button" onClick={() => execWord("justifyRight")} className="office-tool-btn">⟹ Right</button>
              <button type="button" onClick={insertWordTable} className="office-tool-btn">⊞ Insert Table</button>

              <select
                aria-label="Font Size"
                value={wordSize}
                onChange={(e) => {
                  setWordSize(e.target.value);
                  execWord("fontSize", e.target.value);
                }}
                className="office-tool-select"
              >
                <option value="2">10pt</option>
                <option value="3">12pt</option>
                <option value="4">14pt</option>
                <option value="5">18pt</option>
                <option value="6">24pt</option>
              </select>

              <label className="office-tool-label" htmlFor="word-font-select">
                🔤 {english ? "Font:" : "फ़ॉन्ट:"}
              </label>
              <select
                id="word-font-select"
                aria-label="Word Font Family"
                value={wordDefaultFont}
                onChange={(e) => applySelectionFont(e.target.value)}
                className="office-tool-select"
              >
                {OFFICE_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              {statusMsg && <span className="office-status-msg">{statusMsg}</span>}
            </div>

            <div className="office-word-canvas-wrap">
              <div
                ref={wordRef}
                contentEditable
                suppressContentEditableWarning
                className={`office-word-page ${getOfficeFontMeta(wordDefaultFont).className}`}
                aria-label="Word document editor"
              />
            </div>
          </>
        )}

        {/* === MODE 3: PDF VIEWER & QUICK STAMP / NOTES === */}
        {kind === "PDF" && (
          <>
            <div className="office-toolbar">
              <button type="button" onClick={() => setPdfZoom((z) => Math.max(50, z - 25))} className="office-tool-btn">➖ Zoom Out</button>
              <span className="english-cell">{pdfZoom}%</span>
              <button type="button" onClick={() => setPdfZoom((z) => Math.min(200, z + 25))} className="office-tool-btn">➕ Zoom In</button>
              {statusMsg && <span className="office-status-msg">{statusMsg}</span>}
            </div>

            <div className="office-pdf-layout">
              <iframe
                title={item.name}
                src={`${pdfObjectUrl}#zoom=${pdfZoom}`}
                className="office-pdf-frame"
              />

              <aside className="office-pdf-notes">
                <h4>📝 {english ? "Quick Office Stamp & Notes" : "कार्यालय टिप्पणी व मोहर (Stamp)"}</h4>
                <div className="office-stamp-pills">
                  {PDF_STAMPS.map((stamp) => (
                    <button key={stamp} type="button" onClick={() => setNoteText(stamp)} className="office-stamp-pill">
                      {stamp}
                    </button>
                  ))}
                </div>

                <form onSubmit={addPdfNote}>
                  <input
                    type="text"
                    value={notePage}
                    onChange={(e) => setNotePage(e.target.value)}
                    placeholder={english ? "Page No." : "पृष्ठ संख्या"}
                    className="office-note-input"
                  />
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={english ? "Enter official remark / note..." : "आधिकारिक रिमार्क या टिप्पणी लिखें..."}
                    className="office-note-textarea"
                  />
                  <button type="submit" className="office-btn office-btn-save">
                    💾 {english ? "Save Note to Vault" : "टिप्पणी सेव करें"}
                  </button>
                </form>

                <div className="office-saved-notes">
                  {notes.map((n) => (
                    <div key={n.id} className="office-saved-note-item">
                      <strong>P.{n.page}</strong> · {n.createdAt}
                      <div>{n.text}</div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
