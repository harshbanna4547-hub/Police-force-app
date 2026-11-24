import { mapRankToCode } from "../../data/cadreConfig.js";

export const TRANSFER_RANKS = ["ALL", "CI", "SI", "ASI", "HC", "FC"];

export const TRANSFER_REMARKS = ["प्रशासनिक", "स्वयं के व्यय पर"];

export function getTransferEmployeeKey(employee, index) {
  return String(employee?._uid || `${employee?.["BELT NO"] || "employee"}-${index}`);
}

export function normalizeTransferDateInput(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return "";
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

export function parsePostingDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 20000 || value > 100000) return null;
    const utcDate = new Date(Math.round((value - 25569) * 86400000));
    return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
  }

  const text = String(value).trim();
  const dmyMatch = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const normalized = normalizeTransferDateInput(`${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`);
    if (!normalized) return null;
    const [day, month, year] = normalized.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatTransferDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

export function getCompletedTenureYears(startValue, asOfDate = new Date()) {
  const startDate = parsePostingDate(startValue);
  if (!startDate || !(asOfDate instanceof Date) || Number.isNaN(asOfDate.getTime())) return null;

  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  if (startDate > today) return 0;

  let years = today.getFullYear() - startDate.getFullYear();
  const anniversaryMonth = startDate.getMonth();
  const anniversaryYear = startDate.getFullYear() + years;
  const daysInAnniversaryMonth = new Date(anniversaryYear, anniversaryMonth + 1, 0).getDate();
  const anniversary = new Date(
    anniversaryYear,
    anniversaryMonth,
    Math.min(startDate.getDate(), daysInAnniversaryMonth)
  );
  if (today < anniversary) years -= 1;
  return Math.max(0, years);
}

export function getTransferRank(employee, convertLegacy = (value) => value) {
  const cader = convertLegacy(employee?.CADER || "");
  const belt = convertLegacy(employee?.["BELT NO"] || "");
  const rankText = `${cader} ${belt}`.toUpperCase();
  if (rankText.includes("सहायक उप निरीक्षक") || /\bASI\b/.test(rankText)) return "ASI";
  if (rankText.includes("उप निरीक्षक") || /SUB.?INSPECTOR|\bSI\b/.test(rankText)) return "SI";
  if (rankText.includes("निरीक्षक") || /INSPECTOR|\bCI\b|\bMTO\b/.test(rankText)) return "CI";
  if (rankText.includes("हैड") || /HEAD CONSTABLE|\bHC\b/.test(rankText)) return "HC";
  if (rankText.includes("कानिस्टेबल") || rankText.includes("कांस्टेबल") || /CONSTABLE|\bFC\b|\bCT\b/.test(rankText)) {
    return "FC";
  }

  const code = mapRankToCode(cader, belt);
  if (code === "CI" || code === "MTO") return "CI";
  if (code === "SI" || code.startsWith("SI_")) return "SI";
  if (code === "ASI" || code.startsWith("ASI_")) return "ASI";
  if (code === "HC" || code.endsWith("_HC")) return "HC";
  if (code === "CT" || code.endsWith("_CT")) return "FC";
  return "OTHER";
}

export function getTransferDisplayCader(employee, convertLegacy = (value) => value) {
  const cader = String(convertLegacy(employee?.CADER || "") || "").trim();
  const compactCader = cader.toLocaleUpperCase("en").replace(/[^A-Z]/g, "");

  if (
    compactCader.includes("DYSP") ||
    compactCader === "DSP" ||
    compactCader.includes("DEPUTYSUPERINTENDENT") ||
    /(?:उप\s*पुलिस|पुलिस\s*उप)\s*अधीक्षक/.test(cader)
  ) return "DySP";
  if (
    compactCader.includes("ASP") ||
    compactCader.includes("ADDITIONALSUPERINTENDENT") ||
    /अतिरिक्त.*पुलिस\s*अधीक्षक/.test(cader)
  ) return "ASP";
  if (
    compactCader === "SP" ||
    compactCader.includes("POLICESUPERINTENDENT") ||
    /पुलिस\s*अधीक्षक/.test(cader)
  ) return "SP";

  const rank = getTransferRank(employee, convertLegacy);
  return ["CI", "SI", "ASI", "HC", "FC"].includes(rank) ? rank : cader || "—";
}

export function getTransferDisplayBeltNumber(employee, convertLegacy = (value) => value) {
  const rank = getTransferRank(employee, convertLegacy);
  if (rank !== "HC" && rank !== "FC") return "—";
  return String(convertLegacy(employee?.["BELT NO"] || "") || "").trim() || "—";
}

function normalizeStationName(value, convertLegacy) {
  const rawValue = String(value || "");
  const readableValue = /[\u0900-\u097F]/.test(rawValue) ? rawValue : convertLegacy(rawValue);
  return String(readableValue || "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("hi")
    .replace(/^(?:पुलिस\s+थाना|थाना|police\s+station|p\.?\s*s\.?)\s*/i, "")
    .replace(/[.,()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHomePoliceStation(
  destination,
  employee,
  convertLegacy = (value) => value,
  chowkiMap = {}
) {
  const homeStation = employee?.["HOME PS"]
    || employee?.HOME_PS
    || employee?.["POLICE STATION"]
    || "";
  const normalizedHome = normalizeStationName(homeStation, convertLegacy);
  const normalizedDestination = normalizeStationName(destination, convertLegacy);
  if (!normalizedHome || !normalizedDestination) return false;
  if (normalizedHome === normalizedDestination) return true;

  return Object.entries(chowkiMap).some(([station, chowkis]) => (
    normalizeStationName(station, convertLegacy) === normalizedHome &&
    chowkis.some((chowki) => normalizeStationName(chowki, convertLegacy) === normalizedDestination)
  ));
}

export function buildTransferPostingOptions(officeList, chowkiMap) {
  const seen = new Set();
  return [...officeList, ...Object.values(chowkiMap).flat()]
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.localeCompare(right, "hi"));
}

export function createTemporaryDutyEntry(employee, action, details) {
  const employeeFields = Object.fromEntries(
    Object.entries(employee).filter(([key]) => key !== "_uid")
  );
  const placeField = action === "ATTACHMENT" ? "ATTACHMENT_PLACE" : "DEPUTATION_PLACE";
  return {
    ...employeeFields,
    ACTION: action,
    POSTING_PLACE: details.place,
    [placeField]: details.place,
    ORDER_NO: details.orderNo,
    ORDER_DATE: details.orderDate,
    ORDER_NO_DATE: `${details.orderNo} / ${details.orderDate}`,
    REMARK: details.remark,
    STATUS: "ACTIVE",
    ISSUED_AT: details.issuedAt
  };
}

export function groupTransferOrders(historyRows) {
  const orders = new Map();
  (Array.isArray(historyRows) ? historyRows : []).forEach((row) => {
    const orderId = String(row?.ORDER_ID || "").trim();
    if (!orderId) return;
    if (!orders.has(orderId)) {
      orders.set(orderId, {
        id: orderId,
        orderNo: String(row.ORDER_NO || ""),
        orderDate: String(row.ORDER_DATE || ""),
        issuedAt: String(row.ISSUED_AT || ""),
        rows: []
      });
    }
    orders.get(orderId).rows.push(row);
  });
  return [...orders.values()].sort((left, right) =>
    right.issuedAt.localeCompare(left.issuedAt)
  );
}

export function createTransferOrderUpdates(records, assignments, selectedKeys, orderDetails) {
  const selectedIds = new Set(selectedKeys);
  const orderNoDate = `${orderDetails.orderNo} / ${orderDetails.orderDate}`;
  const updatedRecords = records.map((employee, index) => {
    const key = getTransferEmployeeKey(employee, index);
    if (!selectedIds.has(key)) return employee;
    return {
      ...employee,
      POSTING: assignments[key].destination,
      "POSTING DOB NO": orderNoDate
    };
  });
  const historyEntries = records.flatMap((employee, index) => {
    const key = getTransferEmployeeKey(employee, index);
    if (!selectedIds.has(key)) return [];
    const assignment = assignments[key];
    return [{
      ORDER_ID: orderDetails.orderId,
      ACTION: "TRANSFER",
      "BELT NO": employee["BELT NO"] || "",
      NAME: employee.NAME || "",
      CADER: employee.CADER || "",
      OLD_POSTING: employee.POSTING || "",
      NEW_POSTING: assignment.destination,
      POSTING_PLACE: assignment.destination,
      ORDER_NO: orderDetails.orderNo,
      ORDER_DATE: orderDetails.orderDate,
      ORDER_NO_DATE: orderNoDate,
      REMARK: assignment.remark,
      ISSUED_AT: orderDetails.issuedAt
    }];
  });
  return { updatedRecords, historyEntries };
}

export function createTransferOrderId() {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || Math.random().toString(36).slice(2, 10);
  return `TRANSFER-${Date.now()}-${randomPart}`;
}
