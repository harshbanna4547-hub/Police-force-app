import { getBeltNo, getRankCode } from "../../shared/commonFunctions";

export function getStrengthEmployeeIdentity(employee) {
  return {
    beltNo: getBeltNo(employee),
    rankCode: getRankCode(employee)
  };
}

export function filterStrengthRecords(records, search = "") {
  const query = String(search || "").trim().toLowerCase();
  return (records || []).filter((record) =>
    !query || [
      record.NAME,
      record.CADER,
      record.POSTING,
      getBeltNo(record)
    ].some((value) => String(value || "").toLowerCase().includes(query))
  );
}
