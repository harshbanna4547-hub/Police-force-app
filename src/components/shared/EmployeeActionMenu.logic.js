export const EMPLOYEE_ACTIONS = [
  { id: "UPDATE", label: "✏️ Update Details" },
  { id: "TRANSFER", label: "🔄 Transfer / Posting" },
  { id: "RELIEVE", label: "🚪 Relieve / Retire / Death" },
  { id: "SERVICE_SLIP", label: "📄 View Service Slip" }
];

export const EMPLOYEE_DETAIL_FIELDS = [
  ["Posting Place", "POSTING"],
  ["Posting DOB", "POSTING DOB NO"],
  ["Without DOB", "WITHOUT DOB"],
  ["Education", "EDUCATION"],
  ["Date of Birth", "DATE OF BIRTH"],
  ["DOJ", "DATE OF JOINING"],
  ["DOC", "DOC"]
];

export function getEmployeePhone(employee) {
  return employee?.["MOBILE NO 1"] || employee?.["MOBILE NO"] || employee?.MOBILE || employee?.CONTACT || "";
}

export function getCallablePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function displayDetailValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
