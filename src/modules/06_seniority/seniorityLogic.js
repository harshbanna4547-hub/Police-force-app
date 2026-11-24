import { getRankCode, parseAnyDate } from "../../shared/commonFunctions";

const RANK_ORDER = ["CI", "SI", "ASI", "HC", "FC"];

function dateValue(value) {
  return parseAnyDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function sortSeniorityRows(rows, rank = "ALL") {
  const filtered = rank === "ALL"
    ? rows || []
    : (rows || []).filter((row) => getRankCode(row) === rank);
  return [...filtered].sort((a, b) => {
    const aRank = RANK_ORDER.indexOf(getRankCode(a));
    const bRank = RANK_ORDER.indexOf(getRankCode(b));
    return (aRank - bRank) ||
      (dateValue(a["DATE OF JOINING"]) - dateValue(b["DATE OF JOINING"])) ||
      String(a["BELT NO"] || "").localeCompare(String(b["BELT NO"] || ""), undefined, { numeric: true });
  });
}
