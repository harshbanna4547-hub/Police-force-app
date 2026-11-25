import { useState } from "react";
import * as XLSX from "xlsx";
import { isDevlysText } from "../../../core/isDevlysText";
import {
  evaluateSpreadsheetFormula,
  getOfficeFontMeta,
  OFFICE_FONT_OPTIONS
} from "../../16_storage/storageLogic";

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
  if (!data) {
    return { Sheet1: Array.from({ length: 12 }, () => Array(7).fill("")) };
  }
  const wb = XLSX.read(data, { type: "array" });
  const result = {};
  (wb.SheetNames.length ? wb.SheetNames : ["Sheet1"]).forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) : [];
    const normalized = rows.map((row) =>
      Array.isArray(row) ? row.map((v) => String(v ?? "")) : [String(row ?? "")]
    );
    const minRows = Math.max(12, normalized.length);
    const minCols = Math.max(7, ...normalized.map((r) => r.length));
    for (let r = 0; r < minRows; r += 1) {
      if (!normalized[r]) normalized[r] = [];
      while (normalized[r].length < minCols) normalized[r].push("");
    }
    result[sheetName] = normalized;
  });
  return result;
}

/**
 * [APP] ExcelApp — MS Excel Pro with Formula Bar (=SUM, =AVERAGE, =COUNT), Styling & Font Switcher
 */
export default function ExcelApp({ item, onSaveFile, language = "hi" }) {
  const english = language === "en";
  const [sheets, setSheets] = useState(() => parseExcelSheets(item?.data));
  const [activeSheet, setActiveSheet] = useState(() => Object.keys(parseExcelSheets(item?.data))[0] || "Sheet1");
  const [colFonts, setColFonts] = useState({});
  const [cellFonts, setCellFonts] = useState({});
  const [cellBold, setCellBold] = useState({});
  const [cellBg, setCellBg] = useState({});
  const [focusedCell, setFocusedCell] = useState({ r: 0, c: 0 });
  const [toolbarFont, setToolbarFont] = useState("DevLys 010");
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const currentRows = sheets[activeSheet] || [[]];
  const colCount = Math.max(1, ...currentRows.map((r) => r.length));
  const activeKey = `${activeSheet}:${focusedCell.r}:${focusedCell.c}`;
  const rawFormulaValue = currentRows[focusedCell.r]?.[focusedCell.c] ?? "";

  const updateCell = (rowIndex, colIndex, val) => {
    setSheets((prev) => {
      const nextGrid = (prev[activeSheet] || []).map((row) => [...row]);
      while (nextGrid.length <= rowIndex) nextGrid.push(Array(colCount).fill(""));
      while (nextGrid[rowIndex].length <= colIndex) nextGrid[rowIndex].push("");
      nextGrid[rowIndex][colIndex] = val;
      return { ...prev, [activeSheet]: nextGrid };
    });
  };

  const addRow = () => {
    setSheets((prev) => ({
      ...prev,
      [activeSheet]: [...(prev[activeSheet] || []), Array(colCount).fill("")]
    }));
  };

  const addColumn = () => {
    setSheets((prev) => ({
      ...prev,
      [activeSheet]: (prev[activeSheet] || []).map((row) => [...row, ""])
    }));
  };

  const addSheet = () => {
    const name = window.prompt(english ? "New sheet name:" : "नई शीट का नाम:", `Sheet${Object.keys(sheets).length + 1}`);
    if (!name || !name.trim() || sheets[name.trim()]) return;
    setSheets((prev) => ({ ...prev, [name.trim()]: Array.from({ length: 12 }, () => Array(7).fill("")) }));
    setActiveSheet(name.trim());
  };

  const applyFont = (fontName) => {
    setToolbarFont(fontName);
    setCellFonts((prev) => ({ ...prev, [activeKey]: fontName }));
  };

  const applyFontToColumn = () => {
    setColFonts((prev) => ({ ...prev, [focusedCell.c]: toolbarFont }));
  };

  const toggleBold = () => {
    setCellBold((prev) => ({ ...prev, [activeKey]: !prev[activeKey] }));
  };

  const setCellHighlight = (toneClass) => {
    setCellBg((prev) => ({ ...prev, [activeKey]: prev[activeKey] === toneClass ? "" : toneClass }));
  };

  const resolveCellFontName = (r, c, value) => {
    const key = `${activeSheet}:${r}:${c}`;
    if (cellFonts[key]) return cellFonts[key];
    if (colFonts[c] && colFonts[c] !== "AUTO") return colFonts[c];
    return String(value || "").split(/\s+/).some((w) => isDevlysText(w))
      ? "DevLys 010"
      : "Times New Roman";
  };

  const buildWorkbookBytes = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([sheetName, grid]) => {
      const evaluated = grid.map((row) => row.map((v) => evaluateSpreadsheetFormula(v, grid)));
      const trimmed = evaluated.filter((row, idx) => idx === 0 || row.some((c) => String(c || "").trim() !== ""));
      const ws = XLSX.utils.aoa_to_sheet(trimmed.length ? trimmed : [[""]]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  };

  const handleSave = async () => {
    if (!onSaveFile) return;
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
      setStatusMsg(english ? "✔ Saved to Storage Vault" : "✔ Storage Vault में सेव");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const out = buildWorkbookBytes();
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = /\.(csv|xls)$/i.test(item.name) ? item.name.replace(/\.(csv|xls)$/i, ".xlsx") : item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="wapp-ribbon">
        <button type="button" onClick={handleSave} disabled={saving || !item?.id} className="wapp-btn is-save">
          💾 {english ? "Save Vault" : "सेव करें"}
        </button>
        <button type="button" onClick={handleDownload} className="wapp-btn is-download">
          📥 .xlsx
        </button>
        <button type="button" onClick={addRow} className="wapp-btn">➕ Row</button>
        <button type="button" onClick={addColumn} className="wapp-btn">➕ Col</button>
        <button type="button" onClick={addSheet} className="wapp-btn">📑 + Sheet</button>
        <button
          type="button"
          onClick={toggleBold}
          className={`wapp-btn${cellBold[activeKey] ? " is-active" : ""}`}
        >
          <b>B</b>
        </button>
        <button type="button" onClick={() => setCellHighlight("excel-cell-hl-yellow")} className="wapp-btn">🟨</button>
        <button type="button" onClick={() => setCellHighlight("excel-cell-hl-blue")} className="wapp-btn">🟦</button>
        <button type="button" onClick={() => setCellHighlight("excel-cell-hl-green")} className="wapp-btn">🟩</button>

        <select
          aria-label="Excel Pro Font"
          value={toolbarFont}
          onChange={(e) => applyFont(e.target.value)}
          className="wapp-select"
        >
          {OFFICE_FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <button type="button" onClick={applyFontToColumn} className="wapp-btn">
          📐 {english ? "Col Font" : "कॉलम फ़ॉन्ट"}
        </button>

        {statusMsg && <span className="wapp-status">{statusMsg}</span>}
      </div>

      {/* Formula Bar (=SUM(), =AVERAGE(), =COUNT()) */}
      <div className="wapp-formula-bar">
        <span className="wapp-cell-ref-pill">
          {columnLetters(focusedCell.c)}{focusedCell.r + 1}
        </span>
        <span className="wapp-fx-badge">fx</span>
        <input
          type="text"
          value={rawFormulaValue}
          onChange={(e) => updateCell(focusedCell.r, focusedCell.c, e.target.value)}
          placeholder={english ? "Enter value or formula e.g. =SUM(A1:A5), =AVERAGE(B1:B4), =COUNT(C1:C5)" : "मान या सूत्र लिखें: =SUM(A1:A5), =AVERAGE(B1:B4), =COUNT(C1:C5)"}
          className="wapp-formula-input"
        />
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
              {Array.from({ length: colCount }, (_, colIndex) => (
                <th key={colIndex} className="office-excel-col-head">
                  <div className="office-col-head-inner">
                    <span>{columnLetters(colIndex)}</span>
                    <button
                      type="button"
                      onClick={() => setColFonts((prev) => ({
                        ...prev,
                        [colIndex]: prev[colIndex] === "DevLys 010" ? "Times New Roman" : prev[colIndex] === "Times New Roman" ? "AUTO" : "DevLys 010"
                      }))}
                      className={`office-col-font-btn${colFonts[colIndex] === "DevLys 010" ? " is-devlys" : ""}`}
                    >
                      {!colFonts[colIndex] || colFonts[colIndex] === "AUTO" ? "Auto" : colFonts[colIndex] === "DevLys 010" ? "DevLys" : colFonts[colIndex].split(" ")[0]}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rIndex) => (
              <tr key={rIndex}>
                <td className="office-excel-row-num">{rIndex + 1}</td>
                {Array.from({ length: colCount }, (_, cIndex) => {
                  const raw = row[cIndex] ?? "";
                  const isFocused = focusedCell.r === rIndex && focusedCell.c === cIndex;
                  const displayValue = !isFocused && String(raw).startsWith("=")
                    ? evaluateSpreadsheetFormula(raw, currentRows)
                    : raw;
                  const fontMeta = getOfficeFontMeta(resolveCellFontName(rIndex, cIndex, displayValue));
                  const k = `${activeSheet}:${rIndex}:${cIndex}`;
                  const extraClasses = [
                    fontMeta.className,
                    cellBold[k] ? "excel-cell-bold" : "",
                    cellBg[k] || ""
                  ].filter(Boolean).join(" ");

                  return (
                    <td key={cIndex}>
                      <input
                        type="text"
                        value={displayValue}
                        onFocus={() => {
                          setFocusedCell({ r: rIndex, c: cIndex });
                          setToolbarFont(resolveCellFontName(rIndex, cIndex, raw));
                        }}
                        onChange={(e) => updateCell(rIndex, cIndex, e.target.value)}
                        className={`office-cell-input ${extraClasses}`}
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
  );
}
