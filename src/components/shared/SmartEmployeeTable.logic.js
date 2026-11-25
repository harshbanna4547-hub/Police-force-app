export const SMART_EMPLOYEE_COLUMNS = [
  { key: "SN", label: "S.N." },
  { key: "NAME", label: "Name" },
  { key: "FATHER NAME", label: "Father Name" },
  { key: "CADER", label: "Post" },
  { key: "BELT NO", label: "Belt No." },
  { key: "POSTING", label: "Posting Place" },
  { key: "DATE OF BIRTH", label: "DOB" },
  { key: "MOBILE", label: "Mobile Number" },
  { key: "POSTING DOB NO", label: "Posting DOB" },
  { key: "WITHOUT DOB", label: "Without DOB" },
  { key: "EDUCATION", label: "Education" },
  { key: "DATE OF JOINING", label: "DOJ" },
  { key: "DOC", label: "DOC" }
];

export function getEmployeeMobile(employee) {
  return employee?.["MOBILE NO 1"] || employee?.["MOBILE NO"] || employee?.MOBILE || employee?.CONTACT || "";
}

export function getPhoneHref(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function displayEmployeeCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
