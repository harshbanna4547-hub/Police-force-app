import { isDevlysText } from "./isDevlysText";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatSlipValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).split(/(\s+)/).map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    const isUni = /[\u0900-\u097F]/.test(part);
    const cls = isUni ? "unicode-hindi" : isDevlysText(part) ? "devlys" : "english";
    return `<span class="${cls}">${escapeHtml(part)}</span>`;
  }).join("");
}

export function openEmployeeServiceSlip(employee) {
  const slipWindow = window.open("", "_blank");
  if (!slipWindow) {
    window.alert("Service Slip window was blocked. Allow pop-ups and try again.");
    return false;
  }
  const fontUrl = typeof window !== "undefined" ? `${window.location.origin}/fonts/DevLys010.ttf` : "/fonts/DevLys010.ttf";
  const details = [
    ["Name", employee.NAME],
    ["Father Name", employee["FATHER NAME"]],
    ["Post", employee.CADER],
    ["Belt No.", employee["BELT NO"] || employee["BELT NO."]],
    ["Date of Birth", employee["DATE OF BIRTH"]],
    ["Date of Joining", employee["DATE OF JOINING"]],
    ["Posting Place", employee.POSTING],
    ["Posting DOB", employee["POSTING DOB NO"]],
    ["Education", employee.EDUCATION],
    ["Mobile Number", employee["MOBILE NO 1"] || employee["MOBILE NO"] || employee.MOBILE]
  ];
  slipWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Service Slip</title><style>
    @font-face { font-family: 'DevLys 010'; src: url('${fontUrl}') format('truetype'), local('DevLys 010'); }
    body{font-family:'Times New Roman',serif;margin:32px;color:#172033}
    .unicode-hindi{font-family:'Noto Sans Devanagari',sans-serif}
    .devlys{font-family:'DevLys 010',sans-serif;font-size:17px;line-height:1.45}
    .english{font-family:'Times New Roman',Times,serif}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #475569;padding:9px;text-align:left}
    th{width:32%;background:#eef3f8}
    @media print{button{display:none}}
  </style></head><body><h1 class="unicode-hindi">सेवा विवरण / Service Slip</h1><table>${details.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${formatSlipValue(value)}</td></tr>`).join("")}</table><p><button onclick="window.print()">Print Service Slip</button></p></body></html>`);
  slipWindow.document.close();
  return true;
}
