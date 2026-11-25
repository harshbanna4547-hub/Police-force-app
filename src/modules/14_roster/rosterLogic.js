export function createDutyRosterEntry(employee, { date, shift, dutyType }) {
  if (!employee || !date || !shift || !dutyType) {
    throw new Error("कर्मचारी, दिनांक, अवधि और ड्यूटी प्रकार आवश्यक हैं।");
  }
  return {
    DUTY_DATE: date,
    SHIFT: shift,
    POSTING: employee.POSTING,
    "BELT NO": employee["BELT NO"],
    NAME: employee.NAME,
    DUTY_TYPE: dutyType
  };
}
