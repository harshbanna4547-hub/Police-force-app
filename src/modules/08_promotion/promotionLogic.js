import { calculateServiceYears, getRankCode } from "../../shared/commonFunctions";

export function getPromotionCandidate(record, sourceRank, minimumService, educationFilter, asOfDate = new Date()) {
  if (getRankCode(record) !== sourceRank) return null;
  const serviceYears = calculateServiceYears(record["DATE OF JOINING"], asOfDate);
  const education = String(record.EDUCATION || record.QUALIFICATION || "").trim();
  if (serviceYears < Number(minimumService || 0)) return null;
  if (educationFilter !== "ALL" && education !== educationFilter) return null;
  return { serviceYears, education };
}
