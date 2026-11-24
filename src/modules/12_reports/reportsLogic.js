import { filterRecordsByRankAndSearch } from "../../shared/commonFunctions";

export function filterPostingReport(records, search, convertText) {
  return filterRecordsByRankAndSearch(records, {
    search,
    convertText,
    fields: ["POSTING", "NAME", "BELT NO", "CADER"]
  });
}
