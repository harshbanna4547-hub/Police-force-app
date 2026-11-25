import { calculateEarnedPL } from "../../shared/commonFunctions";

export function getLeaveBalance(employee, leaveRows, asOfDate = new Date()) {
  const belt = String(employee?.["BELT NO"] || "").trim().toUpperCase();
  const used = (leaveRows || []).reduce((total, row) => {
    if (String(row["BELT NO"] || "").trim().toUpperCase() !== belt) return total;
    const type = String(row.LEAVE_TYPE || "").trim().toUpperCase();
    if (type && type !== "PL") return total;
    return total + (Number(row.DAYS_TAKEN ?? row.DAYS ?? 0) || 0);
  }, 0);
  const earned = calculateEarnedPL(employee?.["DATE OF JOINING"], asOfDate);
  return { earned, used, balance: Math.max(0, Math.min(300, earned - used)) };
}
