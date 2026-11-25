import { calculateServiceYears, parseAnyDate } from "../../shared/commonFunctions";

export function getNextIncrementDate(asOfDate = new Date()) {
  const incrementDate = new Date(asOfDate.getFullYear(), 6, 1);
  if (incrementDate < new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate())) {
    incrementDate.setFullYear(incrementDate.getFullYear() + 1);
  }
  return incrementDate;
}

export function isIncrementEligible(record, incrementDate) {
  const joiningDate = parseAnyDate(record?.["DATE OF JOINING"]);
  return Boolean(joiningDate && joiningDate <= incrementDate && calculateServiceYears(joiningDate, incrementDate) >= 0);
}
