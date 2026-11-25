import { formatDateOnly, getBeltNo } from "../../shared/commonFunctions";

export const SMART_EMPLOYEE_COLUMNS = [
  { key: "SN", label: "S.N.", hiLabel: "क्र.सं." },
  { key: "NAME", label: "Name", hiLabel: "नाम" },
  { key: "FATHER NAME", label: "Father Name", hiLabel: "पिता का नाम" },
  { key: "CADER", label: "Post", hiLabel: "पद" },
  { key: "BELT NO", label: "Belt No.", hiLabel: "बेल्ट नं." },
  { key: "POSTING", label: "Posting Place", hiLabel: "पदस्थापन स्थान" },
  { key: "DATE OF BIRTH", label: "DOB", hiLabel: "जन्म तिथि" },
  { key: "MOBILE", label: "Mobile Number", hiLabel: "मोबाइल नं." },
  { key: "POSTING DOB NO", label: "Posting DOB", hiLabel: "पदस्थापन DOB" },
  { key: "WITHOUT DOB", label: "Without DOB", hiLabel: "बिना DOB" },
  { key: "EDUCATION", label: "Education", hiLabel: "शिक्षा" },
  { key: "DATE OF JOINING", label: "DOJ", hiLabel: "नियुक्ति तिथि" },
  { key: "DOC", label: "DOC", hiLabel: "स्थायीकरण" }
];

export function getEmployeeMobile(employee) {
  const value = employee?.["MOBILE NO 1"] || employee?.["MOBILE NO"] || employee?.MOBILE || employee?.CONTACT || "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "-" || trimmed === "_") return "";
  return trimmed;
}

export function getPhoneHref(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return digits.length >= 6 ? digits : "";
}

export function getEmployeeBelt(employee) {
  return getBeltNo(employee);
}

export function formatEmployeeDateCell(value) {
  return formatDateOnly(value);
}

export function displayEmployeeCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return formatDateOnly(value);
  return String(value);
}
