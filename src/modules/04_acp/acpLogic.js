import { calculateServiceYears } from "../../shared/commonFunctions";

export function getAcpStage(serviceYears) {
  if (serviceYears >= 27) return "27 Year ACP (3rd ACP)";
  if (serviceYears >= 18) return "18 Year ACP (2nd ACP)";
  if (serviceYears >= 9) return "9 Year ACP (1st ACP)";
  return "";
}

export function getAcpServiceStage(joiningDate, asOfDate = new Date()) {
  return getAcpStage(calculateServiceYears(joiningDate, asOfDate));
}
