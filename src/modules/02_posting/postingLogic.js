import { resolveUnitAndChowki } from "../../core/postingResolver";
import { CO_PS_MAP, OFFICE_SECTIONS } from "../../data/officeUnits";
import { filterEmployeesByGender, matchesEmployeeSearch, matchEmployeeToUnit } from "../../forceLogic";
import { mapRankToCode } from "../../data/cadreConfig";
import { getBeltNo } from "../../shared/commonFunctions";

export const POST_ORDER = ["SP", "ASP", "DySP", "CI", "SI", "ASI", "HC", "FC", "FC(DR)"];
const OFFICIAL_UNITS = OFFICE_SECTIONS.flatMap((section) => section.units);

export function rankOf(employee) {
  const code = mapRankToCode(employee?.CADER || "", getBeltNo(employee));
  if (code === "SP") return "SP";
  if (code === "ASP") return "ASP";
  if (code === "DYSP") return "DySP";
  if (code === "CI" || code === "MTO") return "CI";
  if (code === "SI" || code.startsWith("SI_")) return "SI";
  if (code === "ASI" || code.startsWith("ASI_")) return "ASI";
  if (code === "HC" || code.endsWith("_HC")) return "HC";
  if (code === "MT_CT") return "FC(DR)";
  if (code === "CT" || code.endsWith("_CT")) return "FC";
  return "Other";
}

export function placeOf(employee) {
  const rawPosting = String(employee?.POSTING || "").trim();
  if (!rawPosting) return "अज्ञात पदस्थापन";
  const { unit } = resolveUnitAndChowki(rawPosting);
  return (
    OFFICIAL_UNITS.find((knownUnit) => matchEmployeeToUnit(rawPosting, knownUnit)) ||
    OFFICIAL_UNITS.find((knownUnit) => unit && matchEmployeeToUnit(unit, knownUnit)) ||
    unit ||
    rawPosting
  );
}

export function buildPostingGroups(records = [], search = "", gender = "ALL") {
  const filtered = filterEmployeesByGender(records, gender).filter((employee) =>
    !search.trim() || matchesEmployeeSearch(employee, search, ["NAME", "FATHER NAME", "CADER", "BELT NO", "POSTING"])
  );

  const placeMap = filtered.reduce((map, employee) => {
    const place = placeOf(employee);
    (map[place] ||= []).push(employee);
    return map;
  }, {});

  const assigned = new Set(OFFICIAL_UNITS);
  const sections = OFFICE_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    units: section.units.map((unit) => [unit, placeMap[unit] || []])
  }));

  const otherUnits = Object.entries(placeMap).filter(([unit]) => !assigned.has(unit));
  if (otherUnits.length > 0) {
    sections.push({
      id: "OTHER",
      title: "अन्य पदस्थापन (Other Postings)",
      units: otherUnits
    });
  }

  return { filtered, placeMap, sections, coMap: CO_PS_MAP };
}
