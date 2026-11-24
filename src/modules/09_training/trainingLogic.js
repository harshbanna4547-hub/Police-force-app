import { getRankCode, getBeltNo } from "../../shared/commonFunctions.js";

export const REQUIRED_COURSES = [
  { label: "PCC", aliases: ["pcc"], ranks: ["FC", "HC"] },
  { label: "बुनियादी प्रशिक्षण", aliases: ["बुनियादी", "basic training", "basic course"] },
  { label: "साइबर", aliases: ["साइबर", "cyber"] },
  { label: "विशेष कोर्स", aliases: ["विशेष", "special course", "special training"] }
];

export function getMissingTrainingCourses(records, trainingRows) {
  const rows = Array.isArray(trainingRows) ? trainingRows : [];
  const uniqueEmployees = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const belt = getBeltNo(record);
    const key = belt !== "-" ? `belt:${belt.trim().toUpperCase()}` : `uid:${record._uid || `${record.NAME || ""}:${record.CADER || ""}`}`;
    if (!uniqueEmployees.has(key)) uniqueEmployees.set(key, record);
  }

  return Array.from(uniqueEmployees.values(), (record) => {
    const belt = getBeltNo(record);
    const rank = getRankCode(record);
    const employeeRows = rows.filter((row) => sameTrainingEmployee(record, row));
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
