import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";

export function filterModuleRecords(records = [], search = "", gender = "ALL") {
  const genderFiltered = filterEmployeesByGender(records, gender);
  const q = String(search || "").trim();
  if (!q) return genderFiltered;

  return genderFiltered.filter((record) => {
    const keys = Object.keys(record || {}).filter((k) => !k.startsWith("_"));
    return matchesEmployeeSearch(record, q, keys);
  });
}

export function getModuleExportRows(records = []) {
  return (Array.isArray(records) ? records : []).map((record) => Object.fromEntries(
    Object.entries(record).filter(([key, value]) =>
      !key.startsWith("_") &&
      (value === null || ["string", "number", "boolean"].includes(typeof value) || value instanceof Date)
    )
  ));
}
