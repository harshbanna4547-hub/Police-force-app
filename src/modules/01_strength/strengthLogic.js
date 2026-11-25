import { getBeltNo, getRankCode } from "../../shared/commonFunctions";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";

export const POST_FILTER_TABS = [
  { id: "ALL", label: "सभी पद (ALL)", enLabel: "All Posts", groupIds: null },
  { id: "SP", label: "SP", enLabel: "SP", groupIds: ["IPS_OFFICERS"] },
  { id: "ASP", label: "ASP", enLabel: "ASP", groupIds: ["RPS_OFFICERS"], rankFilter: ["ASP"] },
  { id: "DYSP", label: "DySP", enLabel: "DySP", groupIds: ["RPS_OFFICERS"], rankFilter: ["DYSP"] },
  { id: "CI", label: "CI / MTO", enLabel: "CI / MTO", groupIds: ["CI_GROUP"] },
  { id: "SI", label: "SI", enLabel: "SI", groupIds: ["SI_GROUP"] },
  { id: "ASI", label: "ASI", enLabel: "ASI", groupIds: ["ASI_GROUP"] },
  { id: "HC", label: "HC", enLabel: "HC", groupIds: ["HC_GROUP"] },
  { id: "FC", label: "FC", enLabel: "FC", groupIds: ["FC_GROUP"] },
  { id: "MINISTERIAL", label: "मंत्रालयिक संवर्ग (Ministerial)", enLabel: "Ministerial Cadre", groupIds: ["MINISTERIAL_CADRE"] },
  { id: "ACCOUNTS", label: "लेखा संवर्ग (Accounts)", enLabel: "Accounts Cadre", groupIds: ["ACCOUNTS_CADRE"] },
  { id: "IT", label: "आईटी संवर्ग (IT)", enLabel: "IT Cadre", groupIds: ["IT_CADRE"] },
  { id: "CLASS_4", label: "चतुर्थ श्रेणी संवर्ग (Class-IV)", enLabel: "Class-IV Cadre", groupIds: ["CLASS_4_CADRE"] }
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
