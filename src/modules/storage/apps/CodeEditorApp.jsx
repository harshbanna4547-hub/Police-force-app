import { useMemo, useState } from "react";

function decodeBufferText(data) {
  if (!data) return "{\n  \"portal\": \"District Police Windows 11 Vault\"\n}";
  try {
    return new TextDecoder("utf-8").decode(data).replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

function getLangTag(fileName = "") {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  const map = { json: "JSON", js: "JavaScript", jsx: "React JSX", css: "CSS", html: "HTML", csv: "CSV", txt: "Plain Text" };
  return map[ext] || (ext ? ext.toUpperCase() : "TEXT");
}

/**
 * [APP] CodeEditorApp — VS Code Lite dark editor with line numbers & JSON formatting
 */
export default function CodeEditorApp({ item, onSaveFile, language = "hi" }) {
  const english = language === "en";
  const [content, setContent] = useState(() => decodeBufferText(item?.data));
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const lineCount = useMemo(() => Math.max(1, content.split("\n").length), [content]);
  const langTag = getLangTag(item?.name);

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      setStatusMsg("✔ Formatted JSON");
    } catch (err) {
      setStatusMsg(`⚠ Invalid JSON: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (!onSaveFile || !item?.id) return;
    setSaving(true);
    try {
      const buffer = new TextEncoder().encode(content).buffer;
      await onSaveFile({ ...item, data: buffer });
      setStatusMsg(english ? "✔ Saved to Storage Vault" : "✔ Vault में सेव");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wapp-vscode-shell">
      <div className="wapp-vscode-ribbon">
        <span className="wapp-vscode-tag">{langTag}</span>
        <span>{item?.name || "untitled.txt"}</span>

        <button type="button" onClick={handleSave} disabled={saving || !item?.id} className="wapp-btn is-save">
          💾 Save
        </button>

        {langTag === "JSON" && (
          <button type="button" onClick={handleFormatJson} className="wapp-btn">
            ✨ Format JSON
          </button>
        )}

        {statusMsg && <span className="wapp-status">{statusMsg}</span>}
      </div>

      <div className="wapp-vscode-editor-wrap">
        <div className="wapp-vscode-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          aria-label="VS Code Lite editor"
          className="wapp-vscode-textarea"
        />
      </div>
    </div>
  );
}
