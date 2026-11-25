import { parseAnyDate, formatDateDDMMYYYY } from "../../shared/commonFunctions";

export function getVacantBelts(records, maxBelt = 1750) {
  const used = new Set((records || []).map((record) => String(record["BELT NO"] || "").replace(/\D/g, "")));
  return Array.from({ length: maxBelt }, (_, index) => String(index + 1))
    .filter((belt) => !used.has(belt));
}

export function getProbationDetails(record) {
  const joiningDate = parseAnyDate(record?.["DATE OF JOINING"]);
  const probationEnd = joiningDate
    ? new Date(joiningDate.getFullYear() + 2, joiningDate.getMonth(), joiningDate.getDate())
    : null;
  return {
    joiningYear: joiningDate?.getFullYear() || "",
    probationEnd: formatDateDDMMYYYY(probationEnd),
    status: record?.["DATE OF CONFIRMATION"]
      ? "स्थायी"
      : probationEnd && probationEnd <= new Date()
        ? "आदेश हेतु लंबित"
        : "परिवीक्षा में"
  };
}
