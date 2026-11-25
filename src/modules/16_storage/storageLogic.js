/* === STORAGE VAULT LOGIC HELPERS (स्टोरेज वॉल्ट एवं ऑफिस एडिटर हेल्पर्स) === */

export const RECYCLE_BIN_ID = "RECYCLE_BIN";

// [WINDOWS 11 FOLDERS] Unique sequential folders (01. Strength to 13. Reports + Backup)
export const WINDOWS_11_DEFAULT_FOLDERS = [
  "01. Strength",
  "02. Posting",
  "03. Transfer",
  "04. Leave",
  "05. ACP",
  "06. Promotion",
  "07. Seniority",
  "08. Bharti",
  "09. Increment",
  "10. Training",
  "11. Punishment",
  "12. Roster",
  "13. Reports",
  "Backup"
];

export const WALLPAPER_PRESETS = [
  { id: "bloom", label: "Blue Bloom", hiLabel: "ब्लू ब्लूम", className: "wp-bloom" },
  { id: "dark-glow", label: "Dark Glow", hiLabel: "डार्क ग्लो", className: "wp-dark-glow" },
  { id: "sunset", label: "Sunset Ridge", hiLabel: "सनसेट रिज", className: "wp-sunset" },
  { id: "emerald", label: "Emerald Waves", hiLabel: "एमराल्ड वेव्स", className: "wp-emerald" }
];

export const APP_STORE_CATALOG = [
  { id: "excel-pro", icon: "📊", title: "MS Excel Pro", desc: "Formulas (=SUM, =AVERAGE, =COUNT), DevLys 010 & .xlsx editor", defaultInstalled: true, defaultPinned: true },
  { id: "word-pro", icon: "📝", title: "MS Word Pro", desc: "A4 Ribbon Editor with DevLys 010, Times New Roman & .doc export", defaultInstalled: true, defaultPinned: true },
  { id: "photo-viewer", icon: "🖼️", title: "Photo Viewer", desc: "Inspect .jpg, .png, .webp with zoom, rotate & gallery navigation", defaultInstalled: true, defaultPinned: false },
  { id: "media-player", icon: "🎬", title: "Media Player", desc: "Play .mp4, .webm, .mp3 training videos with speed controls", defaultInstalled: true, defaultPinned: false },
  { id: "vscode-lite", icon: "💻", title: "VS Code Lite", desc: "Dark code/JSON/text editor with line numbers & JSON formatter", defaultInstalled: true, defaultPinned: true },
  { id: "calculator", icon: "🧮", title: "Calculator", desc: "Standard Windows 11 quick office calculator", defaultInstalled: true, defaultPinned: true },
  { id: "sticky-notes", icon: "🗒️", title: "Sticky Notes", desc: "Draggable saved desktop notes & daily establishment reminders", defaultInstalled: true, defaultPinned: false },
  { id: "games", icon: "🎮", title: "Classic Games", desc: "Minesweeper, Snake & Tic-Tac-Toe with high-score tracking", defaultInstalled: false, defaultPinned: false }
];

export function deduplicateRootFolders(allItems = []) {
  const seenKeys = new Set();
  const redundantIds = [];
  const list = Array.isArray(allItems) ? allItems : [];
  for (const item of list) {
    if (item.isTrashed || item.parentId !== "ROOT" || item.kind !== "FOLDER") continue;
    const rawName = String(item.name || "").trim();
    const isTrainingDup = /^09\.\s*training/i.test(rawName);
    const key = isTrainingDup ? "training_dup_guard" : rawName.toLowerCase();
    // If "10. Training" already exists, drop empty legacy "09. Training*" duplicate
    const hasChild = list.some((child) => child.parentId === item.id && !child.isTrashed);
    if (seenKeys.has(key) || (isTrainingDup && !hasChild && list.some((x) => !x.isTrashed && /^10\.\s*training/i.test(String(x.name || ""))))) {
      redundantIds.push(item.id);
    } else {
      seenKeys.add(key);
    }
  }
  return redundantIds;
}

export function getVaultFileAppKind(fileName = "", mime = "") {
  const office = getOfficeEditorKind(fileName, mime);
  if (office) return office; // EXCEL | WORD | PDF
  const lower = String(fileName || "").trim().toLowerCase();
  const mimeLower = String(mime || "").trim().toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(lower) || mimeLower.startsWith("image/")) {
    return "PHOTO";
  }
  if (/\.(mp4|webm|ogg|mp3|wav|m4a)$/i.test(lower) || mimeLower.startsWith("video/") || mimeLower.startsWith("audio/")) {
    return "MEDIA";
  }
  if (/\.(json|txt|md|js|jsx|ts|tsx|css|xml|log|ini|yml|yaml)$/i.test(lower) || mimeLower.includes("json") || mimeLower.startsWith("text/")) {
    return "CODE";
  }
  return null;
}

function colLettersToIndex(letters) {
  let idx = 0;
  const upper = String(letters || "").toUpperCase();
  for (let i = 0; i < upper.length; i += 1) {
    idx = idx * 26 + (upper.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseCellRef(token) {
  const m = String(token || "").trim().match(/^([A-Za-z]{1,3})(\d+)$/);
  if (!m) return null;
  return { c: colLettersToIndex(m[1]), r: Math.max(0, Number(m[2]) - 1) };
}

function collectRangeValues(expr, grid, depth = 0) {
  const parts = String(expr || "").split(",").map((s) => s.trim()).filter(Boolean);
  const values = [];
  for (const part of parts) {
    if (part.includes(":")) {
      const [startStr, endStr] = part.split(":");
      const start = parseCellRef(startStr);
      const end = parseCellRef(endStr);
      if (start && end) {
        const rMin = Math.min(start.r, end.r);
        const rMax = Math.max(start.r, end.r);
        const cMin = Math.min(start.c, end.c);
        const cMax = Math.max(start.c, end.c);
        for (let r = rMin; r <= rMax; r += 1) {
          for (let c = cMin; c <= cMax; c += 1) {
            const raw = grid?.[r]?.[c];
            if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
              const resolved = depth < 3 && String(raw).startsWith("=")
                ? evaluateSpreadsheetFormula(raw, grid, depth + 1)
                : raw;
              values.push(resolved);
            }
          }
        }
      }
    } else {
      const ref = parseCellRef(part);
      if (ref) {
        const raw = grid?.[ref.r]?.[ref.c];
        if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
          values.push(depth < 3 && String(raw).startsWith("=") ? evaluateSpreadsheetFormula(raw, grid, depth + 1) : raw);
        }
      } else if (!Number.isNaN(Number(part))) {
        values.push(Number(part));
      }
    }
  }
  return values;
}

export function evaluateSpreadsheetFormula(rawValue, grid, depth = 0) {
  const text = String(rawValue ?? "").trim();
  if (!text.startsWith("=")) return rawValue;
  if (depth > 4) return "#ERR";

  const body = text.slice(1).trim();
  const fnMatch = body.match(/^(SUM|AVERAGE|AVG|COUNT)\((.*)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const vals = collectRangeValues(fnMatch[2], grid, depth);
    const nums = vals.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    if (fn === "COUNT") return String(nums.length);
    if (fn === "SUM") {
      const sum = nums.reduce((acc, n) => acc + n, 0);
      return Number.isInteger(sum) ? String(sum) : sum.toFixed(2);
    }
    if (fn === "AVERAGE" || fn === "AVG") {
      if (!nums.length) return "0";
      const avg = nums.reduce((acc, n) => acc + n, 0) / nums.length;
      return Number.isInteger(avg) ? String(avg) : avg.toFixed(2);
    }
  }

  // Single cell reference (=A1) or simple A1+B1 arithmetic
  const single = parseCellRef(body);
  if (single) {
    const target = grid?.[single.r]?.[single.c] ?? "";
    return String(target).startsWith("=") ? evaluateSpreadsheetFormula(target, grid, depth + 1) : String(target);
  }

  const arith = body.match(/^([A-Za-z]{1,3}\d+)\s*([+\-*/])\s*([A-Za-z]{1,3}\d+)$/);
  if (arith) {
    const leftRef = parseCellRef(arith[1]);
    const rightRef = parseCellRef(arith[3]);
    const a = Number(evaluateSpreadsheetFormula(grid?.[leftRef.r]?.[leftRef.c] ?? 0, grid, depth + 1));
    const b = Number(evaluateSpreadsheetFormula(grid?.[rightRef.r]?.[rightRef.c] ?? 0, grid, depth + 1));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (arith[2] === "+") return String(a + b);
      if (arith[2] === "-") return String(a - b);
      if (arith[2] === "*") return String(a * b);
      if (arith[2] === "/") return b === 0 ? "#DIV/0!" : (a / b).toFixed(2);
    }
  }

  return text;
}

export function formatIstClockDate(date = new Date()) {
  const dt = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  }).formatToParts(dt);
  const pick = (type) => parts.find((p) => p.type === type)?.value || "00";
  return `${pick("hour")}:${pick("minute")} | ${pick("day")}-${pick("month")}-${pick("year")}`;
}

export function isStorageItemForDistrict(item, districtName) {
  return String(item?.district || "") === String(districtName || "");
}

export function getStorageItemSummary(items, districtName) {
  return (Array.isArray(items) ? items : []).filter((item) => isStorageItemForDistrict(item, districtName));
}

// [EXPLORER HELPERS] Breadcrumb path builder, descendant collector, move guard & copy clone
export function getVaultItemPath(item, allItems = []) {
  const parts = [];
  let currId = item?.parentId;
  const guard = new Set();
  while (currId && currId !== "ROOT" && !guard.has(currId)) {
    guard.add(currId);
    const parent = allItems.find((entry) => entry.id === currId);
    if (!parent) break;
    parts.unshift(parent.name);
    currId = parent.parentId;
  }
  return ["This PC", "District Vault", ...parts].join(" > ");
}

export function collectDescendantIds(parentId, allItems = []) {
  const result = [];
  const stack = [parentId];
  const seen = new Set([parentId]);
  while (stack.length > 0) {
    const current = stack.pop();
    const children = allItems.filter((entry) => entry.parentId === current);
    children.forEach((child) => {
      if (seen.has(child.id)) return;
      seen.add(child.id);
      result.push(child.id);
      if (child.kind === "FOLDER") stack.push(child.id);
    });
  }
  return result;
}

export function canMoveItemToTarget(item, targetFolderId, allItems = []) {
  if (!item || !targetFolderId || targetFolderId === RECYCLE_BIN_ID) return false;
  if (item.id === targetFolderId) return false;
  if (item.parentId === targetFolderId) return false;
  if (item.kind === "FOLDER") {
    const descendants = new Set(collectDescendantIds(item.id, allItems));
    if (descendants.has(targetFolderId)) return false;
  }
  return true;
}

export function getUniqueCopyName(originalName = "Untitled", siblingNames = []) {
  const used = new Set((siblingNames || []).map((n) => String(n || "").toLowerCase()));
  const trimmed = String(originalName || "Untitled").trim();
  const dotIdx = trimmed.lastIndexOf(".");
  const hasExt = dotIdx > 0;
  const stem = hasExt ? trimmed.slice(0, dotIdx) : trimmed;
  const ext = hasExt ? trimmed.slice(dotIdx) : "";

  let candidate = `${stem} - Copy${ext}`;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem} - Copy (${counter})${ext}`;
    counter += 1;
  }
  return candidate;
}

export function stripTrashMetadata(entry) {
  const cleaned = { ...entry };
  delete cleaned.isTrashed;
  delete cleaned.trashedAt;
  delete cleaned.trashedRootId;
  delete cleaned.originalParentId;
  delete cleaned.originalPath;
  return cleaned;
}

export function buildCopySubtree(sourceItem, targetParentId, allItems = []) {
  const now = new Date().toISOString();
  const targetSiblingNames = allItems
    .filter((entry) => !entry.isTrashed && entry.parentId === targetParentId)
    .map((entry) => entry.name);
  const needsCopySuffix =
    sourceItem.parentId === targetParentId ||
    targetSiblingNames.some((n) => String(n).toLowerCase() === String(sourceItem.name || "").toLowerCase());

  const cloneBuffer = (buf) => {
    if (!buf) return buf;
    if (buf instanceof ArrayBuffer) return buf.slice(0);
    if (ArrayBuffer.isView(buf)) {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    return buf;
  };

  const makeId = (kind) =>
    `${kind === "FOLDER" ? "fld" : "fil"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const cloned = [];
  const cloneNode = (node, newParentId, overrideName) => {
    const newId = makeId(node.kind);
    const rest = stripTrashMetadata(node);
    cloned.push({
      ...rest,
      id: newId,
      parentId: newParentId,
      name: overrideName || node.name,
      isTrashed: false,
      updatedAt: now,
      data: cloneBuffer(node.data)
    });
    if (node.kind === "FOLDER") {
      allItems
        .filter((child) => child.parentId === node.id && !child.isTrashed)
        .forEach((child) => cloneNode(child, newId));
    }
  };

  cloneNode(
    sourceItem,
    targetParentId,
    needsCopySuffix ? getUniqueCopyName(sourceItem.name, targetSiblingNames) : sourceItem.name
  );
  return cloned;
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

// [OFFICE FONTS] Pre-bundled Hindi & English Office Fonts (DevLys 010 & Times New Roman as primary defaults)
export const OFFICE_FONT_OPTIONS = [
  {
    value: "DevLys 010",
    label: "DevLys 010 (Default Hindi)",
    className: "office-font-devlys",
    stack: "'DevLys 010', 'Kruti Dev 010', sans-serif",
    size: "16pt"
  },
  {
    value: "Times New Roman",
    label: "Times New Roman (Default English)",
    className: "office-font-tnr",
    stack: "'Times New Roman', 'Tinos', Times, serif",
    size: "13pt"
  },
  {
    value: "Kruti Dev 010",
    label: "Kruti Dev 010",
    className: "office-font-kruti",
    stack: "'Kruti Dev 010', 'DevLys 010', sans-serif",
    size: "16pt"
  },
  {
    value: "Noto Sans Devanagari",
    label: "Noto Sans Devanagari (Unicode)",
    className: "office-font-noto",
    stack: "'Noto Sans Devanagari', 'Noto Serif Devanagari', sans-serif",
    size: "13pt"
  },
  {
    value: "Calibri",
    label: "Calibri",
    className: "office-font-calibri",
    stack: "'Calibri', 'Carlito', sans-serif",
    size: "12pt"
  },
  {
    value: "Arial",
    label: "Arial",
    className: "office-font-arial",
    stack: "'Arial', 'Arimo', sans-serif",
    size: "12pt"
  },
  {
    value: "Georgia",
    label: "Georgia",
    className: "office-font-georgia",
    stack: "'Georgia', 'Noto Serif Devanagari', serif",
    size: "13pt"
  }
];

export function getOfficeFontMeta(fontName = "DevLys 010") {
  return OFFICE_FONT_OPTIONS.find((f) => f.value === fontName) || OFFICE_FONT_OPTIONS[0];
}

export function wrapWordDocumentHtml(bodyHtml, title = "Police Office Document", defaultFont = "DevLys 010") {
  const fontMeta = getOfficeFontMeta(defaultFont);

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="hi">
<head>
<meta charset="utf-8" />
<title>${String(title || "").replace(/</g, "&lt;")}</title>
<link href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&family=Carlito:wght@400;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Serif+Devanagari:wght@400;600;700&family=Tinos:wght@400;700&display=swap" rel="stylesheet" />
<style>
  @font-face {
    font-family: 'DevLys 010';
    src: url('/fonts/DevLys010.ttf') format('truetype'), local('DevLys 010'), local('Devlys_010');
    font-display: swap;
  }
  @font-face {
    font-family: 'Kruti Dev 010';
    src: url('/fonts/KrutiDev010.ttf') format('truetype'), local('Kruti Dev 010'), local('KrutiDev010');
    font-display: swap;
  }
  body {
    font-family: ${fontMeta.stack};
    font-size: ${fontMeta.size};
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
