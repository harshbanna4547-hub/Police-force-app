import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { getBeltNo } from "../../shared/commonFunctions";

export function filterEmployeesList(records = [], search = "", gender = "ALL") {
  const byGender = filterEmployeesByGender(records, gender);
  const q = String(search || "").trim();
  if (!q) return byGender;
  return byGender.filter((employee) =>
    matchesEmployeeSearch(employee, q, ["NAME", "FATHER NAME", "CADER", "BELT NO", "POSTING"])
  );
}

export function getEmployeeExportRows(employees = []) {
  return employees.map((employee, index) => ({
    "S.N.": index + 1,
    NAME: employee.NAME || "",
    "FATHER NAME": employee["FATHER NAME"] || "",
    POST: employee.CADER || "",
    "BELT NO": getBeltNo(employee),
    POSTING: employee.POSTING || "",
    DOB: employee["DATE OF BIRTH"] || "",
    MOBILE: employee["MOBILE NO 1"] || employee["MOBILE NO"] || employee.MOBILE || "",
    "POSTING DOB": employee["POSTING DOB NO"] || "",
    "WITHOUT DOB": employee["WITHOUT DOB"] || employee["WITHOUR DOB"] || "",
    EDUCATION: employee.EDUCATION || "",
    DOJ: employee["DATE OF JOINING"] || "",
    DOC: employee.DOC || employee["DATE OF CONFIRMATION"] || ""
  }));
}
