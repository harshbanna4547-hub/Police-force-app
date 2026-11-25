import { getRankCode, getBeltNo } from "../../shared/commonFunctions.js";

/* === TAB CONFIGURATION (मुख्य एवं उप-टैब कॉन्फ़िगरेशन) === */
export const PRIMARY_TABS = [
  { id: "TRAINING", hi: "🎓 Training (प्रशिक्षण रिकॉर्ड)", en: "🎓 Training" },
  { id: "NOMINATION", hi: "📨 Nomination (नामांकन एवं रवानगी आदेश)", en: "📨 Nomination" }
];

export const TRAINING_SUBTABS = [
  { id: "ALL_RECORDS", hi: "📋 All Training Record (समेकित)", en: "📋 All Training Record" },
  { id: "POST_WISE", hi: "🎖️ Post-Wise Record (पदवार)", en: "🎖️ Post-Wise Record" },
  { id: "COURSE_WISE", hi: "📚 Training-Wise Record (कोर्सवार)", en: "📚 Training-Wise Record" },
  { id: "INSTITUTE_WISE", hi: "🏛️ Institute-Wise Record (संस्थानवार)", en: "🏛️ Institute-Wise Record" },
  { id: "YEAR_WISE", hi: "📅 Year-Wise Record (वर्षवार)", en: "📅 Year-Wise Record" },
  { id: "MANDATORY_DUE", hi: "⚠️ Mandatory / Pending Due (अपूर्ण अनिवार्य)", en: "⚠️ Mandatory / Pending Due" }
];

export const NOMINATION_LIFECYCLE_TABS = [
  { id: "GENERATOR", hi: "📝 Letter & Wireless Generator", en: "📝 Letter & Wireless Generator" },
  { id: "PENDING", hi: "⏳ Pending Training", en: "⏳ Pending Training" },
  { id: "DONE", hi: "✅ Training Done", en: "✅ Training Done" },
  { id: "NOT_DONE", hi: "❌ Nominated but Not Done", en: "❌ Nominated but Not Done" }
];

export const NOMINATION_SUBTABS = [
  { id: "OTHER_STATE", hi: "🇮🇳 Other State Nomination", en: "🇮🇳 Other State Nomination" },
  { id: "IN_STATE", hi: "🏛️ In-State Nomination", en: "🏛️ In-State Nomination" },
  { id: "IGOT", hi: "💻 iGOT Karmayogi", en: "💻 iGOT Karmayogi" },
  { id: "WOMEN_SELF_DEFENCE", hi: "🛡️ Mahila Aatma Raksha", en: "🛡️ Mahila Aatma Raksha" },
  { id: "DTC", hi: "🏫 District Training Center", en: "🏫 District Training Center" }
];

export const POST_ORDER_LIST = [
  { code: "ASP", label: "ASP" },
  { code: "DYSP", label: "DySP" },
  { code: "CI", label: "CI" },
  { code: "SI", label: "SI" },
  { code: "ASI", label: "ASI" },
  { code: "HC", label: "HC" },
  { code: "FC", label: "FC" }
];

export const REQUIRED_COURSES = [
  { label: "PCC", aliases: ["pcc"], ranks: ["FC", "HC"] },
  { label: "बुनियादी प्रशिक्षण", aliases: ["बुनियादी", "basic training", "basic course"] },
  { label: "साइबर", aliases: ["साइबर", "cyber"] },
  { label: "विशेष कोर्स", aliases: ["विशेष", "special course", "special training"] }
];

export const MANDATORY_DUE_COURSES = [
  { label: "PCC", aliases: ["pcc"], ranks: ["FC", "HC"] },
  { label: "BNS / BNSS / BSA", aliases: ["bns", "bnss", "bsa", "नए कानून", "आपराधिक कानून"] },
  { label: "Cyber Crime", aliases: ["cyber", "साइबर"] },
  { label: "Induction", aliases: ["induction", "इंडक्शन", "बुनियादी", "basic training"] }
];

export const TRAINING_COURSE_CATALOG = [
  { label: "PCC", aliases: ["pcc"], ranks: ["FC", "HC"] },
  { label: "Induction", aliases: ["induction", "इंडक्शन"] },
  { label: "बुनियादी प्रशिक्षण", aliases: ["बुनियादी", "basic training", "basic course"] },
  { label: "Cyber Crime", aliases: ["cyber", "साइबर"] },
  { label: "FSL / Investigation", aliases: ["fsl", "investigation", "forensic", "अनुसंधान", "एफएसएल"] },
  { label: "BNS / BNSS / BSA", aliases: ["bns", "bnss", "bsa", "नए कानून", "आपराधिक कानून"] },
  { label: "CCTNS", aliases: ["cctns", "सीसीटीएनएस"] },
  { label: "Mob Control", aliases: ["mob", "भीड़ नियंत्रण", "कानून व्यवस्था"] },
  { label: "Commando", aliases: ["commando", "कमांडो"] },
  { label: "विशेष कोर्स", aliases: ["विशेष", "special course", "special training"] }
];

export const OTHER_STATE_INSTITUTES = [
  "CDTI हैदराबाद",
  "CDTI चंडीगढ़",
  "CDTI गाजियाबाद",
  "CDTI कोलकाता",
  "CAPT भोपाल",
  "NEPA शिलांग",
  "NCRB नई दिल्ली",
  "IIM",
  "NFSU"
];

export const IN_STATE_INSTITUTES = [
  "RPA जयपुर",
  "CDTI जयपुर",
  "Intelligence Academy जयपुर",
  "SCRB जयपुर",
  "ASTI जयपुर",
  "HCM RIPA जयपुर",
  "RPTC जोधपुर",
  "PTS किशनगढ़",
  "PTS खेरवाड़ा",
  "PTS झालावाड़",
  "कमांडो स्कूल जोधपुर"
];

export const TRAINING_INSTITUTE_CATALOG = [
  { label: "RPA जयपुर", aliases: ["rpa", "आरपीए"] },
  { label: "CDTI जयपुर", aliases: ["cdti jaipur", "cdti जयपुर", "सीडीटीआई जयपुर"] },
  { label: "HCM RIPA जयपुर", aliases: ["hcm", "ripa", "रीपा"] },
  { label: "RPTC जोधपुर", aliases: ["rptc", "आरपीटीसी"] },
  { label: "PTS किशनगढ़", aliases: ["kishangarh", "किशनगढ़"] },
  { label: "PTS खेरवाड़ा", aliases: ["kherwara", "खेरवाड़ा"] },
  { label: "PTS झालावाड़", aliases: ["jhalawar", "झालावाड़"] },
  { label: "Intelligence Academy / SCRB / ASTI", aliases: ["intelligence", "scrb", "asti"] },
  { label: "कमांडो स्कूल", aliases: ["commando school", "कमांडो स्कूल"] },
  { label: "CDTI हैदराबाद", aliases: ["hyderabad", "हैदराबाद"] },
  { label: "CDTI चंडीगढ़", aliases: ["chandigarh", "चंडीगढ़"] },
  { label: "CDTI गाजियाबाद", aliases: ["ghaziabad", "गाजियाबाद"] },
  { label: "CDTI कोलकाता", aliases: ["kolkata", "कोलकाता"] },
  { label: "CAPT भोपाल", aliases: ["capt", "bhopal", "भोपाल"] },
  { label: "NEPA शिलांग", aliases: ["nepa", "shillong", "शिलांग"] },
  { label: "NCRB नई दिल्ली", aliases: ["ncrb", "एनसीआरबी"] },
  { label: "IIM / NFSU", aliases: ["iim", "nfsu"] },
  { label: "DTC चित्तौड़गढ़", aliases: ["dtc", "डीटीसी", "जिला प्रशिक्षण केन्द्र", "police line"] }
];

/* === DATE & PERIOD HELPERS (दिनांक एवं वर्ष गणना) === */
export function parseTrainingDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!local) return NaN;
  let year = Number(local[3]);
  if (year < 100) year += year > 40 ? 1900 : 2000;
  return new Date(year, Number(local[2]) - 1, Number(local[1])).getTime();
}

export function getTrainingYear(value, mode = "CALENDAR") {
  const timestamp = parseTrainingDate(value);
  if (!Number.isFinite(timestamp)) return "";
  const dt = new Date(timestamp);
  const year = dt.getFullYear();
  if (mode === "FY") {
    const month = dt.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  }
  return String(year);
}

export function datesOverlap(from, to, otherFrom, otherTo) {
  const values = [parseTrainingDate(from), parseTrainingDate(to), parseTrainingDate(otherFrom), parseTrainingDate(otherTo)];
  return values.every(Number.isFinite) && values[0] <= values[3] && values[2] <= values[1];
}

/* === IDENTITY & RANK HELPERS (कर्मचारी पहचान एवं रैंक जाँच) === */
export function normalizeTrainingRank(employeeOrRank) {
  const code = getRankCode(employeeOrRank);
  if (code === "FC(DR)") return "FC";
  return code;
}

export function getTrainingEmployeeKey(employee) {
  const belt = getBeltNo(employee);
  if (belt !== "-") return `belt:${belt.trim().toUpperCase()}`;
  return `uid:${employee?._uid || `${employee?.NAME || ""}:${employee?.CADER || ""}`}`;
}

export function sameTrainingEmployee(left, right) {
  const leftBelt = getBeltNo(left);
  const rightBelt = getBeltNo(right);
  if (leftBelt !== "-" && rightBelt !== "-") {
    return leftBelt.trim().toUpperCase() === rightBelt.trim().toUpperCase();
  }
  if (left?._uid && right?._uid) return String(left._uid) === String(right._uid);
  const leftName = String(left?.NAME || "").trim().toLocaleLowerCase();
  const rightName = String(right?.NAME || "").trim().toLocaleLowerCase();
  const leftRank = getRankCode(left);
  const rightRank = getRankCode(right);
  return Boolean(leftName && rightName && leftName === rightName && leftRank === rightRank);
}

export function isBeltRank(employee) {
  const rank = getRankCode(employee);
  return rank === "HC" || rank === "FC";
}

function getUniqueEmployees(records) {
  const uniqueEmployees = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = getTrainingEmployeeKey(record);
    if (!uniqueEmployees.has(key)) uniqueEmployees.set(key, record);
  }
  return Array.from(uniqueEmployees.values());
}

function groupHistoryByIdentity(trainingRows) {
  const map = new Map();
  for (const row of Array.isArray(trainingRows) ? trainingRows : []) {
    const belt = getBeltNo(row);
    const identity = belt !== "-"
      ? `belt:${belt.trim().toUpperCase()}`
      : `name:${String(row.NAME || "").trim().toLocaleLowerCase()}:${getRankCode(row)}`;
    const list = map.get(identity) || [];
    list.push(row);
    map.set(identity, list);
  }
  return map;
}

function getIdentityForEmployee(record) {
  const belt = getBeltNo(record);
  const rank = getRankCode(record);
  return belt !== "-"
    ? `belt:${belt.trim().toUpperCase()}`
    : `name:${String(record?.NAME || "").trim().toLocaleLowerCase()}:${rank}`;
}

/* === 1. ALL TRAINING RECORD SUMMARY (समेकित कर्मचारी-वार प्रशिक्षण रिकॉर्ड) === */
export function getMissingTrainingCourses(records, trainingRows) {
  const historyByIdentity = groupHistoryByIdentity(trainingRows);
  return getUniqueEmployees(records).map((record) => {
    const belt = getBeltNo(record);
    const rank = getRankCode(record);
    const employeeRows = historyByIdentity.get(getIdentityForEmployee(record)) || [];
    const missing = REQUIRED_COURSES
      .filter((course) => !course.ranks || course.ranks.includes(rank))
      .filter((course) => !employeeRows.some((row) => {
        const courseName = String(row.COURSE_NAME || "").toLocaleLowerCase();
        return course.aliases.some((alias) => courseName.includes(alias.toLocaleLowerCase()));
      }))
      .map((course) => course.label);
    return {
      employee: record,
      "BELT NO": belt,
      CADER: record.CADER || "",
      NAME: record.NAME || "",
      POSTING: record.POSTING || "",
      "पूर्ण प्रशिक्षण संख्या": employeeRows.length,
      "अपूर्ण कोर्स": missing
    };
  });
}

/* === 6. MANDATORY / PENDING DUE ROWS (PCC केवल FC/HC + BNS/BNSS/BSA, Cyber, Induction) === */
export function getMandatoryPendingDueRows(records, trainingRows) {
  const historyByIdentity = groupHistoryByIdentity(trainingRows);
  return getUniqueEmployees(records)
    .map((record) => {
      const belt = getBeltNo(record);
      const rank = getRankCode(record);
      const employeeRows = historyByIdentity.get(getIdentityForEmployee(record)) || [];
      const pendingCourses = MANDATORY_DUE_COURSES
        .filter((course) => !course.ranks || course.ranks.includes(rank))
        .filter((course) => !employeeRows.some((row) => {
          const courseName = String(row.COURSE_NAME || "").toLocaleLowerCase();
          return course.aliases.some((alias) => courseName.includes(alias.toLocaleLowerCase()));
        }))
        .map((course) => course.label);
      return {
        employee: record,
        "BELT NO": belt,
        CADER: record.CADER || "",
        NAME: record.NAME || "",
        POSTING: record.POSTING || "",
        "पूर्ण प्रशिक्षण संख्या": employeeRows.length,
        "लंबित अनिवार्य कोर्स": pendingCourses
      };
    })
    .filter((row) => row["लंबित अनिवार्य कोर्स"].length > 0);
}

/* === 2. POST-WISE SUMMARY (पदवार प्रशिक्षण रिपोर्ट) === */
export function buildPostWiseTrainingSummary(records, trainingRows) {
  const historyByIdentity = groupHistoryByIdentity(trainingRows);
  const unique = getUniqueEmployees(records);

  return POST_ORDER_LIST.map(({ code, label }) => {
    const employees = unique.filter((emp) => normalizeTrainingRank(emp) === code);
    const trainedEmployees = [];
    const pendingEmployees = [];
    employees.forEach((emp) => {
      const empHistory = historyByIdentity.get(getIdentityForEmployee(emp)) || [];
      if (empHistory.length > 0) trainedEmployees.push({ employee: emp, count: empHistory.length });
      else pendingEmployees.push(emp);
    });
    return {
      rank: code,
      label,
      totalForce: employees.length,
      trainedCount: trainedEmployees.length,
      pendingCount: pendingEmployees.length,
      employees,
      trainedEmployees,
      pendingEmployees
    };
  });
}

/* === 3. COURSE / TRAINING-WISE SUMMARY (कोर्स/प्रशिक्षण-वार रिपोर्ट) === */
export function buildCourseWiseTrainingSummary(records, trainingRows) {
  const rows = Array.isArray(trainingRows) ? trainingRows : [];
  const unique = getUniqueEmployees(records);
  const historyByIdentity = groupHistoryByIdentity(rows);

  const dynamicCourses = [];
  const knownAliases = TRAINING_COURSE_CATALOG.flatMap((c) => c.aliases.map((a) => a.toLocaleLowerCase()));
  for (const row of rows) {
    const name = String(row.COURSE_NAME || "").trim();
    if (!name) continue;
    const lower = name.toLocaleLowerCase();
    if (!knownAliases.some((a) => lower.includes(a)) && !dynamicCourses.some((d) => d.label.toLocaleLowerCase() === lower)) {
      dynamicCourses.push({ label: name, aliases: [lower] });
    }
  }

  return [...TRAINING_COURSE_CATALOG, ...dynamicCourses].map((spec) => {
    const applicable = unique.filter((emp) => !spec.ranks || spec.ranks.includes(normalizeTrainingRank(emp)));
    const completedEmployees = [];
    const remainingEmployees = [];
    applicable.forEach((emp) => {
      const empRows = historyByIdentity.get(getIdentityForEmployee(emp)) || [];
      const done = empRows.some((r) => {
        const cName = String(r.COURSE_NAME || "").toLocaleLowerCase();
        return spec.aliases.some((alias) => cName.includes(alias.toLocaleLowerCase()));
      });
      if (done) completedEmployees.push(emp);
      else remainingEmployees.push(emp);
    });
    const matchedRows = rows.filter((r) => {
      const cName = String(r.COURSE_NAME || "").toLocaleLowerCase();
      return spec.aliases.some((alias) => cName.includes(alias.toLocaleLowerCase()));
    });

    return {
      course: spec.label,
      applicableTotal: applicable.length,
      completedCount: completedEmployees.length,
      remainingCount: remainingEmployees.length,
      completedRows: matchedRows,
      remainingEmployees
    };
  });
}

/* === 4. INSTITUTE-WISE SUMMARY (संस्थान-वार प्रशिक्षण रिपोर्ट) === */
export function buildInstituteWiseTrainingSummary(trainingRows) {
  const rows = Array.isArray(trainingRows) ? trainingRows : [];
  const assigned = new Set();

  const knownSummaries = TRAINING_INSTITUTE_CATALOG.map((inst) => {
    const matched = rows.filter((row) => {
      const instName = String(row.INSTITUTE || "").trim().toLocaleLowerCase();
      if (!instName) return false;
      return inst.aliases.some((alias) => instName.includes(alias.toLocaleLowerCase()));
    });
    matched.forEach((m) => assigned.add(m));
    return { institute: inst.label, completedCount: matched.length, rows: matched };
  });

  const extraMap = new Map();
  rows.filter((row) => !assigned.has(row)).forEach((row) => {
    const name = String(row.INSTITUTE || "अन्य / अज्ञात संस्थान").trim() || "अन्य / अज्ञात संस्थान";
    const list = extraMap.get(name) || [];
    list.push(row);
    extraMap.set(name, list);
  });

  const extraSummaries = Array.from(extraMap.entries()).map(([institute, list]) => ({
    institute,
    completedCount: list.length,
    rows: list
  }));

  return [...knownSummaries, ...extraSummaries];
}

/* === 5. YEAR-WISE SUMMARY (2020 से वर्तमान वर्ष तक वर्षवार रिपोर्ट) === */
export function buildYearWiseTrainingSummary(trainingRows, mode = "CALENDAR", startYear = 2020) {
  const rows = Array.isArray(trainingRows) ? trainingRows : [];
  const currentYear = Math.max(startYear, new Date().getFullYear());
  const periods = [];
  for (let y = currentYear; y >= startYear; y -= 1) {
    periods.push(mode === "FY" ? `${y}-${String(y + 1).slice(-2)}` : String(y));
  }

  return periods.map((period) => {
    const yearRows = rows.filter((row) => getTrainingYear(row.TO_DATE || row.FROM_DATE, mode) === period);
    const uniqueEmpSet = new Set(yearRows.map((r) => getTrainingEmployeeKey(r)));
    const courseSet = [...new Set(yearRows.map((r) => String(r.COURSE_NAME || "").trim()).filter(Boolean))];
    return {
      period,
      completedCount: yearRows.length,
      uniqueEmployees: uniqueEmpSet.size,
      coursesSummary: courseSet.join(", ") || "-",
      rows: yearRows
    };
  });
}
