import {
  calculateEarnedPL,
  formatDateDDMMYYYY,
  getBeltNo,
  getRankCode,
  parseAnyDate
} from "../../shared/commonFunctions.js";
import { isDevlysText } from "../../core/isDevlysText.js";

/* === SUB-TABS & RSR LEAVE CONSTANTS (अवकाश मॉड्यूल उप-टैब एवं आरएसआर नियम) === */
export const LEAVE_SUBTABS = [
  { id: "PL_300", hi: "📒 300 PL Account & Encashment (300 PL लेखा)", en: "📒 300 PL Account & Encashment" },
  { id: "REGISTER", hi: "🗓️ Leave Register & Entry (CL/PL/HPL/CCL/ML)", en: "🗓️ Leave Register & Entry" },
  { id: "TRACKER", hi: "🚨 Overstay / Absentee & Return Tracker (आमद)", en: "🚨 Overstay / Absentee Tracker" }
];

export const RSR_LEAVE_TYPES = [
  { id: "PL", label: "PL — उपार्जित अवकाश (Earned Leave, Max 300)", shortLabel: "PL" },
  { id: "CL", label: "CL — आकस्मिक अवकाश (Casual Leave, 15/Yr)", shortLabel: "CL" },
  { id: "HPL", label: "HPL — अर्ध-वेतन अवकाश (Half Pay, 20/Yr)", shortLabel: "HPL" },
  { id: "COMMUTED", label: "Commuted Leave — परिवर्तित अवकाश (2x HPL)", shortLabel: "Commuted" },
  { id: "ML", label: "ML — मातृत्व अवकाश (Maternity, 180 Days)", shortLabel: "ML" },
  { id: "PL-Pat", label: "PL-Pat — पितृत्व अवकाश (Paternity, 15 Days)", shortLabel: "PL-Pat" },
  { id: "CCL", label: "CCL — संतान पालन अवकाश (730 Days Service)", shortLabel: "CCL" },
  { id: "ABSENT", label: "Absent / LWP — बिना सूचना अनुपस्थित", shortLabel: "Absent" }
];

export const RSR_LIMITS = {
  CL_ANNUAL: 15,
  PL_HALF_YEAR_CREDIT: 15,
  PL_MAX_CAP: 300,
  PL_HALF_YEAR_HEADROOM: 315,
  PL_FY_ENCASHMENT_MAX: 15,
  HPL_ANNUAL: 20,
  ML_MAX_DAYS: 180,
  PATERNITY_MAX_DAYS: 15,
  CCL_CAREER_MAX: 730
};

/* === EMPLOYEE MATCHING & DATE HELPERS (कर्मचारी पहचान व वित्तीय वर्ष) === */
export function getLeaveEmployeeKey(employee) {
  const belt = getBeltNo(employee);
  if (belt !== "-") return `belt:${belt.trim().toUpperCase()}`;
  return `uid:${employee?._uid || `${employee?.NAME || ""}:${employee?.CADER || ""}`}`;
}

export function sameLeaveEmployee(employee, row) {
  const empBelt = getBeltNo(employee);
  const rowBelt = String(row?.["BELT NO"] || "").trim().toUpperCase();
  if (empBelt !== "-" && rowBelt && rowBelt !== "-") {
    return empBelt.trim().toUpperCase() === rowBelt;
  }
  if (employee?._uid && row?._uid) return String(employee._uid) === String(row._uid);
  const empName = String(employee?.NAME || "").trim().toLocaleLowerCase();
  const rowName = String(row?.NAME || "").trim().toLocaleLowerCase();
  return Boolean(empName && rowName && empName === rowName && getRankCode(employee) === getRankCode(row));
}

export function getFinancialYear(dateValue = new Date()) {
  const parsed = dateValue instanceof Date ? dateValue : (parseAnyDate(dateValue) || new Date());
  const yr = parsed.getFullYear();
  const m = parsed.getMonth() + 1;
  const startYr = m >= 4 ? yr : yr - 1;
  return `${startYr}-${String(startYr + 1).slice(-2)}`;
}

function toDayStartTs(dateValue) {
  const dt = dateValue instanceof Date ? dateValue : parseAnyDate(dateValue);
  if (!dt || Number.isNaN(dt.getTime())) return NaN;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
}

export function calculateLeaveDaysBetween(fromVal, toVal) {
  const fromTs = toDayStartTs(fromVal);
  const toTs = toDayStartTs(toVal);
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || toTs < fromTs) return 0;
  return Math.floor((toTs - fromTs) / 86400000) + 1;
}

/* === 300 PL ENGINE: SEMI-ANNUAL (+15/+15), 300+15 CAP, ENCASHMENT & PASSBOOK === */
export function getLeaveBalance(employee, leaveRows = [], asOfDate = new Date()) {
  const rows = (Array.isArray(leaveRows) ? leaveRows : []).filter((row) => sameLeaveEmployee(employee, row));
  const currentFy = getFinancialYear(asOfDate);

  let used = 0;
  let encashed = 0;
  let fyEncashedDays = 0;
  let manualCredits = 0;

  rows.forEach((row) => {
    const type = String(row.LEAVE_TYPE || "").trim().toUpperCase();
    const qty = Number(row.DAYS_TAKEN ?? row.DAYS ?? 0) || 0;
    if (type === "PL_CREDIT") {
      manualCredits += qty;
    } else if (type === "PL_ENCASHMENT") {
      encashed += qty;
      const rowFy = row.FINANCIAL_YEAR || getFinancialYear(row.FROM_DATE || row.ORDER_DATE || asOfDate);
      if (rowFy === currentFy) fyEncashedDays += qty;
    } else if (!type || type === "PL") {
      used += qty;
    }
  });

  const earnedBase = calculateEarnedPL(employee?.["DATE OF JOINING"], asOfDate);
  const earned = earnedBase + manualCredits;
  const rawBalance = earned - used - encashed;
  const balance = Math.max(0, Math.min(RSR_LIMITS.PL_MAX_CAP, rawBalance));

  return {
    earned,
    used,
    encashed,
    manualCredits,
    rawBalance,
    balance,
    fyEncashedDays,
    fyEncashmentRemaining: Math.max(0, RSR_LIMITS.PL_FY_ENCASHMENT_MAX - fyEncashedDays),
    isAtMaxCap: rawBalance >= RSR_LIMITS.PL_MAX_CAP,
    overflowDays: Math.max(0, rawBalance - RSR_LIMITS.PL_MAX_CAP),
    retirementEncashmentDays: balance
  };
}

export function buildEmployeePlPassbook(employee, leaveRows = [], asOfDate = new Date()) {
  const joined = parseAnyDate(employee?.["DATE OF JOINING"]);
  const events = [];

  if (joined && joined <= asOfDate) {
    for (let yr = joined.getFullYear(); yr <= asOfDate.getFullYear(); yr += 1) {
      for (const month of [0, 6]) {
        const creditDate = new Date(yr, month, 1);
        if (creditDate >= joined && creditDate <= asOfDate) {
          events.push({
            ts: creditDate.getTime(),
            date: formatDateDDMMYYYY(creditDate),
            particular: month === 0 ? `अर्धवार्षिक PL जमा (1 जनवरी ${yr})` : `अर्धवार्षिक PL जमा (1 जुलाई ${yr})`,
            orderNo: "RSR Rule 91 (Auto)",
            credit: RSR_LIMITS.PL_HALF_YEAR_CREDIT,
            debit: 0,
            entryType: "AUTO_CREDIT"
          });
        }
      }
    }
  }

  (Array.isArray(leaveRows) ? leaveRows : [])
    .filter((row) => sameLeaveEmployee(employee, row))
    .forEach((row) => {
      const type = String(row.LEAVE_TYPE || "").trim().toUpperCase();
      if (type && !["PL", "PL_CREDIT", "PL_ENCASHMENT"].includes(type)) return;
      const qty = Number(row.DAYS_TAKEN ?? row.DAYS ?? 0) || 0;
      if (!qty) return;
      const dt = parseAnyDate(row.FROM_DATE || row.ORDER_DATE) || asOfDate;
      const isCredit = type === "PL_CREDIT";
      const label = type === "PL_ENCASHMENT"
        ? `PL नकदीकरण (FY ${row.FINANCIAL_YEAR || getFinancialYear(dt)})`
        : isCredit
          ? (row.REMARK || "मैनुअल PL जमा")
          : `PL उपभोग (${row.FROM_DATE || "-"} से ${row.TO_DATE || "-"})`;

      events.push({
        ts: dt.getTime(),
        date: formatDateDDMMYYYY(dt),
        particular: label,
        orderNo: row.ORDER_NO_DATE || row.ORDER || "-",
        credit: isCredit ? qty : 0,
        debit: isCredit ? 0 : qty,
        entryType: type || "PL"
      });
    });

  events.sort((a, b) => a.ts - b.ts);
  let running = 0;
  return events.map((ev) => {
    if (ev.entryType === "AUTO_CREDIT") {
      // Under RSR 300+15 rule, unavailed credit above 300 from prior half-year lapses at rollover
      running = Math.min(RSR_LIMITS.PL_MAX_CAP, running) + ev.credit;
    } else {
      running = Math.max(0, running + ev.credit - ev.debit);
    }
    const capped = Math.min(RSR_LIMITS.PL_MAX_CAP, running);
    return {
      ...ev,
      rawRunning: running,
      balance: capped,
      capWarning: running > RSR_LIMITS.PL_MAX_CAP
    };
  });
}

export function calculateRetirementEncashment(plBalance, basicPay = 0, daPercent = 53) {
  const encashableDays = Math.min(RSR_LIMITS.PL_MAX_CAP, Math.max(0, Number(plBalance || 0)));
  const pay = Number(basicPay || 0);
  const da = Number(daPercent || 0);
  const dailyEmolument = pay > 0 ? (pay * (1 + da / 100)) / 30 : 0;
  return {
    encashableDays,
    estimatedAmount: Math.round(dailyEmolument * encashableDays)
  };
}

/* === ALL RSR LEAVE BALANCES (CL / PL / HPL / ML / PL-Pat / CCL) === */
export function getRsrLeaveBalances(employee, leaveRows = [], asOfDate = new Date()) {
  const rows = (Array.isArray(leaveRows) ? leaveRows : []).filter((row) => sameLeaveEmployee(employee, row));
  const currentYear = String(asOfDate.getFullYear());
  const pl = getLeaveBalance(employee, leaveRows, asOfDate);

  const joined = parseAnyDate(employee?.["DATE OF JOINING"]);
  const serviceYears = joined && joined <= asOfDate
    ? Math.floor((asOfDate - joined) / (365.25 * 86400000))
    : 0;
  const hplEarned = Math.max(0, serviceYears * RSR_LIMITS.HPL_ANNUAL);

  let clUsed = 0;
  let hplUsed = 0;
  let mlUsed = 0;
  let patUsed = 0;
  let cclUsed = 0;

  rows.forEach((row) => {
    const type = String(row.LEAVE_TYPE || "").trim().toUpperCase();
    const qty = Number(row.DAYS_TAKEN ?? row.DAYS ?? 0) || 0;
    const rowYr = String(row.LEAVE_YEAR || "").trim() || (parseAnyDate(row.FROM_DATE)?.getFullYear()?.toString() || "");
    if (type === "CL" && rowYr === currentYear) clUsed += qty;
    else if (type === "HPL") hplUsed += qty;
    else if (type === "COMMUTED") hplUsed += qty * 2;
    else if (type === "ML") mlUsed += qty;
    else if (type === "PL-PAT" || type === "PATERNITY") patUsed += qty;
    else if (type === "CCL") cclUsed += qty;
  });

  return {
    PL: pl.balance,
    CL: { used: clUsed, remaining: Math.max(0, RSR_LIMITS.CL_ANNUAL - clUsed), limit: RSR_LIMITS.CL_ANNUAL },
    HPL: { earned: hplEarned, used: hplUsed, remaining: Math.max(0, hplEarned - hplUsed) },
    ML: { used: mlUsed, limitPerSpell: RSR_LIMITS.ML_MAX_DAYS },
    "PL-Pat": { used: patUsed, limitPerSpell: RSR_LIMITS.PATERNITY_MAX_DAYS },
    CCL: { used: cclUsed, remaining: Math.max(0, RSR_LIMITS.CCL_CAREER_MAX - cclUsed), limit: RSR_LIMITS.CCL_CAREER_MAX }
  };
}

/* === OVERSTAY / ABSENTEE & RETURN TRACKER === */
export function buildOverstayTracker(leaveRows = [], asOfDate = new Date()) {
  const todayStart = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate()).getTime();
  const onLeaveToday = [];
  const returningToday = [];
  const overstayAbsent = [];

  (Array.isArray(leaveRows) ? leaveRows : []).forEach((row, index) => {
    const type = String(row.LEAVE_TYPE || "").trim().toUpperCase();
    if (["PL_CREDIT", "PL_ENCASHMENT"].includes(type)) return;
    if (String(row.RETURN_STATUS || "").toUpperCase() === "RETURNED") return;

    const fromTs = toDayStartTs(row.FROM_DATE);
    const toTs = toDayStartTs(row.TO_DATE);
    const entry = { ...row, _rowIndex: index };

    if (type === "ABSENT" || (Number.isFinite(toTs) && toTs < todayStart)) {
      const overdueDays = Number.isFinite(toTs) ? Math.max(1, Math.round((todayStart - toTs) / 86400000)) : 1;
      overstayAbsent.push({ ...entry, overdueDays });
    } else if (Number.isFinite(toTs) && toTs === todayStart) {
      returningToday.push(entry);
    } else if (Number.isFinite(fromTs) && Number.isFinite(toTs) && fromTs <= todayStart && toTs >= todayStart) {
      onLeaveToday.push(entry);
    }
  });

  return { onLeaveToday, returningToday, overstayAbsent };
}

/* === OFFICIAL LEAVE SANCTION / DISPATCH ORDER HTML (अवकाश स्वीकृति आदेश) === */
function escapeHtml(val) {
  return String(val ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

function formatCellHtml(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  if (/[\u0900-\u097F]/.test(raw)) return `<span style="font-family:'Noto Sans Devanagari',sans-serif">${escapeHtml(raw)}</span>`;
  if (isDevlysText(raw)) return `<span style="font-family:'DevLys 010','Kruti Dev 010',sans-serif;font-size:17px">${escapeHtml(raw)}</span>`;
  return `<span style="font-family:'Times New Roman',serif">${escapeHtml(raw)}</span>`;
}

export function buildLeaveOrderHtml(entry, employee = {}, districtName = "Chittorgarh") {
  const title = entry.LEAVE_TYPE === "PL_ENCASHMENT"
    ? "उपार्जित अवकाश (PL) नकदीकरण स्वीकृति आदेश"
    : "अवकाश स्वीकृति एवं रवानगी आदेश";

  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    @font-face{font-family:'DevLys 010';src:url('/fonts/DevLys010.ttf') format('truetype');font-display:swap;}
    body{font-family:'Times New Roman',serif;padding:28px;color:#111}
    h2,h3{text-align:center;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border:1px solid #334155;padding:8px 10px;text-align:left}
    th{width:34%;background:#f1f5f9}
    .sign{margin-top:46px;text-align:right;font-weight:bold}
  </style></head>
  <body>
    <h2>कार्यालय पुलिस अधीक्षक, ${escapeHtml(districtName)}</h2>
    <h3>${escapeHtml(title)}</h3>
    <table>
      <tr><th>कर्मचारी का नाम</th><td>${formatCellHtml(entry.NAME || employee.NAME)}</td></tr>
      <tr><th>पद / बेल्ट नं.</th><td>${escapeHtml(employee.CADER || entry.CADER || "-")} / ${escapeHtml(entry["BELT NO"] || "-")}</td></tr>
      <tr><th>वर्तमान पदस्थापन</th><td>${formatCellHtml(employee.POSTING || entry.POSTING)}</td></tr>
      <tr><th>अवकाश / प्रविष्टि प्रकार</th><td>${escapeHtml(entry.LEAVE_TYPE)}</td></tr>
      <tr><th>अवधि / दिवस</th><td>${escapeHtml(entry.FROM_DATE || "-")} से ${escapeHtml(entry.TO_DATE || "-")} (${escapeHtml(entry.DAYS_TAKEN)} दिन)</td></tr>
      <tr><th>DOB / आदेश संख्या</th><td>${escapeHtml(entry.ORDER_NO_DATE || "-")}</td></tr>
      <tr><th>विवरण / रिमार्क</th><td>${formatCellHtml(entry.REMARK || "-")}</td></tr>
    </table>
    <p class="sign">पुलिस अधीक्षक / सक्षम प्राधिकारी<br/>${escapeHtml(districtName)}</p>
  </body></html>`;
}
