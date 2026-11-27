import { getBeltNo, getRankCode } from "../../shared/commonFunctions.js";
import { filterEmployeesByGender, getEmployeeGender, matchesEmployeeSearch } from "../../forceLogic.js";

export const POST_FILTER_TABS = [
  { id: "ALL", group: "EXECUTIVE", label: "सभी पद (ALL)", enLabel: "All Posts", groupIds: null },
  { id: "SP", group: "EXECUTIVE", label: "SP", enLabel: "SP", groupIds: ["IPS_OFFICERS"] },
  { id: "ASP", group: "EXECUTIVE", label: "ASP", enLabel: "ASP", groupIds: ["RPS_OFFICERS"], rankFilter: ["ASP"] },
  { id: "DYSP", group: "EXECUTIVE", label: "DySP", enLabel: "DySP", groupIds: ["RPS_OFFICERS"], rankFilter: ["DYSP"] },
  { id: "CI", group: "EXECUTIVE", label: "CI / MTO", enLabel: "CI / MTO", groupIds: ["CI_GROUP"] },
  { id: "SI", group: "EXECUTIVE", label: "SI", enLabel: "SI", groupIds: ["SI_GROUP"] },
  { id: "ASI", group: "EXECUTIVE", label: "ASI", enLabel: "ASI", groupIds: ["ASI_GROUP"] },
  { id: "HC", group: "EXECUTIVE", label: "HC", enLabel: "HC", groupIds: ["HC_GROUP"] },
  { id: "FC", group: "EXECUTIVE", label: "FC", enLabel: "FC", groupIds: ["FC_GROUP"] },
  { id: "MINISTERIAL", group: "SUPPORT", label: "मंत्रालयिक संवर्ग", enLabel: "Ministerial Cadre", groupIds: ["MINISTERIAL_CADRE"] },
  { id: "ACCOUNTS", group: "SUPPORT", label: "लेखा संवर्ग", enLabel: "Accounts Cadre", groupIds: ["ACCOUNTS_CADRE"] },
  { id: "IT", group: "SUPPORT", label: "आईटी संवर्ग", enLabel: "IT Cadre", groupIds: ["IT_CADRE"] },
  { id: "CLASS_4", group: "SUPPORT", label: "चतुर्थ श्रेणी संवर्ग", enLabel: "Class-IV Cadre", groupIds: ["CLASS_4_CADRE"] }
];

export function formatVacancy(sanc, work) {
  const diff = Number(sanc || 0) - Number(work || 0);
  if (diff < 0) return `+${Math.abs(diff)}`;
  return diff;
}

export function getStrengthEmployeeIdentity(employee) {
  return {
    beltNo: getBeltNo(employee),
    rankCode: getRankCode(employee)
  };
}

export function filterStrengthRecords(records, search = "", gender = "ALL") {
  const byGender = filterEmployeesByGender(records || [], gender);
  const query = String(search || "").trim();
  if (!query) return byGender;
  return byGender.filter((record) =>
    matchesEmployeeSearch(record, query, ["NAME", "FATHER NAME", "CADER", "POSTING", "BELT NO"])
  );
}

export const CASTE_CATEGORIES = ["GEN", "OBC", "MBC", "EWS", "SC", "ST", "UNSPECIFIED"];

export function normalizeCasteCategory(record = {}) {
  const raw = String(
    record["CAST CATEGORY"] ??
    record.CATEGORY ??
    record.CAT ??
    record.CASTE ??
    record["GEN/OBC"] ??
    ""
  )
    .trim()
    .toUpperCase();

  if (!raw) return "UNSPECIFIED";
  if (raw === "GENERAL" || raw === "UR" || raw === "GEN") return "GEN";
  if (raw.includes("OBC")) return "OBC";
  if (raw.includes("MBC") || raw.includes("SBC")) return "MBC";
  if (raw.includes("EWS")) return "EWS";
  if (raw === "SC" || raw.includes("SCHEDULED CASTE")) return "SC";
  if (raw === "ST" || raw.includes("SCHEDULED TRIBE") || raw.includes("TSP")) return "ST";
  return "UNSPECIFIED";
}

function getRankBucket(rankCode) {
  if (["SP", "ASP", "DYSP", "CI"].includes(rankCode)) return "OFFICERS";
  if (["SI", "ASI"].includes(rankCode)) return "SUPERVISORY";
  if (rankCode === "HC") return "HC";
  if (["FC", "FC_DR"].includes(rankCode)) return "FC";
  return "SUPPORT";
}

/**
 * [CALCULATION] Builds Category-wise (GEN, OBC, MBC, EWS, SC, ST) Rank & Gender breakdown
 */
export function buildCasteStrengthSummary(records = []) {
  const list = Array.isArray(records) ? records : [];
  const totalCount = list.length;

  const rowsByCategory = {};
  CASTE_CATEGORIES.forEach((cat) => {
    rowsByCategory[cat] = {
      category: cat,
      male: 0,
      female: 0,
      otherGender: 0,
      total: 0,
      ranks: { OFFICERS: 0, SUPERVISORY: 0, HC: 0, FC: 0, SUPPORT: 0 },
      employees: []
    };
  });

  list.forEach((rec) => {
    const cat = normalizeCasteCategory(rec);
    const bucket = rowsByCategory[cat];
    const gender = getEmployeeGender(rec);
    const rankBucket = getRankBucket(getRankCode(rec));

    bucket.total += 1;
    bucket.ranks[rankBucket] += 1;
    bucket.employees.push(rec);
    if (gender === "MALE") bucket.male += 1;
    else if (gender === "FEMALE") bucket.female += 1;
    else bucket.otherGender += 1;
  });

  return CASTE_CATEGORIES.map((cat) => {
    const row = rowsByCategory[cat];
    return {
      ...row,
      sharePct: totalCount > 0 ? ((row.total / totalCount) * 100).toFixed(1) : "0.0"
    };
  });
}
