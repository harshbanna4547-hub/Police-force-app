import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";

export const ARCHIVE_TYPES = [
  "Retirement",
  "Relieve / Other District Transfer",
  "Death",
  "Deputation"
];

export function formatArchiveDay(value) {
  if (!value) return "-";
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text.split(/[T ]/)[0];
}

export function filterArchiveCandidates(records = [], query = "", gender = "ALL") {
  const byGender = filterEmployeesByGender(records, gender);
  const q = String(query || "").trim();
  if (!q) return byGender.slice(0, 25);
  return byGender.filter((employee) =>
    matchesEmployeeSearch(employee, q, ["NAME", "BELT NO", "CADER", "POSTING"])
  ).slice(0, 25);
}

export function filterArchivedRows(archiveRows = [], year = "", query = "", gender = "ALL") {
  return filterEmployeesByGender(archiveRows, gender).filter((row) => {
    if (year && String(row.YEAR || row.EVENT_DATE || "").slice(0, 4) !== year) return false;
    if (!query.trim()) return true;
    return matchesEmployeeSearch(row, query, ["NAME", "FATHER NAME", "BELT NO", "CADER", "POSTING", "EVENT_TYPE", "REASON"]);
  });
}
