import { formatDateOnly } from "../../shared/commonFunctions";

export const EMPLOYEE_ACTIONS = [
  { id: "UPDATE", label: "✏️ Update Details", hiLabel: "✏️ विवरण अपडेट करें" },
  { id: "TRANSFER", label: "🔄 Transfer / Posting", hiLabel: "🔄 स्थानांतरण / पदस्थापन" },
  { id: "RELIEVE", label: "🚪 Relieve / Retire / Death", hiLabel: "🚪 रिलीव / सेवानिवृत्ति / मृत्यु" },
  { id: "SERVICE_SLIP", label: "📄 View Service Slip", hiLabel: "📄 सेवा विवरण पर्ची देखें" }
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
  const value = employee?.["MOBILE NO 1"] || employee?.["MOBILE NO"] || employee?.MOBILE || employee?.CONTACT || "";
  const trimmed = String(value).trim();
  return !trimmed || trimmed === "-" || trimmed === "_" ? "" : trimmed;
}

export function getCallablePhone(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return digits.length >= 6 ? digits : "";
}

export function displayDetailValue(value, key = "") {
  if (value === null || value === undefined || value === "") return "-";
  if (/DATE|DOB|DOC/i.test(key) && key !== "WITHOUT DOB") return formatDateOnly(value);
  if (value instanceof Date) return formatDateOnly(value);
  return String(value);
}
