/* === STORAGE VAULT LOGIC HELPERS (स्टोरेज वॉल्ट एवं ऑफिस एडिटर हेल्पर्स) === */

export function isStorageItemForDistrict(item, districtName) {
  return String(item?.district || "") === String(districtName || "");
}

export function getStorageItemSummary(items, districtName) {
  return (Array.isArray(items) ? items : []).filter((item) => isStorageItemForDistrict(item, districtName));
}

// [CONTEXT] Checks whether user is inside the "01. Strength" folder or any subfolder of it
export function isStrengthVaultFolder(breadcrumbs = []) {
  return (Array.isArray(breadcrumbs) ? breadcrumbs : []).some((folder) =>
    /^01\.\s*strength/i.test(String(folder?.name || "").trim())
  );
}

// [OFFICE SUITE] Identifies supported Excel, Word, or PDF file types for the In-App Office Suite
export function getOfficeEditorKind(fileName = "", mime = "") {
  const lower = String(fileName || "").trim().toLowerCase();
  const mimeLower = String(mime || "").trim().toLowerCase();
  if (/\.(xlsx|xls|csv)$/i.test(lower) || mimeLower.includes("spreadsheet") || mimeLower.includes("excel") || mimeLower === "text/csv") {
    return "EXCEL";
  }
  if (/\.(doc|docx|html|htm)$/i.test(lower) || mimeLower.includes("msword") || mimeLower.includes("wordprocessingml") || mimeLower === "text/html") {
    return "WORD";
  }
  if (/\.pdf$/i.test(lower) || mimeLower === "application/pdf") {
    return "PDF";
  }
  return null;
}

// [WORD HELPER] Extracts editable body HTML from saved .doc/.html buffers cleanly
export function extractWordBodyHtml(arrayBuffer) {
  if (!arrayBuffer) return "<p></p>";
  const bytes = new Uint8Array(arrayBuffer);
  // Check for ZIP/DOCX magic bytes ("PK")
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return "<p><em>Imported .docx binary file. Draft or edit content below and save to update as Office Word (.doc) in Storage Vault.</em></p>";
  }
  const text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim() || "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br/>");
  return `<p>${escaped}</p>`;
}

export function wrapWordDocumentHtml(bodyHtml, title = "Police Office Document", defaultFont = "DevLys 010") {
  const fontStack = defaultFont === "Times New Roman"
    ? "'Times New Roman', Times, serif"
    : "'DevLys 010', 'Kruti Dev 010', sans-serif";
  const fontSize = defaultFont === "Times New Roman" ? "13pt" : "16pt";

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="hi">
<head>
<meta charset="utf-8" />
<title>${String(title || "").replace(/</g, "&lt;")}</title>
<style>
  @font-face {
    font-family: 'DevLys 010';
    src: url('/fonts/DevLys010.ttf') format('truetype');
    font-display: swap;
  }
  body {
    font-family: ${fontStack};
    font-size: ${fontSize};
    line-height: 1.5;
    color: #111827;
    padding: 24px;
  }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #334155; padding: 6px 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>${bodyHtml || "<p></p>"}</body>
</html>`;
}
