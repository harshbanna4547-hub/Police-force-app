import { useEffect, useRef, useState } from "react";
import {
  extractWordBodyHtml,
  getOfficeFontMeta,
  OFFICE_FONT_OPTIONS,
  wrapWordDocumentHtml
} from "../../16_storage/storageLogic";

/**
 * [APP] WordApp — MS Word Pro with A4 Canvas, Ribbon Formatting, Color, Alignment & Table Insert
 */
export default function WordApp({ item, onSaveFile, language = "hi" }) {
  const english = language === "en";
  const editorRef = useRef(null);
  const [defaultFont, setDefaultFont] = useState("DevLys 010");
  const [fontSize, setFontSize] = useState("4");
  const [textColor, setTextColor] = useState("#0f172a");
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = extractWordBodyHtml(item?.data);
    }
  }, [item]);

  const exec = (cmd, val = null) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(cmd, false, val);
  };

  const applyFont = (fontName) => {
    setDefaultFont(fontName);
    exec("fontName", getOfficeFontMeta(fontName).stack);
  };

  const applyColor = (hex) => {
    setTextColor(hex);
    exec("foreColor", hex);
  };

  const insertTable = () => {
    exec(
      "insertHTML",
      "<table><thead><tr><th>क्र.सं.</th><th>विवरण</th><th>आदेश / टिप्पणी</th></tr></thead><tbody><tr><td>1</td><td></td><td></td></tr><tr><td>2</td><td></td><td></td></tr></tbody></table><p></p>"
    );
  };

  const buildWordPayload = () => {
    const bodyHtml = editorRef.current ? editorRef.current.innerHTML : "<p></p>";
    const fullHtml = wrapWordDocumentHtml(bodyHtml, item?.name || "Document", defaultFont);
    return {
      fullHtml,
      buffer: new TextEncoder().encode(`\uFEFF${fullHtml}`).buffer
    };
  };

  const handleSave = async () => {
    if (!onSaveFile || !item) return;
    setSaving(true);
    try {
      const { buffer } = buildWordPayload();
      const targetName = /\.docx$/i.test(item.name) ? item.name.replace(/\.docx$/i, ".doc") : item.name;
      await onSaveFile({
        ...item,
        name: targetName,
        mime: "application/msword",
        data: buffer
      });
      setStatusMsg(english ? "✔ Saved to Storage Vault" : "✔ Storage Vault में सेव");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const { fullHtml } = buildWordPayload();
    const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = item?.name || "Police_Order.doc";
    a.download = baseName.endsWith(".doc") ? baseName : `${baseName.replace(/\.docx$/i, "")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const { fullHtml } = buildWordPayload();
    const win = window.open("", "_blank", "width=950,height=780");
    if (!win) return window.alert("Pop-up blocked!");
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 300);
  };

  return (
    <>
      <div className="wapp-ribbon">
        <button type="button" onClick={handleSave} disabled={saving || !item?.id} className="wapp-btn is-save">
          💾 {english ? "Save Vault" : "सेव करें"}
        </button>
        <button type="button" onClick={handleDownload} className="wapp-btn is-download">
          📥 .doc
        </button>
        <button type="button" onClick={handlePrint} className="wapp-btn">
          🖨️ Print
        </button>

        <button type="button" onClick={() => exec("bold")} className="wapp-btn"><b>B</b></button>
        <button type="button" onClick={() => exec("italic")} className="wapp-btn"><i>I</i></button>
        <button type="button" onClick={() => exec("underline")} className="wapp-btn"><u>U</u></button>
        <button type="button" onClick={() => exec("justifyLeft")} className="wapp-btn">⟸ Left</button>
        <button type="button" onClick={() => exec("justifyCenter")} className="wapp-btn">☰ Center</button>
        <button type="button" onClick={() => exec("justifyRight")} className="wapp-btn">⟹ Right</button>
        <button type="button" onClick={insertTable} className="wapp-btn">⊞ Table</button>

        <select
          aria-label="Word Pro Font"
          value={defaultFont}
          onChange={(e) => applyFont(e.target.value)}
          className="wapp-select"
        >
          {OFFICE_FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          aria-label="Font Size"
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            exec("fontSize", e.target.value);
          }}
          className="wapp-select"
        >
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
        </select>

        <select
          aria-label="Text Color"
          value={textColor}
          onChange={(e) => applyColor(e.target.value)}
          className="wapp-select"
        >
          <option value="#0f172a">Black</option>
          <option value="#1e3a8a">Royal Blue</option>
          <option value="#b91c1c">Crimson Red</option>
          <option value="#15803d">Forest Green</option>
        </select>

        {statusMsg && <span className="wapp-status">{statusMsg}</span>}
      </div>

      <div className="wapp-a4-wrap">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`wapp-a4-page ${getOfficeFontMeta(defaultFont).className}`}
          aria-label="Word A4 document canvas"
        />
      </div>
    </>
  );
}
