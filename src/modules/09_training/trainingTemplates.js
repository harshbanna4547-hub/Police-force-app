function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const BASE_STYLE = `
  @page{size:A4 landscape;margin:15mm}
  body{font-family:'Times New Roman',Times,serif;color:#111}
  .hindi{font-family:'DevLys 010','Kruti Dev 010','Times New Roman',serif}
  h2,h3{text-align:center}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #222;padding:7px;text-align:left}
  th{width:32%}
`;

function documentShell(title, body) {
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${BASE_STYLE}</style></head><body>${body}</body></html>`;
}

export const TRAINING_DOCUMENTS = [
  { id: "WIRELESS", label: "बेतार / ई-मेल नामांकन संदेश" },
  { id: "DISPATCH", label: "रवानगी आदेश" },
  { id: "EXEMPTION", label: "मुक्ति पत्र (Exemption)" },
  { id: "REPLACEMENT", label: "प्रतिस्थापन आदेश (Replacement)" }
];

export function renderTrainingDocument(type, nomination, instructions = "") {
  const rows = [
    ["नाम", nomination.NAME],
    ["पिता का नाम", nomination["FATHER NAME"]],
    ["पद", nomination.CADER],
    ["बेल्ट नं.", nomination["BELT NO"]],
    ["वर्तमान पदस्थापन", nomination.POSTING],
    ["शैक्षणिक योग्यता", nomination.EDUCATION],
    ["जन्मतिथि", nomination.DOB],
    ["मोबाइल नं.", nomination.MOBILE],
    ["ई-मेल", nomination.EMAIL]
  ];
  const employeeTable = `<table>${rows.map(([label, value], index) =>
    `<tr><th>${index + 1}. ${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`
  ).join("")}</table>`;
  const courseDetails = `<p>प्रशिक्षण विषय: ${escapeHtml(nomination.COURSE_NAME)} | संस्थान: ${escapeHtml(nomination.INSTITUTE)} | अवधि: ${escapeHtml(nomination.FROM_DATE)} से ${escapeHtml(nomination.TO_DATE)}</p>`;

  if (type === "WIRELESS") {
    return documentShell("बेतार / ई-मेल नामांकन संदेश",
      `<h2 class="hindi">बेतार / ई-मेल नामांकन संदेश</h2><p class="hindi">विषय: ${escapeHtml(nomination.COURSE_NAME)} हेतु नामांकन</p>${employeeTable}${courseDetails}`
    );
  }
  if (type === "DISPATCH") {
    return documentShell("प्रशिक्षण रवानगी आदेश",
      `<h2 class="hindi">कार्यालय पुलिस अधीक्षक</h2><h3 class="hindi">प्रशिक्षण हेतु रवानगी आदेश</h3>${employeeTable}${courseDetails}<p class="hindi">निर्देश: प्रशिक्षणार्थी वर्किंग यूनिफॉर्म, सिविल ड्रेस एवं सफेद पीटी ड्रेस साथ लेकर उपस्थित हों। नियमानुसार मेस एडवांस/भत्ता की व्यवस्था करें। ${escapeHtml(instructions)}</p><p class="hindi">थानाधिकारी / संचित निरीक्षक कृपया रवानगी सुनिश्चित करें।</p><p style="margin-top:48px;text-align:right">पुलिस अधीक्षक</p>`
    );
  }
  if (type === "EXEMPTION") {
    return documentShell("प्रशिक्षण से मुक्ति पत्र",
      `<h2 class="hindi">प्रशिक्षण से मुक्ति / Exemption पत्र</h2>${employeeTable}${courseDetails}<p class="hindi">मुक्ति का कारण: ${escapeHtml(instructions || "—")}</p><p style="margin-top:48px;text-align:right">सक्षम अधिकारी</p>`
    );
  }
  if (type === "REPLACEMENT") {
    return documentShell("प्रतिस्थापन आदेश",
      `<h2 class="hindi">प्रशिक्षणार्थी प्रतिस्थापन आदेश</h2>${employeeTable}${courseDetails}<p class="hindi">प्रतिस्थापन / आदेश संबंधी विवरण: ${escapeHtml(instructions || "—")}</p><p style="margin-top:48px;text-align:right">पुलिस अधीक्षक</p>`
    );
  }
  throw new Error(`Unknown training document type: ${type}`);
}
