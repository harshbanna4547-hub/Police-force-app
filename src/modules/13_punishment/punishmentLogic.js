export function getCleanRecordEmployees(records, punishmentRows) {
  const punishedBelts = new Set((punishmentRows || [])
    .map((row) => String(row["BELT NO"] || "").trim().toUpperCase())
    .filter(Boolean));
  return (records || []).filter((record) => {
    const belt = String(record["BELT NO"] || "").trim().toUpperCase();
    return belt && !punishedBelts.has(belt);
  });
}
