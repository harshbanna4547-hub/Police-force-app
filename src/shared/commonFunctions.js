import {
  calculateEarnedPL,
  formatDateDDMMYYYY,
  parseAnyDate
} from "../utils/reportEngine.js";

export { calculateEarnedPL, formatDateDDMMYYYY, parseAnyDate };

export function calculateServiceYears(startValue, asOfDate = new Date()) {
  const startDate = parseAnyDate(startValue);
  if (!startDate || !(asOfDate instanceof Date) || Number.isNaN(asOfDate.getTime())) return 0;
  const elapsed = asOfDate.getTime() - startDate.getTime();
  return Math.max(0, elapsed / (365.25 * 24 * 60 * 60 * 1000));
}

export function getRankCode(employeeOrRank) {
  const cader = typeof employeeOrRank === "object" && employeeOrRank !== null
    ? `${employeeOrRank.CADER || ""} ${employeeOrRank["BELT NO"] || ""}`
    : String(employeeOrRank || "");
  const normalized = cader.trim().toUpperCase();
  if (/\b(DYSP|DSP)\b|DEPUTY SUPERINTENDENT/.test(normalized)) return "DYSP";
  if (/\bASP\b|ADDITIONAL SP|ADDITIONAL SUPERINTENDENT/.test(normalized)) return "ASP";
  if (/\bRPS\b/.test(normalized)) return "DYSP";
  if (/\bCI\b|\bMTO\b|\bRI\b|INSPECTOR/.test(normalized)) return "CI";
  if (/\bASI\b|ASSISTANT SUB.?INSPECTOR/.test(normalized)) return "ASI";
  if (/\bSI\b|SUB.?INSPECTOR/.test(normalized)) return "SI";
  if (/\bM?HC\b|HEAD CONSTABLE/.test(normalized)) return "HC";
  if (/\bFC\s*\(DR\)|DRIVER|\bDR\b/.test(normalized)) return "FC(DR)";
  if (/\bM?FC\b|\bCT\b|CONSTABLE/.test(normalized)) return "FC";
  return normalized || "OTHER";
}

export function getBeltNo(employee) {
  if (!employee) return "-";
  const direct = employee["BELT NO"] || employee["BELT NO."] || employee.BELT_NO ||
    employee["Belt No"] || employee["Belt No."] || employee.BELT || employee["बेल्ट नं."] ||
    employee["बेल्ट नं"];
  if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
  const cader = String(employee.CADER || "").toUpperCase();
  if (cader.includes("HC") || cader.includes("FC") || cader.includes("CONST")) {
    return String(employee.NAME || "").match(/\b(\d{1,5})\b/)?.[1] || "-";
  }
  return "-";
}

export function filterRecordsByRankAndSearch(
  records,
  { rank = "ALL", search = "", fields = ["CADER", "NAME", "POSTING"], convertText = (value) => value } = {}
) {
  const query = String(search || "").trim().toLocaleLowerCase();
  return (Array.isArray(records) ? records : []).filter((record) => {
    if (rank !== "ALL" && getRankCode(record) !== String(rank).toUpperCase()) return false;
    if (!query) return true;
    return fields.some((field) => {
      const value = record?.[field];
      return String(convertText(value ?? "") || "").toLocaleLowerCase().includes(query);
    });
  });
}

export function appendRowToSheet(setAllSheets, sheetName, row, { prepend = true } = {}) {
  setAllSheets((previous) => {
    const currentRows = Array.isArray(previous[sheetName]) ? previous[sheetName] : [];
    return {
      ...previous,
      [sheetName]: prepend ? [row, ...currentRows] : [...currentRows, row]
    };
  });
}
