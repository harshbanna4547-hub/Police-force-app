import { filterEmployeesByGender } from "../../forceLogic";

export function filterModuleRecords(records = [], search = "", gender = "ALL") {
  const query = String(search || "").trim().toLocaleLowerCase();
  return filterEmployeesByGender(records, gender).filter((record) => (
    !query || Object.values(record).some((value) =>
      ["string", "number"].includes(typeof value) &&
      String(value).toLocaleLowerCase().includes(query)
    )
  ));
}

export function getModuleExportRows(records = []) {
  return records.map((record) => Object.fromEntries(
    Object.entries(record).filter(([key, value]) =>
      !key.startsWith("_") && (value === null || ["string", "number", "boolean"].includes(typeof value) || value instanceof Date)
    )
  ));
}
